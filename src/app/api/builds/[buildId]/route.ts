import { requireProject, requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { enforceSameOrigin, HttpError, jsonError } from "@/lib/http";

export async function GET(_: Request, context: { params: Promise<{ buildId: string }> }) {
  try {
    const user = await requireUser();
    const { buildId } = await context.params;
    const build = await db.build.findUnique({ where: { id: buildId }, include: { stages: { orderBy: { position: "asc" } } } });
    if (!build) throw new HttpError(404, "Build not found.", "BUILD_NOT_FOUND");
    await requireProject(build.projectId);
    return Response.json({ build, viewer: user.id });
  } catch (error) { return jsonError(error); }
}

export async function DELETE(request: Request, context: { params: Promise<{ buildId: string }> }) {
  try {
    enforceSameOrigin(request);
    const { buildId } = await context.params;
    const build = await db.build.findUnique({ where: { id: buildId } });
    if (!build) throw new HttpError(404, "Build not found.", "BUILD_NOT_FOUND");
    await requireProject(build.projectId, true);
    if (["COMPLETED", "FAILED", "CANCELLED"].includes(build.status)) throw new HttpError(409, "This build has already finished.", "BUILD_FINISHED");
    const updated = await db.build.update({ where: { id: buildId }, data: { cancelledAt: new Date(), status: "CANCELLED", errorMessage: "Cancelled by user. Provider costs already consumed may not be refundable." } });
    return Response.json({ build: updated });
  } catch (error) { return jsonError(error); }
}
