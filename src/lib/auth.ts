import argon2 from "argon2";
import { cookies, headers } from "next/headers";
import { db } from "./db";
import { HttpError } from "./http";
import { randomToken, sha256 } from "./security";

const COOKIE_NAME = "purpo_session";
const SESSION_DAYS = 30;

export async function hashPassword(password: string) {
  return argon2.hash(password, { type: argon2.argon2id, memoryCost: 19456, timeCost: 2, parallelism: 1 });
}

export async function verifyPassword(hash: string, password: string) {
  return argon2.verify(hash, password);
}

export async function createSession(userId: string) {
  const token = randomToken(32);
  const requestHeaders = await headers();
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86400000);
  await db.session.create({ data: { userId, tokenHash: sha256(token), expiresAt, userAgent: requestHeaders.get("user-agent")?.slice(0, 500), ipHash: requestHeaders.get("x-forwarded-for") ? sha256(requestHeaders.get("x-forwarded-for")!.split(",")[0].trim()) : null } });
  (await cookies()).set(COOKIE_NAME, token, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", expires: expiresAt });
}

export async function deleteSession() {
  const jar = await cookies();
  const token = jar.get(COOKIE_NAME)?.value;
  if (token) await db.session.updateMany({ where: { tokenHash: sha256(token), revokedAt: null }, data: { revokedAt: new Date() } });
  jar.delete(COOKIE_NAME);
}

export async function currentUser() {
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  if (!token) return null;
  const session = await db.session.findUnique({ where: { tokenHash: sha256(token) }, include: { user: true } });
  if (!session || session.revokedAt || session.expiresAt <= new Date() || session.user.disabledAt) return null;
  return session.user;
}

export async function requireUser() {
  const user = await currentUser();
  if (!user) throw new HttpError(401, "Sign in to continue.", "AUTH_REQUIRED");
  return user;
}

export async function requireAdmin() {
  const user = await requireUser();
  if (user.role !== "ADMIN" && user.role !== "SUPPORT") throw new HttpError(403, "Administrator access is required.", "ADMIN_REQUIRED");
  return user;
}

export async function requireProject(projectId: string, write = false) {
  const user = await requireUser();
  const project = await db.project.findFirst({
    where: { id: projectId, OR: [{ members: { some: { userId: user.id, ...(write ? { role: { in: ["OWNER", "ADMIN", "EDITOR"] } } : {}) } } }, { organization: { members: { some: { userId: user.id, ...(write ? { role: { in: ["OWNER", "ADMIN", "EDITOR"] } } : {}) } } } }] }
  });
  if (!project) throw new HttpError(404, "Project not found or you do not have access.", "PROJECT_NOT_FOUND");
  return { user, project };
}
