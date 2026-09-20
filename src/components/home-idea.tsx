"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowUp, ImagePlus, SlidersHorizontal } from "lucide-react";

const examples = [
  "A portfolio that feels like me",
  "A dashboard for my business",
  "An app for my next big idea"
];
const types = ["Website", "Web app", "Mobile app", "Image", "Video"] as const;

export function HomeIdea() {
  const router = useRouter();
  const [idea, setIdea] = useState("");
  const [type, setType] = useState<(typeof types)[number]>("Web app");

  function start(nextIdea = idea) {
    const value = nextIdea.trim();
    if (value.length < 8) return;
    sessionStorage.setItem("purpo:first-idea", `Create a ${type.toLowerCase()}: ${value}`);
    router.push("/signup");
  }

  return <div className="prototype-create-wrap">
    <div className="prototype-prompt-card">
      <textarea
        aria-label="Describe what you want to create"
        value={idea}
        onChange={(event) => setIdea(event.target.value)}
        placeholder="Describe your project"
        onKeyDown={(event) => {
          if ((event.metaKey || event.ctrlKey) && event.key === "Enter") start();
        }}
      />
      <div className="prototype-prompt-toolbar">
        <button type="button" className="prototype-chip"><ImagePlus size={14}/> Attach reference</button>
        <button type="button" className="prototype-chip active"><SlidersHorizontal size={13}/> Balanced</button>
        <button type="button" className="prototype-submit" aria-label="Create project" disabled={idea.trim().length < 8} onClick={() => start()}><ArrowUp size={16}/></button>
      </div>
    </div>

    <div className="prototype-mode-row" aria-label="Project type">
      {types.map((item) => <button type="button" key={item} className={`prototype-mode ${type === item ? "active" : ""}`} onClick={() => setType(item)}>{item}</button>)}
    </div>

    <div className="prototype-or-try">Or try</div>
    <div className="prototype-suggestion-row">
      {examples.map((example) => <button type="button" key={example} onClick={() => { setIdea(example); start(example); }}>{example}</button>)}
    </div>
  </div>;
}
