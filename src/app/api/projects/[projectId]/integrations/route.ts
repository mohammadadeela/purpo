import { z } from "zod";
import { requireProject } from "@/lib/auth";
import { db } from "@/lib/db";
import { encryptSecret } from "@/lib/security";
import { enforceSameOrigin, jsonError } from "@/lib/http";
import type { Prisma } from "@prisma/client";

const schema = z.object({ provider: z.enum(["firebase","supabase","postgresql","google","gmail","maps","calendar","drive","sheets","whatsapp","twilio","email","stripe","github","hostinger","s3","webhook","custom-api"]), displayName: z.string().min(2).max(80), secret: z.string().min(1).max(20000), publicConfig: z.record(z.string(), z.unknown()).optional() });

export async function POST(request: Request, context: { params: Promise<{ projectId: string }> }) {
  try {
    enforceSameOrigin(request);
    const { projectId } = await context.params;
    const { user } = await requireProject(projectId, true);
    const input = schema.parse(await request.json());
    const publicConfig = input.publicConfig as Prisma.InputJsonValue | undefined;
    const integration = await db.integration.upsert({ where: { projectId_provider: { projectId, provider: input.provider } }, create: { projectId, provider: input.provider, displayName: input.displayName, status: "CONNECTED", encryptedSecret: encryptSecret(input.secret, `integration:${projectId}:${input.provider}`), publicConfig, lastCheckedAt: new Date() }, update: { displayName: input.displayName, status: "CONNECTED", encryptedSecret: encryptSecret(input.secret, `integration:${projectId}:${input.provider}`), publicConfig, lastCheckedAt: new Date(), errorMessage: null } });
    await db.auditLog.create({ data: { actorId: user.id, action: "integration.connected", targetType: "integration", targetId: integration.id, metadata: { provider: input.provider, projectId } } });
    return Response.json({ integration: { id: integration.id, provider: integration.provider, displayName: integration.displayName, status: integration.status } }, { status: 201 });
  } catch (error) { return jsonError(error); }
}
