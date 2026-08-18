import { redirect } from "next/navigation";
import { getAuthState } from "@/lib/auth/serverAuth";

const isStaticExport = process.env.GITHUB_PAGES === "true";

/**
 * Auth (guest) shell — centered card layout for login/register/etc.
 * Redirects already-authenticated users away to the dashboard.
 *
 * In static-export (GitHub Pages) mode there is no server runtime, so the
 * redirect is skipped and the auth form renders directly as a UI demo.
 */
export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!isStaticExport) {
    const { isAuthenticated } = await getAuthState();
    if (isAuthenticated) {
      redirect("/dashboard");
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-dark-950 p-4">
      <div className="mesh-gradient" />
      {children}
    </div>
  );
}
