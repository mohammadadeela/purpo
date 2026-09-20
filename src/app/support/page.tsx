import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { AppFrame } from "@/components/app-frame";
import { SupportForm } from "@/components/support-form";

export default async function SupportPage(){let user;try{user=await requireUser()}catch{redirect("/login")}const wallet=await db.creditWallet.findUnique({where:{userId:user.id}});return <AppFrame title="Support" credits={(wallet?.balance??0)-(wallet?.reserved??0)} admin={user.role!=="USER"}><div className="page-pad"><div className="page-title"><div><h2>Project support</h2><p>Report a problem with enough safe context to diagnose it. Secret values are never attached.</p></div></div><SupportForm/></div></AppFrame>}
