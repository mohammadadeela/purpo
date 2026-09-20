import Link from "next/link";
import {
  Archive,
  BarChart3,
  Bell,
  CircleHelp,
  Coins,
  FolderKanban,
  Home,
  Images,
  LayoutTemplate,
  Plus,
  Search,
  Settings,
  ShieldCheck,
  Plug
} from "lucide-react";
import { Logo } from "./logo";
import { LogoutButton } from "./logout-button";

export function AppFrame({ children, title, credits, admin = false }: { children: React.ReactNode; title: string; credits: number; admin?: boolean }) {
  return <div className="app-shell prototype-app-shell">
    <aside className="sidebar prototype-auth-sidebar">
      <div className="prototype-brand-row"><Link href="/workspace"><Logo/></Link><button className="prototype-workspace-switch" aria-label="Switch workspace">⌄</button></div>
      <Link className="prototype-new-project" href="/onboarding"><Plus size={15}/> New project</Link>

      <nav>
        <Link className="side-link active" href="/workspace"><Home size={16}/> Home</Link>
        <Link className="side-link" href="/workspace"><FolderKanban size={16}/> My projects</Link>
        <Link className="side-link" href="/workspace#templates"><LayoutTemplate size={16}/> Templates</Link>
        <Link className="side-link" href="/workspace#assets"><Images size={16}/> Asset library</Link>
        <span className="side-label">Workspace</span>
        <Link className="side-link" href="/settings/usage"><Coins size={16}/> Usage & credits</Link>
        <Link className="side-link" href="/settings/connected-apps"><Plug size={16}/> Integrations</Link>
        <Link className="side-link" href="/workspace"><Archive size={16}/> Archive</Link>
        {admin && <><span className="side-label">Operations</span><Link className="side-link" href="/admin"><ShieldCheck size={16}/> Admin</Link></>}
      </nav>

      <div className="sidebar-bottom">
        <Link className="side-link" href="/support"><CircleHelp size={16}/> Help & shortcuts</Link>
        <Link className="side-link" href="/settings"><Settings size={16}/> Settings</Link>
        <Link className="side-link" href="/settings/usage"><BarChart3 size={16}/> Usage</Link>
        <div className="prototype-credit-row"><span>Available</span><strong>{credits.toLocaleString()} credits</strong></div>
        <LogoutButton/>
      </div>
    </aside>

    <main className="app-main">
      <header className="app-topbar prototype-app-topbar">
        <div className="prototype-mobile-brand"><Logo/></div>
        <h1>{title}</h1>
        <div className="prototype-search"><Search size={14}/><span>Search anything...</span><kbd>⌘ K</kbd></div>
        <button className="prototype-icon-button" aria-label="Notifications"><Bell size={16}/></button>
        <span className="credit-pill">{credits.toLocaleString()} credits</span>
      </header>
      {children}
    </main>
  </div>;
}
