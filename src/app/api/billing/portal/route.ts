import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { stripeClient } from "@/lib/billing";
import { env } from "@/lib/env";
import { enforceSameOrigin, HttpError, jsonError } from "@/lib/http";

export async function POST(request: Request) {
  try {
    enforceSameOrigin(request);
    const user = await requireUser();
    const subscription = await db.subscription.findFirst({ where: { userId: user.id, provider: "stripe" }, orderBy: { createdAt: "desc" } });
    if (!subscription) throw new HttpError(404, "No billing account exists yet.", "BILLING_ACCOUNT_NOT_FOUND");
    const session = await stripeClient().billingPortal.sessions.create({ customer: subscription.providerCustomerId, return_url: `${env().APP_URL}/settings/billing` });
    return Response.json({ url: session.url });
  } catch (error) { return jsonError(error); }
}
