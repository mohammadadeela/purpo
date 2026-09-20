import { db } from "./db";
import { env } from "./env";
import { putObject } from "./storage";
import { settleReservation } from "./credits";

type MediaPayload = { jobId: string; projectId: string; userId: string; kind: "image" | "video"; prompt: string; name: string; aspectRatio?: string; durationSeconds?: number };

async function generateImage(prompt: string, aspectRatio?: string) {
  if (!env().OPENAI_API_KEY) throw new Error("OpenAI image generation is not configured.");
  const size = aspectRatio === "portrait" ? "1024x1536" : aspectRatio === "landscape" ? "1536x1024" : "1024x1024";
  const response = await fetch("https://api.openai.com/v1/images/generations", { method: "POST", headers: { authorization: `Bearer ${env().OPENAI_API_KEY}`, "content-type": "application/json" }, body: JSON.stringify({ model: env().OPENAI_IMAGE_MODEL, prompt, size, response_format: "b64_json" }), signal: AbortSignal.timeout(300000) });
  const payload = await response.json() as { data?: Array<{ b64_json?: string }>; error?: { message?: string } };
  if (!response.ok || !payload.data?.[0]?.b64_json) throw new Error(payload.error?.message ?? `Image provider returned HTTP ${response.status}.`);
  return { bytes: Buffer.from(payload.data[0].b64_json, "base64"), contentType: "image/png" };
}

async function generateVideo(prompt: string, aspectRatio = "landscape", durationSeconds = 8) {
  if (!env().GEMINI_API_KEY) throw new Error("Gemini video generation is not configured.");
  const initial = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(env().GEMINI_VIDEO_MODEL)}:predictLongRunning`, { method: "POST", headers: { "x-goog-api-key": env().GEMINI_API_KEY!, "content-type": "application/json" }, body: JSON.stringify({ instances: [{ prompt }], parameters: { aspectRatio: aspectRatio === "portrait" ? "9:16" : aspectRatio === "square" ? "1:1" : "16:9", durationSeconds } }), signal: AbortSignal.timeout(30000) });
  const operation = await initial.json() as { name?: string; error?: { message?: string } };
  if (!initial.ok || !operation.name) throw new Error(operation.error?.message ?? `Video provider returned HTTP ${initial.status}.`);
  for (let attempt = 0; attempt < 60; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 5000));
    const poll = await fetch(`https://generativelanguage.googleapis.com/v1beta/${operation.name}`, { headers: { "x-goog-api-key": env().GEMINI_API_KEY! }, signal: AbortSignal.timeout(30000) });
    const state = await poll.json() as { done?: boolean; error?: { message?: string }; response?: { generateVideoResponse?: { generatedSamples?: Array<{ video?: { uri?: string } }> } } };
    if (state.error) throw new Error(state.error.message ?? "Video generation failed.");
    const uri = state.response?.generateVideoResponse?.generatedSamples?.[0]?.video?.uri;
    if (state.done && uri) { const downloaded = await fetch(uri, { headers: { "x-goog-api-key": env().GEMINI_API_KEY! }, signal: AbortSignal.timeout(180000) }); if (!downloaded.ok) throw new Error("Generated video could not be downloaded."); return { bytes: Buffer.from(await downloaded.arrayBuffer()), contentType: downloaded.headers.get("content-type") ?? "video/mp4" }; }
    if (state.done) throw new Error("Video generation completed without a downloadable result.");
  }
  throw new Error("Video generation exceeded the ten-minute provider window. It was not retried.");
}

export async function runMediaJob(payload: MediaPayload) {
  const job = await db.job.findUniqueOrThrow({ where: { id: payload.jobId }, include: { reservations: true } });
  if (job.status === "CANCELLED") return;
  await db.job.update({ where: { id: job.id }, data: { status: "RUNNING", lockedAt: new Date(), attempt: { increment: 1 } } });
  let charged = false;
  try {
    const generated = payload.kind === "image" ? await generateImage(payload.prompt, payload.aspectRatio) : await generateVideo(payload.prompt, payload.aspectRatio, payload.durationSeconds);
    charged = true;
    const extension = payload.kind === "image" ? "png" : "mp4";
    const objectKey = `projects/${payload.projectId}/generated/${job.id}.${extension}`;
    await putObject(objectKey, generated.bytes, generated.contentType);
    const asset = await db.asset.create({ data: { projectId: payload.projectId, kind: payload.kind === "image" ? "IMAGE" : "VIDEO", name: payload.name, objectKey, mimeType: generated.contentType, bytes: BigInt(generated.bytes.length), source: payload.kind === "image" ? "openai" : "gemini", metadata: { prompt: payload.prompt, jobId: job.id } } });
    await db.job.update({ where: { id: job.id }, data: { status: "COMPLETED", completedAt: new Date(), result: { assetId: asset.id } } });
    if (job.reservations[0]) await settleReservation(job.reservations[0].id, job.reservations[0].amount, `media:${job.id}:settled`);
    await db.usageEvent.create({ data: { userId: payload.userId, projectId: payload.projectId, event: `${payload.kind}_generated`, costCredits: job.reservations[0]?.amount ?? 0, metadata: { jobId: job.id, assetId: asset.id } } });
  } catch (error) {
    await db.job.update({ where: { id: job.id }, data: { status: "FAILED", completedAt: new Date(), errorMessage: error instanceof Error ? error.message.slice(0,2000) : "Media generation failed." } });
    if (!charged && job.reservations[0]) await settleReservation(job.reservations[0].id, 0, `media:${job.id}:released`);
    throw error;
  }
}
