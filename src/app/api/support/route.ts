import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { enforceSameOrigin, jsonError } from "@/lib/http";

const schema = z.object({ subject: z.string().min(3).max(140), description: z.string().min(10).max(10000), projectId: z.string().optional(), taskId: z.string().optional() });
export async function POST(request: Request) {
  try { enforceSameOrigin(request); const user = await requireUser(); const input = schema.parse(await request.json()); if (input.projectId) await import("@/lib/auth").then(({requireProject}) => requireProject(input.projectId!)); const ticket = await db.supportTicket.create({ data: { userId:user.id,projectId:input.projectId,taskId:input.taskId,subject:input.subject,description:input.description,safeContext:{ userAgent: request.headers.get("user-agent")?.slice(0,300) } } }); return Response.json({ ticket }, {status:201}); }
  catch (error) { return jsonError(error); }
}
