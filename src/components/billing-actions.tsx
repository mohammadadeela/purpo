"use client";
import { useState } from "react";

export function BillingActions({ hasSubscription }: { hasSubscription: boolean }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function open(path: string, body?: unknown) {
    setBusy(true); setError("");
    const response = await fetch(path, { method: "POST", headers: { "content-type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
    const result = await response.json();
    if (!response.ok) { setError(result.error?.message ?? "Billing could not be opened."); setBusy(false); return; }
    window.location.assign(result.url);
  }
  return <div>{error && <div className="form-error">{error}</div>}<button className="button violet" disabled={busy} onClick={() => void open(hasSubscription ? "/api/billing/portal" : "/api/billing/checkout", hasSubscription ? undefined : { plan: "pro", interval: "monthly" })}>{busy ? "Opening secure billing…" : hasSubscription ? "Manage payment and renewal" : "Upgrade to Pro"}</button></div>;
}
