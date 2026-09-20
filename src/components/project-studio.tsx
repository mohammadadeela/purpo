"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Box, Check, Circle, Code2, Database, ImageIcon, Link2, Loader2, Play, Rocket, Send, Sparkles, Workflow, X, History, ChartNoAxesCombined } from "lucide-react";
import { Logo } from "./logo";
import { AssetUpload, AutomationCreate, DeployCreate, IntegrationConnect, MediaGenerate } from "./project-tools";

type Stage = { id: string; name: string; status: string; summary?: string };
type Build = { id: string; status: string; userRequest: string; estimatedCredits: number; spentCredits: number; errorMessage?: string; stages: Stage[] };
type ProjectData = {
  id: string; name: string; objective: string; status: string; specification?: Record<string, unknown>;
  files: Array<{ id: string; path: string; mimeType: string; sizeBytes: number }>;
  assets: Array<{ id: string; name: string; kind: string; mimeType: string; bytes: string }>;
  integrations: Array<{ id: string; provider: string; displayName: string; status: string }>;
  automations: Array<{ id: string; name: string; status: string }>;
  versions: Array<{ id: string; number: number; label: string; createdAt: string }>;
  deployments: Array<{ id: string; environment: string; status: string; domain?: string; createdAt: string }>;
  builds: Build[];
  memories: Array<{ content: Array<{ title: string; reason: string; command: string }> }>;
};

const sections = [
  ["overview", "Overview", Box], ["build", "Build", Sparkles], ["preview", "Preview", Play], ["code", "Code", Code2], ["assets", "Assets", ImageIcon], ["data", "Data", Database], ["integrations", "Integrations", Link2], ["automations", "Automations", Workflow], ["deploy", "Deploy", Rocket], ["analytics", "Analytics", ChartNoAxesCombined], ["versions", "Versions", History]
] as const;

function StageIcon({ status }: { status: string }) {
  if (status === "COMPLETED") return <Check size={12}/>;
  if (status === "RUNNING") return <Loader2 size={12} className="spin"/>;
  if (status === "FAILED") return <X size={12}/>;
  return <Circle size={9}/>;
}

function Empty({ icon: Icon, title, copy, action }: { icon: typeof Box; title: string; copy: string; action?: React.ReactNode }) {
  return <div className="empty-state"><Icon size={30}/><h3>{title}</h3><p>{copy}</p>{action}</div>;
}

