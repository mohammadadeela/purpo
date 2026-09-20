import { z } from "zod";
import { requireProject } from "@/lib/auth";
import { db } from "@/lib/db";
import { encryptSecret } from "@/lib/security";
import { enforceSameOrigin, jsonError } from "@/lib/http";

const schema = z.object({ name: z.string().regex(/^[A-Z][A-Z0-9_]{1,79}$/), value: z.string().max(20000), isSecret: z.boolean().default(true), environment: z.enum(["PREVIEW","STAGING","PRODUCTION"]) });

export async function GET(_: Request, context: { params: Promise<{ projectId: string }> }) {
  try { const { projectId } = await context.params; await requireProject(projectId); const values = await db.environmentVariable.findMany({ where: { projectId }, select: { id:true,name:true,isSecret:true,environment:true,updatedAt:true,publicValue:true } }); return Response.json({ values: values.map((value) => ({ ...value, publicValue: value.isSecret ? undefined : value.publicValue, maskedValue: value.isSecret ? "••••••••" : undefined })) }); }
  catch (error) { return jsonError(error); }
}

export async function POST(request: Request, context: { params: Promise<{ projectId: string }> }) {
  try {
    enforceSameOrigin(request); const { projectId } = await context.params; const { user } = await requireProject(projectId, true); const input = schema.parse(await request.json());
    const value = await db.environmentVariable.upsert({ where: { projectId_environment_name: { projectId, environment: input.environment, name: input.name } }, create: { projectId, name: input.name, environment: input.environment, isSecret: input.isSecret, updatedBy: user.id, encryptedValue: input.isSecret ? encryptSecret(input.value, `env:${projectId}:${input.environment}:${input.name}`) : null, publicValue: input.isSecret ? null : input.value }, update: { isSecret: input.isSecret, updatedBy: user.id, encryptedValue: input.isSecret ? encryptSecret(input.value, `env:${projectId}:${input.environment}:${input.name}`) : null, publicValue: input.isSecret ? null : input.value } });
    await db.auditLog.create({ data: { actorId: user.id, action: "environment.updated", targetType: "environmentVariable", targetId: value.id, metadata: { projectId, name: input.name, environment: input.environment, isSecret: input.isSecret } } });
    return Response.json({ value: { id:value.id,name:value.name,isSecret:value.isSecret,environment:value.environment,maskedValue:value.isSecret?"••••••••":undefined,publicValue:value.isSecret?undefined:value.publicValue } });
  } catch (error) { return jsonError(error); }
}
