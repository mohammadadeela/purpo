import Link from "next/link";
import { redirect } from "next/navigation";
import { User, CircleUserRound, Palette, Languages, Bell, Shield, MonitorSmartphone, Plug, Brain, FolderCog, CreditCard, ChartNoAxesCombined, Receipt, Coins, Users, KeyRound, LockKeyhole, Download, TriangleAlert } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { AppFrame } from "@/components/app-frame";
import { BillingActions } from "@/components/billing-actions";

const entries = [
  ["profile","Profile",User],["account","Account",CircleUserRound],["appearance","Appearance",Palette],["language","Language",Languages],["notifications","Notifications",Bell],["security","Security",Shield],["sessions","Sessions",MonitorSmartphone],["connected-apps","Connected apps",Plug],["ai-preferences","AI preferences",Brain],["project-defaults","Project defaults",FolderCog],["billing","Billing",CreditCard],["usage","Usage",ChartNoAxesCombined],["invoices","Invoices",Receipt],["credits","Credits",Coins],["team","Team",Users],["api-keys","API keys",KeyRound],["privacy","Privacy",LockKeyhole],["data-export","Data export",Download],["danger-zone","Danger zone",TriangleAlert]
] as const;

export default async function SettingsPage({ params }: { params: Promise<{ section?: string[] }> }) {
  let user; try { user = await requireUser(); } catch { redirect("/login"); }
  const selected = (await params).section?.[0] ?? "profile";
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setUTCDate(thirtyDaysAgo.getUTCDate() - 30);
  const [wallet, subscriptions, invoices, sessions, usage, memberships, apiKeys] = await Promise.all([
    db.creditWallet.findUnique({ where: { userId: user.id }, include: { transactions: { orderBy: { createdAt: "desc" }, take: 20 } } }),
    db.subscription.findMany({ where: { userId: user.id }, include: { plan: true }, orderBy: { createdAt: "desc" } }),
    db.invoice.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 30 }),
    db.session.findMany({ where: { userId: user.id, revokedAt: null, expiresAt: { gt: new Date() } }, orderBy: { lastSeenAt: "desc" } }),
    db.usageEvent.groupBy({ by: ["event"], where: { userId: user.id, createdAt: { gte: thirtyDaysAgo } }, _sum: { quantity: true, costCredits: true } }),
    db.membership.findMany({ where: { userId: user.id }, include: { organization: { include: { members: { include: { user: { select: { name: true, email: true } } } } } } } }),
    db.apiKey.findMany({ where: { userId: user.id, revokedAt: null }, select: { id: true, name: true, prefix: true, lastUsedAt: true, createdAt: true } })
  ]);
  const available = (wallet?.balance ?? 0) - (wallet?.reserved ?? 0);
  let content: React.ReactNode;
  if (selected === "billing") content = <div className="content-card"><div className="content-card-head"><h3>Subscription</h3><span className={`status-pill ${subscriptions[0]?.status === "ACTIVE" ? "ready" : ""}`}>{subscriptions[0]?.status ?? "Starter"}</span></div><div className="page-pad"><h2>{subscriptions[0]?.plan.name ?? "Starter"}</h2><p>{subscriptions[0] ? `${subscriptions[0].cancelAtPeriodEnd ? "Ends" : "Renews"} on ${subscriptions[0].currentPeriodEnd.toLocaleDateString()}. Auto-renew ${subscriptions[0].cancelAtPeriodEnd ? "disabled" : "enabled"}.` : "40 starter credits, real previews, and source access."}</p><BillingActions hasSubscription={Boolean(subscriptions.length)}/></div></div>;
  else if (selected === "usage") content = <div className="metrics">{usage.map((item) => <div className="metric" key={item.event}><span>{item.event.replaceAll("_"," ")}</span><strong>{item._sum.quantity ?? 0}</strong><small>{item._sum.costCredits ?? 0} credits · 30 days</small></div>)}{!usage.length && <div className="metric"><span>Last 30 days</span><strong>0</strong><small>No usage yet</small></div>}</div>;
  else if (selected === "credits") content = <div className="content-card"><div className="content-card-head"><h3>Credit wallet</h3><strong>{available} available</strong></div>{wallet?.transactions.map((item) => <div className="content-card-head" key={item.id}><div><h3>{item.kind}</h3><small>{item.referenceType ?? "PURPO"}</small></div><strong>{item.amount > 0 ? "+" : ""}{item.amount}</strong></div>)}</div>;
  else if (selected === "invoices") content = invoices.length ? <div className="content-card">{invoices.map((invoice) => <div className="content-card-head" key={invoice.id}><div><h3>{invoice.number ?? invoice.providerInvoiceId}</h3><small>{invoice.createdAt.toLocaleDateString()} · {invoice.status}</small></div><div><strong>{new Intl.NumberFormat("en", {style:"currency",currency:invoice.currency}).format(invoice.total/100)}</strong>{invoice.pdfUrl && <a className="button ghost" href={invoice.pdfUrl}>PDF</a>}</div></div>)}</div> : <div className="empty-state"><Receipt/><h3>No invoices yet</h3><p>Paid invoices and downloadable tax receipts will appear here.</p></div>;
  else if (selected === "sessions" || selected === "security") content = <div className="content-card"><div className="content-card-head"><h3>Active sessions</h3><span>{sessions.length}</span></div>{sessions.map((session) => <div className="content-card-head" key={session.id}><div><h3>{session.userAgent?.slice(0,80) ?? "Unknown browser"}</h3><small>Last seen {session.lastSeenAt.toLocaleString()}</small></div><span className="status-pill ready">Active</span></div>)}</div>;
  else if (selected === "team") content = <div className="content-card">{memberships.flatMap((membership) => membership.organization.members.map((member) => <div className="content-card-head" key={member.id}><div><h3>{member.user.name ?? member.user.email}</h3><small>{member.user.email}</small></div><span>{member.role}</span></div>))}</div>;
  else if (selected === "api-keys") content = apiKeys.length ? <div className="content-card">{apiKeys.map((key) => <div className="content-card-head" key={key.id}><div><h3>{key.name}</h3><small>{key.prefix}•••• · Created {key.createdAt.toLocaleDateString()}</small></div><span>{key.lastUsedAt ? `Used ${key.lastUsedAt.toLocaleDateString()}` : "Never used"}</span></div>)}</div> : <div className="empty-state"><KeyRound/><h3>No API keys</h3><p>API keys are shown only once when created. Stored keys are hashed, not recoverable.</p></div>;
  else content = <div className="settings-grid">{entries.filter(([key]) => key !== selected).slice(0,9).map(([key,label,Icon]) => <Link className="settings-card" href={`/settings/${key}`} key={key}><Icon size={18}/><h3>{label}</h3><p>Manage {label.toLowerCase()} with privacy-safe, server-authoritative settings.</p></Link>)}</div>;
  return <AppFrame title="Settings" credits={available} admin={user.role !== "USER"}><div className="page-pad"><div className="page-title"><div><h2>{entries.find(([key]) => key === selected)?.[1] ?? "Settings"}</h2><p>Your account, security, preferences, usage, team, and billing in one place.</p></div></div><div className="studio-toolbar" style={{border:"1px solid var(--line)",borderRadius:12,marginBottom:20}}>{entries.map(([key,label]) => <Link key={key} className={`tool-tab ${selected === key ? "active" : ""}`} href={`/settings/${key}`}>{label}</Link>)}</div>{content}</div></AppFrame>;
}
