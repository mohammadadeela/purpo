import { Prisma, type CreditKind } from "@prisma/client";
import { db } from "./db";
import { HttpError } from "./http";

export function estimateCredits(task: "build" | "image" | "video" | "deploy" | "analysis", units = 1) {
  const rates = { build: 35, image: 18, video: 120, deploy: 8, analysis: 6 };
  return Math.max(1, Math.ceil(rates[task] * units));
}

export async function reserveCredits(userId: string, amount: number, idempotencyKey: string, buildId?: string, deploymentId?: string, jobId?: string) {
  if (!Number.isSafeInteger(amount) || amount <= 0) throw new HttpError(422, "Credit amount must be a positive integer.", "INVALID_CREDIT_AMOUNT");
  return db.$transaction(async (tx) => {
    const existing = await tx.creditTransaction.findUnique({ where: { idempotencyKey } });
    if (existing) return tx.creditReservation.findFirstOrThrow({ where: { walletId: existing.walletId, buildId, deploymentId, jobId } });
    const wallet = await tx.creditWallet.findUnique({ where: { userId } });
    if (!wallet || wallet.balance - wallet.reserved < amount) throw new HttpError(402, "You've reached your available credits. Buy more credits or upgrade your plan to continue.", "INSUFFICIENT_CREDITS");
    const updated = await tx.creditWallet.update({ where: { id: wallet.id, version: wallet.version }, data: { reserved: { increment: amount }, version: { increment: 1 } } });
    const reservation = await tx.creditReservation.create({ data: { walletId: wallet.id, buildId, deploymentId, jobId, amount, expiresAt: new Date(Date.now() + 3600000) } });
    await tx.creditTransaction.create({ data: { walletId: wallet.id, kind: "RESERVE", amount: -amount, balanceAfter: updated.balance, referenceType: "reservation", referenceId: reservation.id, idempotencyKey } });
    return reservation;
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

export async function settleReservation(reservationId: string, spent: number, idempotencyKey: string) {
  return db.$transaction(async (tx) => {
    const existing = await tx.creditTransaction.findUnique({ where: { idempotencyKey } });
    if (existing) return existing;
    const reservation = await tx.creditReservation.findUnique({ where: { id: reservationId }, include: { wallet: true } });
    if (!reservation || reservation.status !== "reserved") throw new HttpError(409, "This credit reservation is no longer active.", "RESERVATION_CLOSED");
    const charge = Math.min(Math.max(0, spent), reservation.amount);
    const wallet = await tx.creditWallet.update({ where: { id: reservation.walletId }, data: { balance: { decrement: charge }, reserved: { decrement: reservation.amount }, version: { increment: 1 } } });
    await tx.creditReservation.update({ where: { id: reservation.id }, data: { spent: charge, status: charge ? "spent" : "released" } });
    return tx.creditTransaction.create({ data: { walletId: wallet.id, kind: (charge ? "SPEND" : "RELEASE") as CreditKind, amount: -charge, balanceAfter: wallet.balance, referenceType: "reservation", referenceId: reservation.id, idempotencyKey } });
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}
