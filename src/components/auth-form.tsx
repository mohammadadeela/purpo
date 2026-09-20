"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError("");
    const form = new FormData(event.currentTarget);
    const payload = Object.fromEntries(form.entries());
    const response = await fetch(`/api/auth/${mode === "login" ? "login" : "register"}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
    const result = await response.json();
    if (!response.ok) { setError(result.error?.message ?? "Your request could not be completed."); setBusy(false); return; }
    router.push(result.redirect); router.refresh();
  }
  return <form onSubmit={submit}>{error && <div className="form-error" role="alert">{error}</div>}{mode === "register" && <div className="field"><label htmlFor="name">Name</label><input id="name" name="name" autoComplete="name" required minLength={2}/></div>}<div className="field"><label htmlFor="email">Email</label><input id="email" name="email" type="email" autoComplete="email" required/></div><div className="field"><label htmlFor="password">Password</label><input id="password" name="password" type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} required minLength={mode === "register" ? 10 : 1}/></div><button className="button violet" style={{width:"100%"}} disabled={busy}>{busy ? "Working…" : mode === "login" ? "Sign in" : "Create my workspace"}</button><p className="form-note">{mode === "login" ? <>New to PURPO? <Link href="/signup">Create an account</Link></> : <>Already have an account? <Link href="/login">Sign in</Link></>}</p></form>;
}
