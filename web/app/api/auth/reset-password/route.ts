import { NextRequest } from "next/server";
import { authService } from "@/lib/auth/authService";
import { authErrorResponse } from "@/lib/auth/errorResponse";

export async function POST(req: NextRequest) {
  try {
    const { token, newPassword } = await req.json();
    await authService.resetPassword(token, newPassword);
    return Response.json({ message: "Password reset successful. You can now log in." });
  } catch (error) {
    return authErrorResponse(error);
  }
}
