import { z } from "zod";
import { requireProject } from "@/lib/auth";
import { db } from "@/lib/db";
import { estimateCredits, reserveCredits, settleReservation } from "@/lib/credits";
import { getMediaQueue } from "@/lib/queue";
import { enforceSameOrigin, jsonError } from "@/lib/http";

const schema = z.object({ kind: z.enum(["image","video"]), prompt: z.string().min(8).max(8000), name: z.string().min(1).max(180), aspectRatio: z.enum(["square","portrait","landscape"]).default("landscape"), durationSeconds: z.number().int().min(4).max(8).optional() });
export async function POST(request: Request, context: { params: Promise<{ projectId: string }> }) {
  let reservationId: string | undefined; let jobId: string | undefined;
  try {
    enforceSameOrigin(request); const {projectId}=await context.params; const {user}=await requireProject(projectId,true); const input=schema.parse(await request.json()); const credits=estimateCredits(input.kind,input.kind==="video"?(input.durationSeconds??8)/8:1);
    const job=await db.job.create({data:{type:`media:${input.kind}`,idempotencyKey:`media:${crypto.randomUUID()}`,payload:{projectId,userId:user.id,...input},maxAttempts:1}}); jobId=job.id;
    const reservation=await reserveCredits(user.id,credits,`media:${job.id}:reserve`,undefined,undefined,job.id); reservationId=reservation.id;
    await db.job.update({where:{id:job.id},data:{payload:{jobId:job.id,projectId,userId:user.id,...input}}});
    await getMediaQueue().add(input.kind,{jobId:job.id,projectId,userId:user.id,...input},{jobId:job.id});
    return Response.json({job:{id:job.id,status:job.status,estimatedCredits:credits}},{status:202});
  } catch(error){if(reservationId&&jobId)await settleReservation(reservationId,0,`media:${jobId}:queue-failed`).catch(()=>undefined);return jsonError(error)}
}
