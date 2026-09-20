"use client";
import { useRouter } from "next/navigation";
export function LogoutButton() { const router = useRouter(); return <button className="side-link" onClick={async () => { await fetch("/api/auth/logout", { method: "POST" }); router.push("/"); router.refresh(); }}>Sign out</button>; }
