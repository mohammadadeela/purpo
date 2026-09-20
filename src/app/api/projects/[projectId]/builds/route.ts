import { z } from "zod";
import { requireProject } from "@/lib/auth";
import { db } from "@/lib/db";
import { estimateCredits, reserveCredits, settleReservation } from "@/lib/credits";
import { initializeBuildStages } from "@/lib/build-agent";
import { buildQueue } from "@/lib/queue";
import { enforceSameOrigin, jsonError } from "@/lib/http";

const schema = z.object({ request: z.string().trim().min(3).max(8000) });

export async function POST(request: Request, context: { params: Promise<{ projectId: string }> }) {
  let reservationId: string | undefined;
  let buildId: string | undefined;
  try {
    enforceSameOrigin(request);
    const { projectId } = await context.params;
    const { user } = await requireProject(projectId, true);
    const input = schema.parse(await request.json());
    const credits = estimateCredits("build", input.request.length > 1000 ? 1.5 : 1);
    const build = await db.build.create({ data: { projectId, requestedBy: user.id, userRequest: input.request, estimatedCredits: credits } });
    buildId = build.id;
    await initializeBuildStages(build.id);
    const reservation = await reserveCredits(user.id, credits, `reserve:${build.id}`, build.id);
    reservationId = reservation.id;
    const jobKey = `build:${build.id}`;
    await db.job.create({ data: { buildId: build.id, type: "build", idempotencyKey: jobKey, payload: { buildId: build.id } } });
    await buildQueue.add("build", { buildId: build.id }, { jobId: jobKey });
    await db.message.create({ data: { conversationId: (await db.conversation.findFirstOrThrow({ where: { projectId }, orderBy: { createdAt: "asc" } })).id, userId: user.id, role: "user", content: input.request } });
    return Response.json({ build }, { status: 202 });
  } catch (error) {
    if (buildId) await db.build.update({ where: { id: buildId }, data: { status: "FAILED", errorCode: "QUEUE_UNAVAILABLE" } }).catch(() => undefined);
    if (reservationId && buildId) await settleReservation(reservationId, 0, `queue-failed:${buildId}`).catch(() => undefined);
    return jsonError(error);
  }
}
