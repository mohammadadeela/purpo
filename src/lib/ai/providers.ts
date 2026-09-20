import { env } from "../env";
import { HttpError } from "../http";
import type { AiProviderAdapter, AiRequestInput, AiResult, AiTaskClass } from "./types";

function extractOpenAiText(payload: Record<string, unknown>) {
  if (typeof payload.output_text === "string") return payload.output_text;
  const output = Array.isArray(payload.output) ? payload.output : [];
  for (const item of output as Array<{ content?: Array<{ text?: string }> }>) {
    for (const content of item.content ?? []) if (content.text) return content.text;
  }
  throw new Error("The AI provider returned no text output.");
}

export class OpenAiAdapter implements AiProviderAdapter {
  key = "openai";
  supports(task: AiTaskClass) { return !["video"].includes(task); }
  async generate(input: AiRequestInput, model: string): Promise<AiResult> {
    const key = env().OPENAI_API_KEY;
    if (!key) throw new HttpError(503, "OpenAI is not configured. Add OPENAI_API_KEY on the server.", "PROVIDER_NOT_CONFIGURED");
    const body: Record<string, unknown> = { model, input: [{ role: "system", content: input.system }, { role: "user", content: input.prompt }] };
    if (input.schema) body.text = { format: { type: "json_schema", name: input.schemaName ?? "result", strict: true, schema: input.schema } };
    const response = await fetch("https://api.openai.com/v1/responses", { method: "POST", headers: { authorization: `Bearer ${key}`, "content-type": "application/json" }, body: JSON.stringify(body), signal: AbortSignal.timeout(180000) });
    const payload = await response.json() as Record<string, unknown>;
    if (!response.ok) throw new HttpError(502, `OpenAI request failed (${response.status}).`, "AI_PROVIDER_ERROR", { provider: "openai", status: response.status });
    const usage = payload.usage as { input_tokens?: number; output_tokens?: number } | undefined;
    return { text: extractOpenAiText(payload), provider: this.key, model, requestId: String(payload.id ?? ""), inputTokens: usage?.input_tokens, outputTokens: usage?.output_tokens };
  }
}

export class GeminiAdapter implements AiProviderAdapter {
  key = "gemini";
  supports() { return true; }
  async generate(input: AiRequestInput, model: string): Promise<AiResult> {
    const key = env().GEMINI_API_KEY;
    if (!key) throw new HttpError(503, "Gemini is not configured. Add GEMINI_API_KEY on the server.", "PROVIDER_NOT_CONFIGURED");
    const body: Record<string, unknown> = {
      systemInstruction: { parts: [{ text: input.system }] },
      contents: [{ role: "user", parts: [{ text: input.prompt }] }],
      generationConfig: input.schema ? { responseMimeType: "application/json", responseJsonSchema: input.schema } : undefined
    };
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, { method: "POST", headers: { "x-goog-api-key": key, "content-type": "application/json" }, body: JSON.stringify(body), signal: AbortSignal.timeout(180000) });
    const payload = await response.json() as { responseId?: string; candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>; usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number } };
    if (!response.ok) throw new HttpError(502, `Gemini request failed (${response.status}).`, "AI_PROVIDER_ERROR", { provider: "gemini", status: response.status });
    const text = payload.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("") ?? "";
    if (!text) throw new Error("The AI provider returned no text output.");
    return { text, provider: this.key, model, requestId: payload.responseId, inputTokens: payload.usageMetadata?.promptTokenCount, outputTokens: payload.usageMetadata?.candidatesTokenCount };
  }
}
