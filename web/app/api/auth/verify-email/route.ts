import { NextRequest } from "next/server";
import { authService } from "@/lib/auth/authService";
import { authErrorResponse } from "@/lib/auth/errorResponse";

export async function GET(req: NextRequest) {
  try {
    const token = req.nextUrl.searchParams.get("token");
    if (!token) {
      return Response.json(
        { code: "VERIFICATION_TOKEN_INVALID", message: "Verification token is required." },
        { status: 400 }
      );
    }
    await authService.verifyEmail(token);
    return Response.json({ message: "Email verified successfully", verified: true });
  } catch (error) {
    return authErrorResponse(error);
  }
}
