import Stripe from "stripe";
import { env } from "./env";
import { HttpError } from "./http";

export function stripeClient() {
  const key = env().STRIPE_SECRET_KEY;
  if (!key) throw new HttpError(503, "Billing is not configured yet. Add STRIPE_SECRET_KEY on the server.", "BILLING_NOT_CONFIGURED");
  return new Stripe(key);
}
