import Link from "next/link";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { AppFrame } from "@/components/app-frame";

const sections = ["dashboard","users","projects","organizations","subscriptions","payments","credits","invoices","ai-usage","providers","models","prompt-management","jobs","queues","media","deployments","integrations","feature-flags","notifications","reports","support","audit-logs","security","system-health"];

export default async function AdminPage({ params }: { params: Promise<{ section?: string[] }> }) {
  let admin; try { admin = await requireAdmin(); } catch { redirect("/workspace"); }
  const selected = (await params).section?.[0] ?? "dashboard";
  const [wallet, counts, revenue, recentUsers, recentJobs, audit] = await Promise.all([
    db.creditWallet.findUnique({ where: { userId: admin.id } }),
    Promise.all([db.user.count(),db.project.count(),db.build.count(),db.job.count({where:{status:{in:["QUEUED","RUNNING","WAITING"]}}}),db.deployment.count(),db.supportTicket.count({where:{status:{in:["OPEN","IN_PROGRESS"]}}})]),
    db.invoice.aggregate({ where: { status: "PAID" }, _sum: { total: true } }),
    db.user.findMany({ orderBy: { createdAt: "desc" }, take: 20, select: { id:true,name:true,email:true,role:true,createdAt:true,disabledAt:true } }),
    db.job.findMany({ orderBy: { createdAt: "desc" }, take: 30 }),
    db.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 30, include: { actor: { select: { email:true } } } })
  ]);
  const labels = ["Users","Projects","Builds","Queue depth","Deployments","Open support"];
  const available = (wallet?.balance ?? 0) - (wallet?.reserved ?? 0);
  let content: React.ReactNode = <div className="metrics">{counts.map((value,index) => <div className="metric" key={labels[index]}><span>{labels[index]}</span><strong>{value}</strong></div>)}<div className="metric"><span>Paid revenue</span><strong>${((revenue._sum.total ?? 0)/100).toLocaleString()}</strong></div></div>;
  if (selected === "users") content = <div className="content-card">{recentUsers.map((user) => <div className="content-card-head" key={user.id}><div><h3>{user.name ?? user.email}</h3><small>{user.email} · Joined {user.createdAt.toLocaleDateString()}</small></div><span className={`status-pill ${user.disabledAt ? "failed" : "ready"}`}>{user.disabledAt ? "Disabled" : user.role}</span></div>)}</div>;
  if (["jobs","queues"].includes(selected)) content = <div className="content-card">{recentJobs.map((job) => <div className="content-card-head" key={job.id}><div><h3>{job.type} · {job.id.slice(-8)}</h3><small>{job.errorMessage ?? `Attempt ${job.attempt}/${job.maxAttempts}`}</small></div><span className={`status-pill ${job.status.toLowerCase()}`}>{job.status}</span></div>)}</div>;
  if (selected === "audit-logs" || selected === "security") content = <div className="content-card">{audit.map((item) => <div className="content-card-head" key={item.id}><div><h3>{item.action}</h3><small>{item.actor?.email ?? "System"} · {item.targetType}:{item.targetId ?? "—"}</small></div><small>{item.createdAt.toLocaleString()}</small></div>)}</div>;
  if (selected === "system-health") content = <div className="metrics"><div className="metric"><span>Database</span><strong style={{fontSize:22}}>Connected</strong></div><div className="metric"><span>Queue depth</span><strong>{counts[3]}</strong></div><div className="metric"><span>Failed jobs</span><strong>{await db.job.count({where:{status:"FAILED"}})}</strong></div><div className="metric"><span>Failed builds</span><strong>{await db.build.count({where:{status:"FAILED"}})}</strong></div></div>;
  return <AppFrame title="PURPO operations" credits={available} admin><div className="page-pad"><div className="page-title"><div><h2>{selected.replaceAll("-"," ").replace(/^./,(value)=>value.toUpperCase())}</h2><p>Operational data is live and server-authorized. Secrets are never exposed here.</p></div></div><div className="studio-toolbar" style={{border:"1px solid var(--line)",borderRadius:12,marginBottom:20}}>{sections.map((key) => <Link className={`tool-tab ${key===selected?"active":""}`} key={key} href={`/admin/${key}`}>{key.replaceAll("-"," ")}</Link>)}</div>{content}</div></AppFrame>;
}
