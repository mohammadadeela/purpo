import { deleteSession } from "@/lib/auth";
import { enforceSameOrigin, jsonError } from "@/lib/http";

export async function POST(request: Request) {
  try { enforceSameOrigin(request); await deleteSession(); return Response.json({ ok: true }); }
  catch (error) { return jsonError(error); }
}
