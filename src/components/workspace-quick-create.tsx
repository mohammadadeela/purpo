"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowUp, ImagePlus, SlidersHorizontal } from "lucide-react";

const types = ["Website", "Web app", "Mobile app", "Image", "Video"] as const;

function projectName(input: string) {
  const clean = input.replace(/[^a-zA-Z0-9\s-]/g, " ").replace(/\s+/g, " ").trim();
  const words = clean.split(" ").filter(Boolean).slice(0, 5);
  return (words.join(" ") || "New project").slice(0, 80);
}

export function WorkspaceQuickCreate() {
  const router = useRouter();
  const [idea, setIdea] = useState("");
  const [type, setType] = useState<(typeof types)[number]>("Web app");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function create() {
    const text = idea.trim();
    if (text.length < 12 || busy) return;
    setBusy(true); setError("");
    const objective = `Build a ${type.toLowerCase()} for this outcome: ${text}`;
    const response = await fetch("/api/projects", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: projectName(text), objective, purpose: `Created from Workspace Home · ${type}` })
    });
    const result = await response.json();
    if (!response.ok) {
      setError(result.error?.message ?? "The project could not be created.");
      setBusy(false);
      return;
    }
    router.push(result.redirect);
  }

  return <div className="prototype-create-wrap">
    {error && <div className="form-error" role="alert">{error}</div>}
    <div className="prototype-prompt-card">
      <textarea aria-label="Describe your project" value={idea} onChange={(event) => setIdea(event.target.value)} placeholder="Describe your project" />
      <div className="prototype-prompt-toolbar">
        <button type="button" className="prototype-chip"><ImagePlus size={14}/> Attach reference</button>
        <button type="button" className="prototype-chip active"><SlidersHorizontal size={13}/> Balanced</button>
        <button type="button" className="prototype-submit" aria-label="Create project" disabled={idea.trim().length < 12 || busy} onClick={() => void create()}><ArrowUp size={16}/></button>
      </div>
    </div>
    <div className="prototype-mode-row">{types.map((item) => <button type="button" key={item} className={`prototype-mode ${type === item ? "active" : ""}`} onClick={() => setType(item)}>{item}</button>)}</div>
  </div>;
}
