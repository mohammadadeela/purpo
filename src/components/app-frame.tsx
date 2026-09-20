import Link from "next/link";
import { LayoutGrid, Settings, ShieldCheck, Plus, FolderKanban, BarChart3, LifeBuoy } from "lucide-react";
import { Logo } from "./logo";
import { LogoutButton } from "./logout-button";

export function AppFrame({ children, title, credits, admin = false }: { children: React.ReactNode; title: string; credits: number; admin?: boolean }) {
  return <div className="app-shell"><aside className="sidebar"><Link href="/workspace"><Logo/></Link><span className="side-label">Workspace</span><Link className="side-link active" href="/workspace"><LayoutGrid size={16}/> Projects</Link><Link className="side-link" href="/onboarding"><Plus size={16}/> Create</Link><Link className="side-link" href="/settings"><Settings size={16}/> Settings</Link>{admin && <><span className="side-label">Operations</span><Link className="side-link" href="/admin"><ShieldCheck size={16}/> Admin</Link></>}<div className="sidebar-bottom"><Link className="side-link" href="/workspace"><FolderKanban size={16}/> Assets</Link><Link className="side-link" href="/settings/usage"><BarChart3 size={16}/> Usage</Link><Link className="side-link" href="/support"><LifeBuoy size={16}/> Support</Link><LogoutButton/></div></aside><main className="app-main"><header className="app-topbar"><h1>{title}</h1><span className="credit-pill">{credits.toLocaleString()} credits</span></header>{children}</main></div>;
}
