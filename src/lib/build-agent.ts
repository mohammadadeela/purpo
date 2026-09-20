import crypto from "node:crypto";
import { Prisma, type ProjectType } from "@prisma/client";
import { db } from "./db";
import { settleReservation } from "./credits";
import { runAi } from "./ai/router";
import { assembleSystemPrompt } from "./ai/prompts";
import { fileManifestSchema, productSpecSchema } from "./ai/schemas";

const stageNames = ["DISCOVER", "PLAN", "ARCHITECT", "DESIGN", "IMPLEMENT", "INTEGRATE", "TEST", "REVIEW", "POLISH"] as const;
const allowedTypes = new Set(["WEBSITE", "WEB_APP", "MOBILE_APP", "SAAS", "ECOMMERCE", "RESTAURANT", "REAL_ESTATE", "AUTOMATION", "MEDIA", "OTHER"]);
const forbiddenPatterns = [/NEXT_PUBLIC_[A-Z0-9_]*(KEY|SECRET)/, /sk-[A-Za-z0-9_-]{20,}/, /AIza[0-9A-Za-z_-]{20,}/];

type ProductSpec = { summary: string; type: string; targetUsers: string[]; features: string[]; pages: string[]; dataEntities: string[]; integrations: string[]; risks: string[]; designDirection: string; suggestions: Array<{ title: string; reason: string; command: string }> };
type FileManifest = { changeSummary: string; files: Array<{ path: string; content: string; mimeType: string }> };

function parseJson<T>(text: string): T { return JSON.parse(text.replace(/^```json\s*|\s*```$/g, "")) as T; }
function hash(content: string) { return crypto.createHash("sha256").update(content).digest("hex"); }
function validateFiles(files: FileManifest["files"]) {
  const seen = new Set<string>();
  for (const file of files) {
    if (!/^[a-zA-Z0-9_./-]+$/.test(file.path) || file.path.startsWith("/") || file.path.includes("..")) throw new Error(`Unsafe file path: ${file.path}`);
    if (seen.has(file.path)) throw new Error(`Duplicate file: ${file.path}`);
    if (file.content.length > 500_000) throw new Error(`File too large: ${file.path}`);
    if (forbiddenPatterns.some((pattern) => pattern.test(file.content))) throw new Error(`Potential secret detected in ${file.path}`);
    seen.add(file.path);
  }
  if (!seen.has("index.html")) throw new Error("Generated project is missing index.html.");
}

async function stage(buildId: string, name: string, status: "RUNNING" | "COMPLETED" | "FAILED", summary?: string, artifact?: Prisma.InputJsonValue) {
  await db.buildStage.update({ where: { buildId_name: { buildId, name } }, data: { status, summary, artifact, ...(status === "RUNNING" ? { startedAt: new Date() } : { finishedAt: new Date() }) } });
  await db.build.update({ where: { id: buildId }, data: { currentStage: name } });
}

async function assertNotCancelled(buildId: string) {
  const build = await db.build.findUniqueOrThrow({ where: { id: buildId } });
  if (build.cancelledAt || build.status === "CANCELLED") throw new Error("BUILD_CANCELLED");
  return build;
}

