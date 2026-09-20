import { Client } from "ssh2";
import { db } from "./db";
import { decryptSecret } from "./security";
import { settleReservation } from "./credits";

type HostingerConfig = { host: string; port?: number; username: string; privateKey: string; remotePath: string; healthUrl?: string };

function validateConfig(config: HostingerConfig) {
  if (!/^[a-zA-Z0-9.-]+$/.test(config.host)) throw new Error("Invalid deployment host.");
  if (!/^[a-z_][a-zA-Z0-9_-]*$/.test(config.username)) throw new Error("Invalid SSH username.");
  if (!/^\/var\/www\/[a-zA-Z0-9_./-]+$/.test(config.remotePath) || config.remotePath.includes("..")) throw new Error("Remote path must be a safe directory below /var/www.");
}

async function upload(config: HostingerConfig, files: Array<{ path: string; content: string }>) {
  validateConfig(config);
  await new Promise<void>((resolve, reject) => {
    const connection = new Client();
    connection.on("ready", () => connection.sftp((error, sftp) => {
      if (error) { connection.end(); reject(error); return; }
      const rootFiles = files.filter((file) => !file.path.includes("/"));
      if (rootFiles.length !== files.length) { connection.end(); reject(new Error("Nested deployment paths require a configured build artifact pipeline.")); return; }
      let pending = rootFiles.length;
      for (const file of rootFiles) sftp.writeFile(`${config.remotePath}/${file.path}`, Buffer.from(file.content), { mode: 0o644 }, (writeError) => {
        if (writeError) { connection.end(); reject(writeError); return; }
        pending -= 1; if (!pending) { connection.end(); resolve(); }
      });
    })).on("error", reject).connect({ host: config.host, port: config.port ?? 22, username: config.username, privateKey: config.privateKey, readyTimeout: 20000 });
  });
}

export async function runDeployment(deploymentId: string) {
  const deployment = await db.deployment.findUniqueOrThrow({ where: { id: deploymentId }, include: { version: { include: { files: true } }, project: { include: { integrations: true } } } });
  const integration = deployment.project.integrations.find((item) => item.provider === "hostinger" && item.status === "CONNECTED");
  if (!integration?.encryptedSecret) throw new Error("Hostinger is not connected.");
  const config = JSON.parse(decryptSecret(integration.encryptedSecret, `integration:${deployment.projectId}:hostinger`)) as HostingerConfig;
  try {
    await db.deployment.update({ where: { id: deploymentId }, data: { status: "UPLOADING", startedAt: new Date(), logs: "Uploading immutable project version over SSH/SFTP.\n" } });
    await upload(config, deployment.version.files);
    await db.deployment.update({ where: { id: deploymentId }, data: { status: "VERIFYING", logs: { set: "Upload complete. Running external health check.\n" } } });
    const healthUrl = deployment.healthUrl ?? config.healthUrl ?? deployment.domain;
    if (healthUrl) {
      const response = await fetch(healthUrl.startsWith("http") ? healthUrl : `https://${healthUrl}`, { signal: AbortSignal.timeout(15000) });
      if (!response.ok) throw new Error(`Health check returned HTTP ${response.status}.`);
    }
    await db.deployment.update({ where: { id: deploymentId }, data: { status: "LIVE", finishedAt: new Date(), logs: { set: "Deployment verified and live.\n" } } });
    const reservation = await db.creditReservation.findFirst({ where: { deploymentId, status: "reserved" } });
    if (reservation) await settleReservation(reservation.id, 8, `deployment:${deploymentId}:settled`);
  } catch (error) {
    await db.deployment.update({ where: { id: deploymentId }, data: { status: "FAILED", finishedAt: new Date(), logs: { set: `Deployment failed: ${error instanceof Error ? error.message : "Unknown error"}\n` } } });
    throw error;
  }
}
