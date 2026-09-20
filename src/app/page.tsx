import Link from "next/link";
import {
  Archive,
  Bell,
  Boxes,
  CircleHelp,
  Coins,
  FolderKanban,
  Home as HomeIcon,
  Images,
  LayoutTemplate,
  Plus,
  Search,
  Settings,
  Sparkles,
  WandSparkles
} from "lucide-react";
import { Logo } from "@/components/logo";
import { HomeIdea } from "@/components/home-idea";

const templates = [
  { name: "Orbit analytics", kind: "Dashboard", tone: "purple" },
  { name: "Forma studio", kind: "Portfolio", tone: "sand" },
  { name: "Daily focus", kind: "Productivity", tone: "mint" },
  { name: "Launchpad", kind: "SaaS", tone: "blue" }
];

function TemplatePreview({ tone }: { tone: string }) {
  return <div className={`purpo-template-preview ${tone}`}>
    <div className="purpo-mini-window">
      <div className="purpo-mini-top"><i/><i/><i/></div>
      <div className="purpo-mini-layout">
        <div className="purpo-mini-side"/>
        <div className="purpo-mini-content">
          <span className="wide"/><span/><div className="purpo-mini-cards"><b/><b/><b/></div>
        </div>
      </div>
    </div>
  </div>;
}

export default function Home() {
  return <div className="prototype-shell">
    <aside className="prototype-sidebar">
      <div className="prototype-brand-row"><Logo/><button className="prototype-workspace-switch" aria-label="Switch workspace">⌄</button></div>
      <Link className="prototype-new-project" href="/signup"><Plus size={15}/> New project</Link>

      <nav className="prototype-nav" aria-label="Product navigation">
        <Link className="prototype-nav-item active" href="/"><HomeIcon size={16}/> Home</Link>
        <Link className="prototype-nav-item" href="/login"><FolderKanban size={16}/> My projects</Link>
        <a className="prototype-nav-item" href="#templates"><LayoutTemplate size={16}/> Templates</a>
        <Link className="prototype-nav-item" href="/login"><Images size={16}/> Asset library</Link>
        <span className="prototype-nav-label">Workspace</span>
        <Link className="prototype-nav-item" href="/login"><Coins size={16}/> Usage & credits</Link>
        <Link className="prototype-nav-item" href="/login"><Boxes size={16}/> Integrations</Link>
        <Link className="prototype-nav-item" href="/login"><Archive size={16}/> Archive</Link>
      </nav>

      <div className="prototype-sidebar-bottom">
        <Link className="prototype-nav-item" href="/support"><CircleHelp size={16}/> Help & shortcuts</Link>
        <Link className="prototype-nav-item" href="/settings"><Settings size={16}/> Settings</Link>
        <Link className="prototype-account-card" href="/login">
          <span className="prototype-avatar">M</span>
          <span><strong>My workspace</strong><small>Personal account</small></span>
        </Link>
      </div>
    </aside>

    <main className="prototype-main">
      <header className="prototype-topbar">
        <div className="prototype-mobile-brand"><Logo/></div>
        <span className="prototype-crumb">Workspace <small>Home</small></span>
        <div className="prototype-search"><Search size={14}/><span>Search anything...</span><kbd>⌘ K</kbd></div>
        <button className="prototype-icon-button" aria-label="What's new"><Sparkles size={16}/></button>
        <button className="prototype-icon-button" aria-label="Notifications"><Bell size={16}/></button>
        <Link className="prototype-signin" href="/login">Sign in</Link>
      </header>

      <div className="prototype-content">
        <div className="prototype-page">
          <section className="prototype-home-hero">
            <div className="prototype-orb"><WandSparkles size={23}/></div>
            <div className="prototype-kicker">A space for your next big idea</div>
            <h1>What will you create?</h1>
            <p>Websites, apps, images, videos. One idea is all it takes.</p>
            <HomeIdea/>
          </section>

          <section className="prototype-section">
            <div className="prototype-section-row">
              <div><h2>Your workspace</h2><p>Projects, context, media and launches stay together.</p></div>
              <Link href="/login">View all projects</Link>
            </div>
            <div className="prototype-empty-projects">
              <div className="prototype-empty-icon"><Sparkles size={20}/></div>
              <div><strong>Your ideas will feel at home here.</strong><span>Sign in to save projects, keep history, and continue exactly where you stopped.</span></div>
              <Link className="prototype-small-button" href="/signup">Start creating</Link>
            </div>
          </section>

          <section className="prototype-section" id="templates">
            <div className="prototype-section-row">
              <div><span className="prototype-section-kicker">A head start, not a limit</span><h2>Skip the blank canvas.</h2><p>Start with something good. Make it entirely yours.</p></div>
              <Link href="/signup">Explore templates</Link>
            </div>
            <div className="prototype-template-grid">
              {templates.map((template) => <Link href="/signup" className="prototype-template-card" key={template.name}>
                <TemplatePreview tone={template.tone}/>
                <div><strong>{template.name}</strong><span>{template.kind}</span></div>
              </Link>)}
            </div>
          </section>

          <footer className="prototype-home-footer">A little curiosity goes a long way. <span>Made for your imagination.</span></footer>
        </div>
      </div>
    </main>
  </div>;
}
