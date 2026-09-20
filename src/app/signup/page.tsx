import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { Logo } from "@/components/logo";
import { AuthForm } from "@/components/auth-form";

export default async function SignupPage() {
  if (await currentUser()) redirect("/onboarding");
  return <main className="auth-shell"><section className="auth-visual"><Logo/><h2 className="auth-quote">Start with an outcome. Leave with a product.</h2><small>40 STARTER CREDITS · PRIVATE BY DEFAULT · YOUR CODE</small></section><section className="auth-panel"><div className="form-card"><h1>Build your first idea.</h1><p>A name, an outcome, and PURPO starts doing the real work.</p><AuthForm mode="register"/></div></section></main>;
}
