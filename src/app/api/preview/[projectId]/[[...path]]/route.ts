import { requireProject } from "@/lib/auth";
import { db } from "@/lib/db";
import { jsonError } from "@/lib/http";

export async function GET(_: Request, context: { params: Promise<{ projectId: string; path?: string[] }> }) {
  try {
    const { projectId, path } = await context.params;
    await requireProject(projectId);
    const filePath = path?.join("/") || "index.html";
    const file = await db.projectFile.findUnique({ where: { projectId_path: { projectId, path: filePath } } });
    if (!file) return new Response("Project file not found", { status: 404 });
    return new Response(file.content, { headers: { "content-type": `${file.mimeType}; charset=utf-8`, "cache-control": "no-store", "content-security-policy": "default-src 'none'; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self'; form-action 'self'; frame-ancestors 'self'; base-uri 'self'" } });
  } catch (error) { return jsonError(error); }
}
