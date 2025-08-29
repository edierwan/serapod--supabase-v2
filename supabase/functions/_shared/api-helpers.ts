import { ulid } from "https://deno.land/x/ulid@v0.3.0/mod.ts";

export type ApiErrorCode =
  | "VALIDATION_ERROR"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "PRECONDITION_FAILED"
  | "INTERNAL_ERROR"
  | "IDEMPOTENT_REPLAY";

export function createSuccessResponse(
  data: unknown,
  status: number = 200,
): Response {
  const body = {
    ok: true,
    data,
    request_id: `req_${ulid()}`,
  };
  return new Response(JSON.stringify(body), {
    status: status,
    headers: { "Content-Type": "application/json" },
  });
}

export function createErrorResponse(
  message: string,
  code: ApiErrorCode,
  status: number,
): Response {
  const body = {
    ok: false,
    error: {
      code: code,
      message: message,
    },
    request_id: `req_${ulid()}`,
  };
  return new Response(JSON.stringify(body), {
    status: status,
    headers: { "Content-Type": "application/json" },
  });
}
