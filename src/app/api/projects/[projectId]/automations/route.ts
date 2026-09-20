import { z } from "zod";
import { requireProject } from "@/lib/auth";
import { db } from "@/lib/db";
import { enforceSameOrigin, jsonError } from "@/lib/http";
import type { Prisma } from "@prisma/client";

const stepSchema = z.object({ id: z.string(), type: z.enum(["action","condition"]), provider: z.string(), operation: z.string(), config: z.record(z.string(), z.unknown()) });
const schema = z.object({ name: z.string().min(2).max(120), description: z.string().max(500).optional(), trigger: z.object({ type: z.enum(["schedule","webhook","database","form","user","payment"]), config: z.record(z.string(), z.unknown()) }), steps: z.array(stepSchema).min(1).max(30) });

export async function POST(request: Request, context: { params: Promise<{ projectId: string }> }) {
  try {
    enforceSameOrigin(request);
    const { projectId } = await context.params;
    const { user } = await requireProject(projectId, true);
    const input = schema.parse(await request.json());
    const automation = await db.automation.create({ data: { projectId, name: input.name, description: input.description, trigger: input.trigger as Prisma.InputJsonValue, steps: input.steps as Prisma.InputJsonValue } });
    await db.auditLog.create({ data: { actorId: user.id, action: "automation.created", targetType: "automation", targetId: automation.id, metadata: { projectId } } });
    return Response.json({ automation }, { status: 201 });
  } catch (error) { return jsonError(error); }
}
