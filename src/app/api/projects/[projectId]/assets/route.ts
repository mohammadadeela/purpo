import { z } from "zod";
import { nanoid } from "nanoid";
import { requireProject } from "@/lib/auth";
import { db } from "@/lib/db";
import { createUploadUrl, verifyObject } from "@/lib/storage";
import { enforceSameOrigin, HttpError, jsonError } from "@/lib/http";

const allowed = ["image/", "video/", "audio/", "application/pdf", "text/plain", "application/json"];
const prepareSchema = z.object({ action: z.literal("prepare"), name: z.string().min(1).max(180), contentType: z.string().max(100), bytes: z.number().int().positive().max(250 * 1024 * 1024), kind: z.enum(["IMAGE","VIDEO","AUDIO","DOCUMENT","SCREENSHOT","BRAND","GENERATED","UPLOAD","EXPORT","THREE_D"]) });
const completeSchema = z.object({ action: z.literal("complete"), name: z.string().min(1).max(180), objectKey: z.string().min(10).max(500), contentType: z.string(), bytes: z.number().int().positive(), kind: prepareSchema.shape.kind });

export async function POST(request: Request, context: { params: Promise<{ projectId: string }> }) {
  try {
    enforceSameOrigin(request);
    const { projectId } = await context.params;
    const { user } = await requireProject(projectId, true);
    const raw = await request.json();
    if (raw.action === "prepare") {
      const input = prepareSchema.parse(raw);
      if (!allowed.some((value) => input.contentType.startsWith(value))) throw new HttpError(415, "This file type is not allowed.", "FILE_TYPE_REJECTED");
      const objectKey = `projects/${projectId}/uploads/${nanoid(16)}-${input.name.replace(/[^a-zA-Z0-9._-]/g, "-")}`;
      return Response.json({ objectKey, uploadUrl: await createUploadUrl(objectKey, input.contentType, input.bytes), expiresIn: 600 });
    }
    const input = completeSchema.parse(raw);
    if (!input.objectKey.startsWith(`projects/${projectId}/uploads/`)) throw new HttpError(403, "Invalid project object key.", "OBJECT_KEY_REJECTED");
    const object = await verifyObject(input.objectKey);
    if (Number(object.ContentLength) !== input.bytes || object.ContentType !== input.contentType) throw new HttpError(409, "The uploaded file does not match its prepared metadata.", "UPLOAD_MISMATCH");
    const asset = await db.asset.create({ data: { projectId, kind: input.kind, name: input.name, objectKey: input.objectKey, mimeType: input.contentType, bytes: BigInt(input.bytes), source: "upload" } });
    await db.usageEvent.create({ data: { userId: user.id, projectId, event: "asset_uploaded", metadata: { assetId: asset.id, bytes: input.bytes } } });
    return Response.json({ asset: { ...asset, bytes: asset.bytes.toString() } }, { status: 201 });
  } catch (error) { return jsonError(error); }
}
