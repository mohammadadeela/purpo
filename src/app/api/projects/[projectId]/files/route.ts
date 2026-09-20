import { requireProject } from "@/lib/auth";
import { db } from "@/lib/db";
import { jsonError } from "@/lib/http";

export async function GET(request: Request, context: { params: Promise<{ projectId: string }> }) {
  try {
    const { projectId } = await context.params;
    await requireProject(projectId);
    const url = new URL(request.url);
    const path = url.searchParams.get("path");
    const query = url.searchParams.get("q")?.trim();
    if (path) return Response.json({ file: await db.projectFile.findFirstOrThrow({ where: { projectId, path } }) });
    if (query) return Response.json({ files: await db.projectFile.findMany({ where: { projectId, OR: [{ path: { contains: query, mode: "insensitive" } }, { content: { contains: query, mode: "insensitive" } }] }, select: { path: true, mimeType: true, sizeBytes: true, updatedAt: true }, take: 100, orderBy: { path: "asc" } }) });
    return Response.json({ files: await db.projectFile.findMany({ where: { projectId }, select: { path: true, mimeType: true, sizeBytes: true, updatedAt: true }, orderBy: { path: "asc" } }) });
  } catch (error) { return jsonError(error); }
}
