import { ZodError } from "zod";

export class HttpError extends Error {
  constructor(public status: number, message: string, public code = "REQUEST_FAILED", public details?: unknown) { super(message); }
}

export function jsonError(error: unknown) {
  if (error instanceof HttpError) return Response.json({ error: { code: error.code, message: error.message, details: error.details } }, { status: error.status });
  if (error instanceof ZodError) return Response.json({ error: { code: "VALIDATION_FAILED", message: "Some submitted fields are invalid.", details: error.flatten() } }, { status: 422 });
  console.error(error);
  return Response.json({ error: { code: "INTERNAL_ERROR", message: "The request could not be completed. No billable work was started." } }, { status: 500 });
}

export function enforceSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  if (!origin || !host) return;
  if (new URL(origin).host !== host) throw new HttpError(403, "This request did not come from PURPO.", "ORIGIN_REJECTED");
}