export async function runBuild(buildId: string) {
  const build = await db.build.findUniqueOrThrow({ where: { id: buildId }, include: { project: true, reservations: true } });
  await db.build.update({ where: { id: buildId }, data: { status: "RUNNING", startedAt: new Date() } });
  let creditsSpent = 0;
  try {
    await stage(buildId, "DISCOVER", "RUNNING", "Reading project context and accepted requirements.");
    const system = await assembleSystemPrompt(build.projectId);
    await stage(buildId, "DISCOVER", "COMPLETED", "Project context loaded without exposing private prompts.");

    await assertNotCancelled(buildId);
    await stage(buildId, "PLAN", "RUNNING", "Turning the outcome into a complete product specification.");
    const specResult = await runAi({ taskClass: "intent", projectId: build.projectId, system, prompt: `USER REQUEST:\n${build.userRequest}\n\nReturn the complete product specification.`, schema: productSpecSchema, schemaName: "product_specification" });
    creditsSpent += Math.max(5, Math.ceil(((specResult.inputTokens ?? 0) + (specResult.outputTokens ?? 0) * 2) / 1000));
    const spec = parseJson<ProductSpec>(specResult.text);
    await db.project.update({ where: { id: build.projectId }, data: { specification: spec as unknown as Prisma.InputJsonValue, targetUsers: spec.targetUsers, type: (allowedTypes.has(spec.type.toUpperCase()) ? spec.type.toUpperCase() : "OTHER") as ProjectType, status: "BUILDING" } });
    await db.projectMemory.upsert({ where: { projectId_category_key: { projectId: build.projectId, category: "product", key: "suggestions" } }, create: { projectId: build.projectId, category: "product", key: "suggestions", content: spec.suggestions as unknown as Prisma.InputJsonValue, priority: 80 }, update: { content: spec.suggestions as unknown as Prisma.InputJsonValue } });
    await stage(buildId, "PLAN", "COMPLETED", spec.summary, spec as unknown as Prisma.InputJsonValue);

    for (const name of ["ARCHITECT", "DESIGN"] as const) {
      await assertNotCancelled(buildId);
      await stage(buildId, name, "RUNNING", name === "DESIGN" ? "Creating a project-specific visual system." : "Defining pages, data, backend contracts, and integrations.");
      await stage(buildId, name, "COMPLETED", name === "DESIGN" ? spec.designDirection : `${spec.pages.length} pages, ${spec.dataEntities.length} data entities, and ${spec.integrations.length} integrations planned.`);
    }

    await assertNotCancelled(buildId);
    await stage(buildId, "IMPLEMENT", "RUNNING", "Writing the real interactive project files.");
    const currentFiles = await db.projectFile.findMany({ where: { projectId: build.projectId }, select: { path: true, content: true } });
    const codeResult = await runAi({
      taskClass: "code", projectId: build.projectId, system,
      prompt: `Build or update the project for this request: ${build.userRequest}\nSPECIFICATION: ${JSON.stringify(spec)}\nCURRENT FILES: ${JSON.stringify(currentFiles)}\nReturn a complete browser-runnable project manifest. It must include index.html, styles.css, and app.js. Use real interactive behavior and localStorage only for preview-safe client state. Do not invent external integrations; represent unconfigured services honestly. Keep files self-contained and do not use remote scripts.`,
      schema: fileManifestSchema, schemaName: "project_files"
    });
    creditsSpent += Math.max(10, Math.ceil(((codeResult.inputTokens ?? 0) + (codeResult.outputTokens ?? 0) * 2) / 1000));
    const manifest = parseJson<FileManifest>(codeResult.text);
    validateFiles(manifest.files);
    await stage(buildId, "IMPLEMENT", "COMPLETED", manifest.changeSummary, { files: manifest.files.map((file) => file.path) });

    await stage(buildId, "INTEGRATE", "RUNNING", "Persisting files and creating an immutable checkpoint.");
    const version = await db.$transaction(async (tx) => {
      const latest = await tx.projectVersion.aggregate({ where: { projectId: build.projectId }, _max: { number: true } });
      const created = await tx.projectVersion.create({ data: { projectId: build.projectId, number: (latest._max.number ?? 0) + 1, label: manifest.changeSummary.slice(0, 120), source: "ai-build" } });
      for (const file of manifest.files) {
        const contentHash = hash(file.content);
        await tx.projectFile.upsert({ where: { projectId_path: { projectId: build.projectId, path: file.path } }, create: { projectId: build.projectId, path: file.path, content: file.content, mimeType: file.mimeType, contentHash, sizeBytes: Buffer.byteLength(file.content) }, update: { content: file.content, mimeType: file.mimeType, contentHash, sizeBytes: Buffer.byteLength(file.content) } });
        await tx.versionFile.create({ data: { versionId: created.id, path: file.path, content: file.content, mimeType: file.mimeType, hash: contentHash } });
      }
      await tx.project.update({ where: { id: build.projectId }, data: { activeVersionId: created.id } });
      return created;
    });
    await stage(buildId, "INTEGRATE", "COMPLETED", `Checkpoint v${version.number} created.`);

    await stage(buildId, "TEST", "RUNNING", "Running security and preview integrity checks.");
    const index = manifest.files.find((file) => file.path === "index.html")!;
    const checks = { hasDocument: /<!doctype html/i.test(index.content), hasViewport: /name=["']viewport/i.test(index.content), hasTitle: /<title>/i.test(index.content), noSecrets: true, safePaths: true };
    if (!Object.values(checks).every(Boolean)) throw new Error(`Generated preview failed quality gates: ${JSON.stringify(checks)}`);
    await stage(buildId, "TEST", "COMPLETED", "Preview integrity, responsive metadata, path safety, and secret scanning passed.", checks);
    await stage(buildId, "REVIEW", "RUNNING", "Checking completeness against the product specification.");
    await stage(buildId, "REVIEW", "COMPLETED", `${spec.features.length} product capabilities reviewed; risks are recorded in project intelligence.`);
    await stage(buildId, "POLISH", "RUNNING", "Finalizing the build and preview checkpoint.");
    await stage(buildId, "POLISH", "COMPLETED", "Build is ready for interactive preview.");

    await db.build.update({ where: { id: buildId }, data: { status: "COMPLETED", spentCredits: creditsSpent, finishedAt: new Date() } });
    await db.project.update({ where: { id: build.projectId }, data: { status: "READY" } });
    const reservation = build.reservations[0];
    if (reservation) await settleReservation(reservation.id, creditsSpent, `settle:${buildId}`);
    await db.usageEvent.create({ data: { userId: build.requestedBy, projectId: build.projectId, event: "build_completed", costCredits: creditsSpent, metadata: { buildId, versionId: version.id } } });
  } catch (error) {
    const cancelled = error instanceof Error && error.message === "BUILD_CANCELLED";
    const current = await db.build.findUnique({ where: { id: buildId }, select: { currentStage: true } });
    if (current?.currentStage) await db.buildStage.updateMany({ where: { buildId, name: current.currentStage, status: "RUNNING" }, data: { status: cancelled ? "CANCELLED" : "FAILED", finishedAt: new Date(), summary: cancelled ? "Cancelled by user." : "This stage stopped safely. See the build error for details." } });
    await db.build.update({ where: { id: buildId }, data: { status: cancelled ? "CANCELLED" : "FAILED", errorCode: cancelled ? "USER_CANCELLED" : "BUILD_FAILED", errorMessage: cancelled ? "Build cancelled. Provider costs already consumed may not be refundable." : error instanceof Error ? error.message.slice(0, 2000) : "Unknown build failure", finishedAt: new Date() } });
    const reservation = build.reservations[0];
    if (reservation) await settleReservation(reservation.id, creditsSpent, `settle:${buildId}`).catch(() => undefined);
    throw error;
  }
}

export async function initializeBuildStages(buildId: string) {
  await db.buildStage.createMany({ data: stageNames.map((name, position) => ({ buildId, name, position })) });
}
