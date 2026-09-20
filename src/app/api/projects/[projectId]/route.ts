import { requireProject } from "@/lib/auth";
import { db } from "@/lib/db";
import { jsonError } from "@/lib/http";

export async function GET(_: Request, context: { params: Promise<{ projectId: string }> }) {
  try {
    const { projectId } = await context.params;
    await requireProject(projectId);
    const project = await db.project.findUniqueOrThrow({ where: { id: projectId }, include: { builds: { orderBy: { createdAt: "desc" }, take: 5, include: { stages: { orderBy: { position: "asc" } } } }, files: { select: { id: true, path: true, mimeType: true, sizeBytes: true, updatedAt: true } }, assets: { orderBy: { createdAt: "desc" } }, integrations: true, automations: true, versions: { orderBy: { number: "desc" }, take: 20 }, deployments: { orderBy: { createdAt: "desc" }, take: 20 }, memories: { where: { category: "product", key: "suggestions" } } } });
    return Response.json({ project: JSON.parse(JSON.stringify(project, (_, value) => typeof value === "bigint" ? value.toString() : value)) });
  } catch (error) { return jsonError(error); }
}
