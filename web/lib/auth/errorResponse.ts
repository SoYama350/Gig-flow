import { AUTH_ERROR_CODES } from "@/src/features/auth/types/auth.errors";

/**
 * Maps an auth service error (which carries a `.code` property) into an
 * appropriate HTTP status and JSON body.
 */
export function authErrorResponse(error: unknown): Response {
  const err = error as { code?: string; message?: string };
  const code = err?.code ?? "UNKNOWN_ERROR";
  const message = err?.message ?? "An error occurred";

  let status = 500;
  switch (code) {
    case AUTH_ERROR_CODES.INVALID_CREDENTIALS:
    case AUTH_ERROR_CODES.REFRESH_TOKEN_INVALID:
    case AUTH_ERROR_CODES.VERIFICATION_TOKEN_INVALID:
    case AUTH_ERROR_CODES.RESET_TOKEN_INVALID:
      status = 401;
      break;
    case AUTH_ERROR_CODES.EMAIL_ALREADY_EXISTS:
      status = 409;
      break;
    case AUTH_ERROR_CODES.TOO_MANY_ATTEMPTS:
      status = 429;
      break;
    case AUTH_ERROR_CODES.OAUTH_FAILED:
      status = 400;
      break;
    default:
      status = 500;
  }

  return Response.json({ code, message }, { status });
}
