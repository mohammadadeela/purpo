import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { Logo } from "@/components/logo";
import { CreateProjectForm } from "@/components/create-project-form";

export default async function OnboardingPage() {
  try { await requireUser(); } catch { redirect("/login"); }
  return <main className="auth-shell"><section className="auth-visual"><Logo/><h2 className="auth-quote">Tell us the outcome. We’ll map the product.</h2><small>NO TECHNICAL SETUP REQUIRED</small></section><section className="auth-panel"><div className="form-card"><h1>First project.</h1><p>Keep it natural. PURPO will identify pages, roles, data, integrations, risks, and the design direction.</p><CreateProjectForm/></div></section></main>;
}
