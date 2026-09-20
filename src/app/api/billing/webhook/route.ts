import type Stripe from "stripe";
import { db } from "@/lib/db";
import { stripeClient } from "@/lib/billing";
import { env } from "@/lib/env";

function subscriptionStatus(value: Stripe.Subscription.Status) {
  const map = { incomplete: "INCOMPLETE", incomplete_expired: "CANCELLED", trialing: "TRIALING", active: "ACTIVE", past_due: "PAST_DUE", canceled: "CANCELLED", unpaid: "UNPAID", paused: "PAUSED" } as const;
  return map[value] ?? "INCOMPLETE";
}

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");
  if (!signature || !env().STRIPE_WEBHOOK_SECRET) return new Response("Webhook signature is not configured.", { status: 400 });
  let event: Stripe.Event;
  try { event = stripeClient().webhooks.constructEvent(await request.text(), signature, env().STRIPE_WEBHOOK_SECRET!); }
  catch { return new Response("Invalid webhook signature.", { status: 400 }); }
  if (event.type === "customer.subscription.created" || event.type === "customer.subscription.updated" || event.type === "customer.subscription.deleted") {
    const subscription = event.data.object as Stripe.Subscription;
    const userId = subscription.metadata.userId;
    const planId = subscription.metadata.planId;
    if (userId && planId) await db.subscription.upsert({ where: { providerSubscriptionId: subscription.id }, create: { userId, planId, provider: "stripe", providerCustomerId: String(subscription.customer), providerSubscriptionId: subscription.id, status: subscriptionStatus(subscription.status), interval: subscription.metadata.interval ?? "monthly", currentPeriodStart: new Date(subscription.items.data[0]?.current_period_start * 1000), currentPeriodEnd: new Date(subscription.items.data[0]?.current_period_end * 1000), cancelAtPeriodEnd: subscription.cancel_at_period_end, cancelledAt: subscription.canceled_at ? new Date(subscription.canceled_at * 1000) : null }, update: { status: subscriptionStatus(subscription.status), currentPeriodStart: new Date(subscription.items.data[0]?.current_period_start * 1000), currentPeriodEnd: new Date(subscription.items.data[0]?.current_period_end * 1000), cancelAtPeriodEnd: subscription.cancel_at_period_end, cancelledAt: subscription.canceled_at ? new Date(subscription.canceled_at * 1000) : null } });
  }
  if (event.type === "invoice.paid" || event.type === "invoice.payment_failed") {
    const invoice = event.data.object as Stripe.Invoice;
    if (!invoice.id) return new Response("Invoice identifier is missing.", { status: 400 });
    const invoiceId: string = invoice.id;
    const customerId = String(invoice.customer);
    const subscription = await db.subscription.findFirst({ where: { providerCustomerId: customerId }, include: { plan: true } });
    if (subscription) {
      await db.invoice.upsert({ where: { providerInvoiceId: invoiceId }, create: { userId: subscription.userId, provider: "stripe", providerInvoiceId: invoiceId, number: invoice.number, status: event.type === "invoice.paid" ? "PAID" : "OPEN", currency: invoice.currency ?? "usd", subtotal: invoice.subtotal, tax: invoice.total_taxes?.reduce((sum, item) => sum + item.amount, 0) ?? 0, total: invoice.total, hostedUrl: invoice.hosted_invoice_url, pdfUrl: invoice.invoice_pdf, paidAt: event.type === "invoice.paid" ? new Date() : null }, update: { status: event.type === "invoice.paid" ? "PAID" : "OPEN", paidAt: event.type === "invoice.paid" ? new Date() : null } });
      if (event.type === "invoice.paid") await db.$transaction(async (tx) => {
        const key = `stripe:invoice:${invoiceId}:credits`;
        if (await tx.creditTransaction.findUnique({ where: { idempotencyKey: key } })) return;
        const wallet = await tx.creditWallet.update({ where: { userId: subscription.userId }, data: { balance: { increment: subscription.plan.monthlyCredits }, version: { increment: 1 } } });
        await tx.creditTransaction.create({ data: { walletId: wallet.id, kind: "PURCHASE", amount: subscription.plan.monthlyCredits, balanceAfter: wallet.balance, referenceType: "invoice", referenceId: invoiceId, idempotencyKey: key } });
      });
    }
  }
  return Response.json({ received: true });
}
