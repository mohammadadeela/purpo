import JSZip from "jszip";
import { requireProject } from "@/lib/auth";
import { db } from "@/lib/db";
import { jsonError } from "@/lib/http";

export async function GET(_: Request, context: { params: Promise<{ projectId: string }> }) {
  try {
    const { projectId } = await context.params;
    const { user, project } = await requireProject(projectId);
    const files = await db.projectFile.findMany({ where: { projectId } });
    const zip = new JSZip();
    for (const file of files) zip.file(file.path, file.content);
    zip.file(".env.example", "# Add server secrets here. Never commit .env files.\n");
    zip.file("PURPO_HANDOFF.md", `# ${project.name}\n\n${project.objective}\n\nExported from PURPO. Actual secrets are intentionally excluded.\n`);
    const body = await zip.generateAsync({ type: "arraybuffer", compression: "DEFLATE" });
    await db.usageEvent.create({ data: { userId: user.id, projectId, event: "project_exported" } });
    return new Response(body, { headers: { "content-type": "application/zip", "content-disposition": `attachment; filename="${project.slug}.zip"`, "cache-control": "private, no-store" } });
  } catch (error) { return jsonError(error); }
}
