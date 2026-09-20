import { redirect } from "next/navigation";
import { requireProject } from "@/lib/auth";
import { db } from "@/lib/db";
import { ProjectStudio } from "@/components/project-studio";

export default async function ProjectPage({ params }: { params: Promise<{ projectId: string; section?: string[] }> }) {
  const { projectId, section } = await params;
  let access; try { access = await requireProject(projectId); } catch { redirect("/login"); }
  const wallet = await db.creditWallet.findUnique({ where: { userId: access.user.id } });
  const selected = section?.[0] ?? "overview";
  return <ProjectStudio projectId={projectId} initialName={access.project.name} section={selected} credits={(wallet?.balance ?? 0) - (wallet?.reserved ?? 0)}/>;
}
