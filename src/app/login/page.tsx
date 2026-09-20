import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { Logo } from "@/components/logo";
import { AuthForm } from "@/components/auth-form";

export default async function LoginPage() {
  if (await currentUser()) redirect("/workspace");
  return <main className="auth-shell"><section className="auth-visual"><Logo/><h2 className="auth-quote">Your project remembers where you left it.</h2><small>PRODUCT INTELLIGENCE · VERSIONED BUILDS · REAL PREVIEWS</small></section><section className="auth-panel"><div className="form-card"><h1>Welcome back.</h1><p>Continue building, testing, and shipping your product.</p><AuthForm mode="login"/></div></section></main>;
}
