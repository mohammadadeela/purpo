import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { stripeClient } from "@/lib/billing";
import { env } from "@/lib/env";
import { enforceSameOrigin, HttpError, jsonError } from "@/lib/http";

const schema = z.object({ plan: z.enum(["pro"]), interval: z.enum(["monthly","annual"]) });

export async function POST(request: Request) {
  try {
    enforceSameOrigin(request);
    const user = await requireUser();
    const input = schema.parse(await request.json());
    const plan = await db.plan.findUniqueOrThrow({ where: { key: input.plan } });
    const price = input.interval === "annual" ? env().STRIPE_PRICE_PRO_ANNUAL : env().STRIPE_PRICE_PRO_MONTHLY;
    if (!price) throw new HttpError(503, "This subscription price is not configured.", "PRICE_NOT_CONFIGURED");
    const stripe = stripeClient();
    const prior = await db.subscription.findFirst({ where: { userId: user.id, provider: "stripe" }, orderBy: { createdAt: "desc" } });
    const session = await stripe.checkout.sessions.create({
      mode: "subscription", customer: prior?.providerCustomerId || undefined, customer_email: prior ? undefined : user.email,
      line_items: [{ price, quantity: 1 }], allow_promotion_codes: true, billing_address_collection: "auto", tax_id_collection: { enabled: true },
      success_url: `${env().APP_URL}/settings/billing?success=1`, cancel_url: `${env().APP_URL}/settings/billing?cancelled=1`,
      metadata: { userId: user.id, planId: plan.id, interval: input.interval }, subscription_data: { metadata: { userId: user.id, planId: plan.id, interval: input.interval } }
    }, { idempotencyKey: `checkout:${user.id}:${input.plan}:${input.interval}:${Math.floor(Date.now()/60000)}` });
    return Response.json({ url: session.url });
  } catch (error) { return jsonError(error); }
}
