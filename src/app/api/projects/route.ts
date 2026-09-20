import { z } from "zod";
import { nanoid } from "nanoid";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { enforceSameOrigin, jsonError } from "@/lib/http";
import { estimateCredits, reserveCredits, settleReservation } from "@/lib/credits";
import { initializeBuildStages } from "@/lib/build-agent";
import { buildQueue } from "@/lib/queue";

const schema = z.object({ name: z.string().trim().min(2).max(100), objective: z.string().trim().min(12).max(8000), purpose: z.string().trim().max(240).optional() });

export async function GET() {
  try {
    const user = await requireUser();
    const projects = await db.project.findMany({ where: { OR: [{ members: { some: { userId: user.id } } }, { organization: { members: { some: { userId: user.id } } } }] }, orderBy: { updatedAt: "desc" }, include: { builds: { orderBy: { createdAt: "desc" }, take: 1 }, _count: { select: { files: true, assets: true, deployments: true } } } });
    return Response.json({ projects });
  } catch (error) { return jsonError(error); }
}

export async function POST(request: Request) {
  let reservationId: string | undefined;
  let buildId: string | undefined;
  try {
    enforceSameOrigin(request);
    const user = await requireUser();
    const input = schema.parse(await request.json());
    const membership = await db.membership.findFirstOrThrow({ where: { userId: user.id, role: { in: ["OWNER", "ADMIN", "EDITOR"] } }, orderBy: { createdAt: "asc" } });
    const result = await db.$transaction(async (tx) => {
      const project = await tx.project.create({ data: { organizationId: membership.organizationId, name: input.name, slug: `${input.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}-${nanoid(6)}`, objective: input.objective, description: input.purpose, members: { create: { userId: user.id, role: "OWNER" } }, conversations: { create: { title: "Product build", messages: { create: { userId: user.id, role: "user", content: input.objective } } } } } });
      const build = await tx.build.create({ data: { projectId: project.id, requestedBy: user.id, userRequest: input.objective, estimatedCredits: estimateCredits("build") } });
      await tx.usageEvent.create({ data: { userId: user.id, projectId: project.id, event: "project_created", metadata: { buildId: build.id } } });
      return { project, build };
    });
    buildId = result.build.id;
    await initializeBuildStages(buildId);
    const reservation = await reserveCredits(user.id, result.build.estimatedCredits, `reserve:${buildId}`, buildId);
    reservationId = reservation.id;
    const jobKey = `build:${buildId}`;
    await db.job.create({ data: { buildId, type: "build", idempotencyKey: jobKey, payload: { buildId } } });
    await buildQueue.add("build", { buildId }, { jobId: jobKey });
    return Response.json({ project: result.project, build: result.build, redirect: `/workspace/${result.project.id}/build` }, { status: 201 });
  } catch (error) {
    if (buildId) await db.build.update({ where: { id: buildId }, data: { status: "FAILED", errorCode: "QUEUE_UNAVAILABLE", errorMessage: "The build queue could not accept this task. Reserved credits were released." } }).catch(() => undefined);
    if (reservationId && buildId) await settleReservation(reservationId, 0, `queue-failed:${buildId}`).catch(() => undefined);
    return jsonError(error);
  }
}
