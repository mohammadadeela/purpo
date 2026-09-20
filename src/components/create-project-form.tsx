"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export function CreateProjectForm() {
  const router = useRouter();
  const [objective, setObjective] = useState(() => typeof window === "undefined" ? "" : sessionStorage.getItem("purpo:first-idea") ?? "");
  const [name, setName] = useState("");
  const [purpose, setPurpose] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setError("");
    const response = await fetch("/api/projects", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name, objective, purpose }) });
    const result = await response.json();
    if (!response.ok) { setError(result.error?.message ?? "The project could not be created."); setBusy(false); return; }
    sessionStorage.removeItem("purpo:first-idea"); router.push(result.redirect);
  }
  return <form onSubmit={submit}>{error && <div className="form-error" role="alert">{error}</div>}<div className="field"><label htmlFor="project-name">Project name</label><input id="project-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Maison" required minLength={2}/></div><div className="field"><label htmlFor="purpose">Purpose</label><input id="purpose" value={purpose} onChange={(e) => setPurpose(e.target.value)} placeholder="Launch a business, test an idea, build for a client…"/></div><div className="field"><label htmlFor="objective">What are you building?</label><textarea id="objective" value={objective} onChange={(e) => setObjective(e.target.value)} placeholder="Build a premium property marketplace with agent dashboards, visit booking, WhatsApp leads, and interior redesign tools." required minLength={12}/></div><button className="button violet" style={{width:"100%"}} disabled={busy}>{busy ? "Preparing your studio…" : "Create project and start build"}</button><p className="form-note">Estimated initial build: 35 credits. Credits are reserved before work starts and unused credits are released.</p></form>;
}
