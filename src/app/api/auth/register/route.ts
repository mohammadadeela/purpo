import { z } from "zod";
import { db } from "@/lib/db";
import { createSession, hashPassword } from "@/lib/auth";
import { enforceSameOrigin, jsonError } from "@/lib/http";
import { rateLimit } from "@/lib/rate-limit";
import { nanoid } from "nanoid";

const inputSchema = z.object({ name: z.string().trim().min(2).max(80), email: z.email().transform((value) => value.toLowerCase()), password: z.string().min(10).max(200) });

export async function POST(request: Request) {
  try {
    enforceSameOrigin(request);
    const input = inputSchema.parse(await request.json());
    await rateLimit(`register:${input.email}`, 5, 3600);
    const existing = await db.user.findUnique({ where: { email: input.email } });
    if (existing) return Response.json({ error: { code: "EMAIL_EXISTS", message: "An account already uses this email. Sign in instead." } }, { status: 409 });
    const passwordHash = await hashPassword(input.password);
    const user = await db.$transaction(async (tx) => {
      const created = await tx.user.create({ data: { name: input.name, email: input.email, passwordHash, role: process.env.ADMIN_EMAIL === input.email ? "ADMIN" : "USER" } });
      const organization = await tx.organization.create({ data: { name: `${input.name}'s workspace`, slug: `${input.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}-${nanoid(6)}`, members: { create: { userId: created.id, role: "OWNER" } } } });
      await tx.creditWallet.create({ data: { userId: created.id, balance: 40, transactions: { create: { kind: "GRANT", amount: 40, balanceAfter: 40, idempotencyKey: `signup:${created.id}`, referenceType: "signup" } } } });
      await tx.auditLog.create({ data: { actorId: created.id, action: "account.created", targetType: "organization", targetId: organization.id } });
      return created;
    });
    await createSession(user.id);
    return Response.json({ user: { id: user.id, name: user.name, email: user.email }, redirect: "/onboarding" }, { status: 201 });
  } catch (error) { return jsonError(error); }
}
