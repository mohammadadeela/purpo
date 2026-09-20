"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

const examples = ["Build a premium fashion store", "Create a SaaS dashboard", "Build an app for my restaurant", "Create a property platform and launch video"];

export function HomeIdea() {
  const router = useRouter();
  const [idea, setIdea] = useState("");
  function start() {
    if (idea.trim().length < 12) return;
    sessionStorage.setItem("purpo:first-idea", idea.trim());
    router.push("/signup");
  }
  return <><div className="idea-box"><textarea aria-label="Describe what you want to build" value={idea} onChange={(event) => setIdea(event.target.value)} placeholder="I want to build…" onKeyDown={(event) => { if ((event.metaKey || event.ctrlKey) && event.key === "Enter") start(); }} /><button className="button violet" onClick={start} disabled={idea.trim().length < 12}>Start building <span aria-hidden>→</span></button></div><div className="suggestion-row">{examples.map((example) => <button className="suggestion" key={example} onClick={() => setIdea(example)}>{example}</button>)}</div></>;
}
