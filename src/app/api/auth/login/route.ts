import { z } from "zod";
import { db } from "@/lib/db";
import { createSession, verifyPassword } from "@/lib/auth";
import { enforceSameOrigin, jsonError } from "@/lib/http";
import { rateLimit } from "@/lib/rate-limit";

const schema = z.object({ email: z.email().transform((value) => value.toLowerCase()), password: z.string().min(1).max(200) });

export async function POST(request: Request) {
  try {
    enforceSameOrigin(request);
    const input = schema.parse(await request.json());
    await rateLimit(`login:${input.email}`, 10, 900);
    const user = await db.user.findUnique({ where: { email: input.email } });
    if (!user?.passwordHash || !(await verifyPassword(user.passwordHash, input.password)) || user.disabledAt) return Response.json({ error: { code: "INVALID_LOGIN", message: "The email or password is incorrect." } }, { status: 401 });
    await createSession(user.id);
    return Response.json({ user: { id: user.id, name: user.name, email: user.email }, redirect: "/workspace" });
  } catch (error) { return jsonError(error); }
}
