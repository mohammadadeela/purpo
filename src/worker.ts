import { Worker } from "bullmq";
import { runBuild } from "./lib/build-agent";
import { env } from "./lib/env";
import { db } from "./lib/db";
import { runDeployment } from "./lib/deployment";
import { runMediaJob } from "./lib/media";

const worker = new Worker("purpo-builds", async (job) => {
  await db.job.updateMany({ where: { idempotencyKey: String(job.id) }, data: { status: "RUNNING", lockedAt: new Date(), attempt: { increment: 1 } } });
  await runBuild(job.data.buildId as string);
  await db.job.updateMany({ where: { idempotencyKey: String(job.id) }, data: { status: "COMPLETED", completedAt: new Date() } });
}, { connection: { url: env().REDIS_URL }, concurrency: 3 });

worker.on("failed", async (job, error) => {
  if (job) await db.job.updateMany({ where: { idempotencyKey: String(job.id) }, data: { status: "FAILED", errorMessage: error.message.slice(0, 2000) } });
});

const deploymentWorker = new Worker("purpo-deployments", async (job) => runDeployment(job.data.deploymentId as string), { connection: { url: env().REDIS_URL }, concurrency: 1 });
const mediaWorker = new Worker("purpo-media", async (job) => runMediaJob(job.data), { connection: { url: env().REDIS_URL }, concurrency: 2 });

async function shutdown() { await Promise.all([worker.close(), deploymentWorker.close(), mediaWorker.close()]); await db.$disconnect(); process.exit(0); }
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
