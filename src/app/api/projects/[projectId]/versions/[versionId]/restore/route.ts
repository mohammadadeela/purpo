import crypto from "node:crypto";
import { requireProject } from "@/lib/auth";
import { db } from "@/lib/db";
import { enforceSameOrigin, HttpError, jsonError } from "@/lib/http";

export async function POST(request: Request, context: { params: Promise<{ projectId: string; versionId: string }> }) {
  try {
    enforceSameOrigin(request);
    const { projectId, versionId } = await context.params;
    const { user } = await requireProject(projectId, true);
    const source = await db.projectVersion.findFirst({ where: { id: versionId, projectId }, include: { files: true } });
    if (!source) throw new HttpError(404, "Version not found.", "VERSION_NOT_FOUND");
    const restored = await db.$transaction(async (tx) => {
      const latest = await tx.projectVersion.aggregate({ where: { projectId }, _max: { number: true } });
      const version = await tx.projectVersion.create({ data: { projectId, number: (latest._max.number ?? 0) + 1, label: `Restored version ${source.number}`, description: `Created from immutable checkpoint ${source.id}`, source: "restore" } });
      await tx.projectFile.deleteMany({ where: { projectId } });
      for (const file of source.files) {
        const hash = crypto.createHash("sha256").update(file.content).digest("hex");
        await tx.projectFile.create({ data: { projectId, path: file.path, content: file.content, mimeType: file.mimeType, contentHash: hash, sizeBytes: Buffer.byteLength(file.content) } });
        await tx.versionFile.create({ data: { versionId: version.id, path: file.path, content: file.content, mimeType: file.mimeType, hash } });
      }
      await tx.project.update({ where: { id: projectId }, data: { activeVersionId: version.id, status: "READY" } });
      return version;
    });
    await db.auditLog.create({ data: { actorId: user.id, action: "project.version_restored", targetType: "project", targetId: projectId, metadata: { sourceVersionId: versionId, restoredVersionId: restored.id } } });
    return Response.json({ version: restored });
  } catch (error) { return jsonError(error); }
}
