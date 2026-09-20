import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus, Layers3 } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { AppFrame } from "@/components/app-frame";

export default async function WorkspacePage() {
  let user; try { user = await requireUser(); } catch { redirect("/login"); }
  const [wallet, projects] = await Promise.all([
    db.creditWallet.findUnique({ where: { userId: user.id } }),
    db.project.findMany({ where: { OR: [{ members: { some: { userId: user.id } } }, { organization: { members: { some: { userId: user.id } } } }] }, orderBy: { updatedAt: "desc" }, include: { _count: { select: { files: true, assets: true } } } })
  ]);
  return <AppFrame title={`${user.name ?? "Your"}’s workspace`} credits={(wallet?.balance ?? 0) - (wallet?.reserved ?? 0)} admin={user.role !== "USER"}><div className="page-pad"><div className="page-title"><div><h2>Your products</h2><p>Every decision, file, version, and deployment stays connected.</p></div><Link className="button violet" href="/onboarding"><Plus size={16}/> New project</Link></div>{projects.length ? <div className="project-grid">{projects.map((project) => <Link href={`/workspace/${project.id}/overview`} className="project-card" key={project.id}><div><span className={`status-pill ${project.status.toLowerCase()}`}>{project.status.toLowerCase()}</span><h3>{project.name}</h3><p>{project.objective}</p></div><div className="project-meta"><span>{project._count.files} files · {project._count.assets} assets</span><span>{project.updatedAt.toLocaleDateString()}</span></div></Link>)}</div> : <div className="empty-state"><Layers3 size={30}/><h3>Build your first idea</h3><p>Describe the complete outcome. PURPO will plan the product and start a real, versioned build.</p><Link className="button violet" href="/onboarding">Create project</Link></div>}</div></AppFrame>;
}