export function ProjectStudio({ projectId, initialName, section, credits }: { projectId: string; initialName: string; section: string; credits: number }) {
  const [project, setProject] = useState<ProjectData | null>(null);
  const [error, setError] = useState("");
  const [prompt, setPrompt] = useState("");
  const [sending, setSending] = useState(false);
  const [selectedFile, setSelectedFile] = useState("");
  const [fileContent, setFileContent] = useState("");
  const load = useCallback(async () => {
    const response = await fetch(`/api/projects/${projectId}`, { cache: "no-store" });
    const result = await response.json();
    if (!response.ok) { setError(result.error?.message ?? "Project could not be loaded."); return; }
    setProject(result.project);
  }, [projectId]);
  useEffect(() => {
    let cancelled = false;
    void fetch(`/api/projects/${projectId}`, { cache: "no-store" }).then((response) => response.json().then((result) => ({ response, result }))).then(({response, result}) => {
      if (cancelled) return;
      if (!response.ok) setError(result.error?.message ?? "Project could not be loaded."); else setProject(result.project);
    });
    return () => { cancelled = true; };
  }, [projectId]);
  const activeBuild = project?.builds[0];
  useEffect(() => {
    if (!activeBuild || !["QUEUED", "RUNNING", "WAITING"].includes(activeBuild.status)) return;
    const timer = setInterval(() => void load(), 2500); return () => clearInterval(timer);
  }, [activeBuild, load]);
  useEffect(() => {
    if (section !== "code" || !project?.files.length) return;
    const path = selectedFile || project.files[0].path;
    void fetch(`/api/projects/${projectId}/files?path=${encodeURIComponent(path)}`).then((r) => r.json()).then((r) => setFileContent(r.file?.content ?? ""));
  }, [section, selectedFile, project?.files, projectId]);
  async function sendBuild(requestText = prompt) {
    if (requestText.trim().length < 3) return;
    setSending(true); setError("");
    const response = await fetch(`/api/projects/${projectId}/builds`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ request: requestText }) });
    const result = await response.json();
    if (!response.ok) setError(result.error?.message ?? "The build could not start."); else { setPrompt(""); await load(); }
    setSending(false);
  }
  const spec = project?.specification as { summary?: string; features?: string[]; dataEntities?: string[]; risks?: string[] } | undefined;
  const suggestions = project?.memories[0]?.content ?? [];
  const content = (() => {
    if (!project) return <Empty icon={Loader2} title="Opening your product studio" copy="Loading the project, files, versions, and current build state."/>;
    if (section === "preview") return project.files.length ? <iframe title={`${project.name} interactive preview`} className="preview-frame" src={`/api/preview/${projectId}`}/> : <Empty icon={Play} title="Preview begins after the first build" copy="The preview is the real generated project, not a screenshot or static mockup."/>;
    if (section === "code") return project.files.length ? <div className="content-card file-browser"><div className="file-list">{project.files.map((file) => <button key={file.path} className={`file-item ${selectedFile === file.path ? "active" : ""}`} onClick={() => setSelectedFile(file.path)}>{file.path}</button>)}</div><pre className="code-view"><code>{fileContent}</code></pre></div> : <Empty icon={Code2} title="No source files yet" copy="Your source appears here as soon as a build creates the first checkpoint."/>;
    if (section === "assets") return <div><MediaGenerate projectId={projectId} onDone={load}/><div className="content-card" style={{marginBottom:18}}><div className="content-card-head"><h3>Upload project media</h3></div><div className="page-pad"><AssetUpload projectId={projectId} onDone={load}/></div></div>{project.assets.length ? <div className="project-grid">{project.assets.map((asset) => <article className="project-card" key={asset.id}><span className="status-pill ready">{asset.kind}</span><h3>{asset.name}</h3><p>{asset.mimeType} · {Math.round(Number(asset.bytes) / 1024)} KB</p></article>)}</div> : <Empty icon={ImageIcon} title="Generate or upload an asset" copy="Images, video, audio, documents, screenshots, brand files, and exports stay attached to this project."/>}</div>;
    if (section === "data") return <div className="content-card"><div className="content-card-head"><h3>Product data model</h3><span className="status-pill ready">Project intelligence</span></div><div className="page-pad"><div className="idea-grid">{(spec?.dataEntities ?? []).map((entity) => <div className="idea-card" key={entity}><strong>{entity}</strong><span>Planned entity. Schema generation creates relations, indexes, constraints, and migrations.</span></div>)}</div>{!spec?.dataEntities?.length && <Empty icon={Database} title="No data model yet" copy="The first product plan identifies the entities this project needs."/>}</div></div>;
    if (section === "integrations") return <div><IntegrationConnect projectId={projectId} onDone={load}/><div className="project-grid">{["Firebase","PostgreSQL","Google","WhatsApp","Email","GitHub","Hostinger","Custom API"].map((name) => { const connected = project.integrations.find((item) => item.provider.toLowerCase() === name.toLowerCase().replace(" ","-")); return <article className="project-card" key={name}><span className={`status-pill ${connected?.status === "CONNECTED" ? "ready" : ""}`}>{connected?.status.toLowerCase() ?? "not connected"}</span><h3>{name}</h3><p>Credentials are encrypted server-side and never returned after connection.</p><div className="project-meta"><span>{connected ? "Configured" : "Ready to configure"}</span></div></article>; })}</div></div>;
    if (section === "automations") return <div><AutomationCreate projectId={projectId} onDone={load}/>{project.automations.length ? <div className="project-grid">{project.automations.map((automation) => <article className="project-card" key={automation.id}><span className="status-pill ready">{automation.status}</span><h3>{automation.name}</h3><p>Versioned trigger and action workflow.</p></article>)}</div> : <Empty icon={Workflow} title="Describe an automation" copy="For example: when a lead arrives, save it, email the team, send WhatsApp, and schedule a follow-up." action={<button className="button violet" onClick={() => { setPrompt("When someone submits the contact form, save the lead, email me, send a WhatsApp notification, and schedule a follow-up."); }}>Draft with PURPO</button>}/>}</div>;
    if (section === "deploy") return <div><DeployCreate projectId={projectId} onDone={load}/>{project.deployments.length ? <div className="project-grid">{project.deployments.map((deployment) => <article className="project-card" key={deployment.id}><span className={`status-pill ${deployment.status.toLowerCase()}`}>{deployment.status}</span><h3>{deployment.environment}</h3><p>{deployment.domain ?? "Domain not assigned"}</p></article>)}</div> : <Empty icon={Rocket} title="Deploy your project" copy="Connect Hostinger, configure required server secrets, then PURPO will build, validate, upload, start, and health-check this version."/>}</div>;
    if (section === "analytics") return <div className="metrics"><div className="metric"><span>Builds</span><strong>{project.builds.length}</strong></div><div className="metric"><span>Files</span><strong>{project.files.length}</strong></div><div className="metric"><span>Assets</span><strong>{project.assets.length}</strong></div><div className="metric"><span>Deployments</span><strong>{project.deployments.length}</strong></div></div>;
    if (section === "versions") return <div><div style={{display:"flex",justifyContent:"flex-end",marginBottom:12}}><a className="button ghost" href={`/api/projects/${projectId}/export`}>Download handoff ZIP</a></div>{project.versions.length ? <div className="content-card">{project.versions.map((version) => <div className="content-card-head" key={version.id}><div><h3>Version {version.number}</h3><small>{version.label}</small></div><small>{new Date(version.createdAt).toLocaleString()}</small></div>)}</div> : <Empty icon={History} title="No checkpoints yet" copy="Every meaningful completed build creates an immutable project version."/>}</div>;
    if (section === "overview") return <div><div className="content-card"><div className="content-card-head"><h3>Product intelligence</h3><span className={`status-pill ${project.status.toLowerCase()}`}>{project.status}</span></div><div className="page-pad"><h2 style={{marginTop:0}}>{spec?.summary ?? project.objective}</h2><p style={{color:"var(--muted)",lineHeight:1.7}}>{project.objective}</p></div></div><div className="page-title" style={{marginTop:32}}><div><h2 style={{fontSize:28}}>Ideas for your project</h2><p>Useful next moves derived from this product—not generic templates.</p></div></div><div className="idea-grid">{suggestions.map((idea) => <button className="idea-card" onClick={() => void sendBuild(idea.command)} key={idea.title}><strong>{idea.title}</strong><span>{idea.reason}</span></button>)}{!suggestions.length && <button className="idea-card" onClick={() => setPrompt("Make this product more complete and identify the most valuable missing capability.")}><strong>Make this better</strong><span>Analyze UX, conversion, mobile, accessibility, performance, and missing functionality.</span></button>}</div></div>;
    return <div><div className="content-card"><div className="content-card-head"><h3>Build execution</h3><span className={`status-pill ${activeBuild?.status.toLowerCase() ?? ""}`}>{activeBuild?.status ?? "No build"}</span></div><div className="page-pad">{activeBuild?.stages.map((item) => <div className="activity-card" key={item.id}><div className="activity-row"><span className="activity-icon"><StageIcon status={item.status}/></span><div className="activity-copy"><strong>{item.name.charAt(0) + item.name.slice(1).toLowerCase()}</strong><p>{item.summary ?? (item.status === "PENDING" ? "Pending" : "Working…")}</p></div></div></div>)}{activeBuild?.errorMessage && <div className="form-error">{activeBuild.errorMessage}</div>}{!activeBuild && <Empty icon={Sparkles} title="Ready for your first instruction" copy="Describe the outcome and PURPO will create a recoverable, versioned build."/>}</div></div></div>;
  })();

  return <div className="app-shell"><aside className="sidebar"><Link href="/workspace"><Logo/></Link><span className="side-label">{project?.name ?? initialName}</span>{sections.map(([key,label,Icon]) => <Link key={key} href={`/workspace/${projectId}/${key}`} className={`side-link ${section === key ? "active" : ""}`}><Icon size={15}/>{label}</Link>)}</aside><main className="app-main"><header className="app-topbar"><h1>{project?.name ?? initialName}</h1><span className="credit-pill">{credits.toLocaleString()} credits</span></header>{error && <div className="form-error" style={{margin:16}}>{error}</div>}<div className="studio"><section className="studio-main"><div className="studio-toolbar">{sections.map(([key,label]) => <Link key={key} className={`tool-tab ${section === key ? "active" : ""}`} href={`/workspace/${projectId}/${key}`}>{label}</Link>)}</div><div className="canvas">{content}</div></section><aside className="studio-panel"><div className="panel-head"><h3>Build with PURPO</h3><p>{activeBuild ? `${activeBuild.status.toLowerCase()} · est. ${activeBuild.estimatedCredits} credits` : "Project-aware product agent"}</p></div><div className="activity">{activeBuild ? <>{activeBuild.stages.map((item) => <div className="activity-card" key={item.id}><div className="activity-row"><span className="activity-icon"><StageIcon status={item.status}/></span><div className="activity-copy"><strong>{item.name}</strong><p>{item.summary ?? "Waiting"}</p></div></div></div>)}</> : <p style={{color:"var(--muted)",fontSize:12,lineHeight:1.6}}>Ask for a change, feature, integration, asset, automation, improvement, or deployment. PURPO carries the current project context forward.</p>}</div><div className="prompt-box"><textarea aria-label="Build instruction" placeholder="Add customer login and an account area…" value={prompt} onChange={(e) => setPrompt(e.target.value)}/><div className="prompt-actions"><small>{prompt.length}/8000</small><button aria-label="Send build instruction" className="button violet" disabled={sending || prompt.trim().length < 3} onClick={() => void sendBuild()}>{sending ? <Loader2 size={15}/> : <Send size={15}/>}</button></div></div></aside></div></main></div>;
}
