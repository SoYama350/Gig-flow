import { redirect } from "next/navigation";
import { getAuthState } from "@/lib/auth/serverAuth";

/**
 * Auth (guest) shell — centered card layout for login/register/etc.
 * Redirects already-authenticated users away to the dashboard.
 */
export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated } = await getAuthState();

  if (isAuthenticated) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-dark-950 p-4">
      <div className="mesh-gradient" />
      {children}
    </div>
  );
}
