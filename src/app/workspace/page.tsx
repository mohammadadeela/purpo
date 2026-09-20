import Link from "next/link";
import { redirect } from "next/navigation";
import { Sparkles } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { AppFrame } from "@/components/app-frame";
import { WorkspaceQuickCreate } from "@/components/workspace-quick-create";

const templates = [
  ["Orbit analytics","Dashboard","purple"],
  ["Forma studio","Portfolio","sand"],
  ["Daily focus","Productivity","mint"],
  ["Launchpad","SaaS","blue"]
] as const;

function Preview({ tone }: { tone: string }) {
  return <div className={`purpo-template-preview ${tone}`}><div className="purpo-mini-window"><div className="purpo-mini-top"><i/><i/><i/></div><div className="purpo-mini-layout"><div className="purpo-mini-side"/><div className="purpo-mini-content"><span className="wide"/><span/><div className="purpo-mini-cards"><b/><b/><b/></div></div></div></div></div>;
}

export default async function WorkspacePage() {
  let user; try { user = await requireUser(); } catch { redirect("/login"); }
  const [wallet, projects] = await Promise.all([
    db.creditWallet.findUnique({ where: { userId: user.id } }),
    db.project.findMany({ where: { OR: [{ members: { some: { userId: user.id } } }, { organization: { members: { some: { userId: user.id } } } }] }, orderBy: { updatedAt: "desc" }, include: { _count: { select: { files: true, assets: true } } } })
  ]);
  const available = (wallet?.balance ?? 0) - (wallet?.reserved ?? 0);

  return <AppFrame title="Workspace Home" credits={available} admin={user.role !== "USER"}>
    <div className="prototype-workspace-content">
      <div className="prototype-page">
        <section className="prototype-home-hero workspace-version">
          <div className="prototype-orb"><Sparkles size={22}/></div>
          <div className="prototype-kicker">A little idea. A lot of possibility.</div>
          <h1>What will you create?</h1>
          <p>Websites, apps, images, videos. One idea is all it takes.</p>
          <WorkspaceQuickCreate/>
        </section>

        <section className="prototype-section">
          <div className="prototype-section-row">
            <div><h2>Your workspace</h2><p>Recent projects</p></div>
            <Link href="/onboarding">New project</Link>
          </div>
          {projects.length ? <div className="prototype-project-grid">{projects.slice(0,6).map((project) => <Link href={`/workspace/${project.id}/overview`} className="prototype-project-card" key={project.id}>
            <div className="prototype-project-preview"><Preview tone={project.status === "READY" ? "mint" : "purple"}/></div>
            <div className="prototype-project-card-copy">
              <span className={`status-pill ${project.status.toLowerCase()}`}>{project.status.toLowerCase()}</span>
              <h3>{project.name}</h3>
              <p>{project.objective}</p>
              <small>{project._count.files} files · {project._count.assets} assets · Updated {project.updatedAt.toLocaleDateString()}</small>
            </div>
          </Link>)}</div> : <div className="prototype-empty-projects"><div className="prototype-empty-icon"><Sparkles size={20}/></div><div><strong>Your ideas will feel at home here.</strong><span>Start from the box above or make a template your own.</span></div><Link className="prototype-small-button" href="/onboarding">Create project</Link></div>}
        </section>

        <section className="prototype-section" id="templates">
          <div className="prototype-section-row"><div><span className="prototype-section-kicker">A head start, not a limit</span><h2>Skip the blank canvas.</h2><p>Start with something good. Make it entirely yours.</p></div></div>
          <div className="prototype-template-grid">{templates.map(([name,kind,tone]) => <Link href="/onboarding" className="prototype-template-card" key={name}><Preview tone={tone}/><div><strong>{name}</strong><span>{kind}</span></div></Link>)}</div>
        </section>

        <footer className="prototype-home-footer">A little curiosity goes a long way. <span>Made for your imagination.</span></footer>
      </div>
    </div>
  </AppFrame>;
}
