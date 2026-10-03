import { authService } from "@/lib/auth/authService";
import { requireAuth } from "@/lib/auth/requireAuth";
import { authErrorResponse } from "@/lib/auth/errorResponse";

export async function POST() {
  const auth = await requireAuth();
  if (auth.response) return auth.response;

  try {
    await authService.resendVerification(auth.user!.id);
    return Response.json({ message: "Verification email sent" });
  } catch (error) {
    return authErrorResponse(error);
  }
}
