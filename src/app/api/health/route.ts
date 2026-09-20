import { db } from "@/lib/db";

export const dynamic = "force-dynamic";
export async function GET() {
  const started = Date.now();
  try { await db.$queryRaw`SELECT 1`; return Response.json({ status: "ok", database: "connected", latencyMs: Date.now() - started, time: new Date().toISOString() }); }
  catch { return Response.json({ status: "degraded", database: "unavailable", time: new Date().toISOString() }, { status: 503 }); }
}
