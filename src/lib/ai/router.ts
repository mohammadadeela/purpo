import { db } from "../db";
import { env } from "../env";
import { GeminiAdapter, OpenAiAdapter } from "./providers";
import type { AiRequestInput, AiResult } from "./types";

const adapters = { openai: new OpenAiAdapter(), gemini: new GeminiAdapter() };

export async function runAi(input: AiRequestInput): Promise<AiResult> {
  const candidates = await db.aiModel.findMany({
    where: { active: true, provider: { active: true }, taskClasses: { has: input.taskClass } },
    include: { provider: true },
    orderBy: [{ priority: "asc" }, { provider: { priority: "asc" } }]
  });
  const configured = [
    ...candidates.map((candidate) => ({ provider: candidate.provider.key as keyof typeof adapters, model: candidate.modelKey, modelId: candidate.id, providerId: candidate.providerId })),
    ...(env().OPENAI_API_KEY ? [{ provider: "openai" as const, model: env().OPENAI_DEFAULT_MODEL }] : []),
    ...(env().GEMINI_API_KEY ? [{ provider: "gemini" as const, model: env().GEMINI_DEFAULT_MODEL }] : [])
  ];
  let lastError: unknown;
  for (const candidate of configured) {
    const adapter = adapters[candidate.provider];
    if (!adapter?.supports(input.taskClass)) continue;
    let requestRecord: { id: string } | undefined;
    try {
      const provider = await db.aiProvider.upsert({ where: { key: candidate.provider }, create: { key: candidate.provider, name: candidate.provider === "openai" ? "OpenAI" : "Google Gemini" }, update: {} });
      const model = await db.aiModel.upsert({ where: { providerId_modelKey: { providerId: provider.id, modelKey: candidate.model } }, create: { providerId: provider.id, modelKey: candidate.model, displayName: candidate.model, taskClasses: [input.taskClass], capabilities: {} }, update: {} });
      requestRecord = await db.aiRequest.create({ data: { projectId: input.projectId, providerId: provider.id, modelId: model.id, taskClass: input.taskClass, status: "running", startedAt: new Date() } });
      const result = await adapter.generate(input, candidate.model);
      await db.aiRequest.update({ where: { id: requestRecord.id }, data: { status: "completed", providerRef: result.requestId, inputTokens: result.inputTokens, outputTokens: result.outputTokens, finishedAt: new Date() } });
      return result;
    } catch (error) {
      lastError = error;
      if (requestRecord) await db.aiRequest.update({ where: { id: requestRecord.id }, data: { status: "failed", errorCode: error instanceof Error ? error.name : "UNKNOWN", finishedAt: new Date() } });
    }
  }
  throw lastError ?? new Error("No configured AI provider supports this task.");
}
