import { redirect } from "next/navigation";
import { getAuthState } from "@/lib/auth/serverAuth";
import { Sidebar } from "@/app/_components/Sidebar";

const isStaticExport = process.env.GITHUB_PAGES === "true";

/**
 * App shell — sidebar + main content area for all authenticated screens.
 * Redirects unauthenticated users to the login page.
 *
 * In static-export (GitHub Pages) mode there is no server runtime, so the
 * auth guard is skipped and the shell renders directly as a UI demo.
 */
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (isStaticExport) {
    return (
      <div className="flex h-screen w-full overflow-hidden font-sans">
        <div className="mesh-gradient" />
        <Sidebar activePath="" />
        <main className="flex-1 overflow-auto min-w-0">{children}</main>
      </div>
    );
  }

  const { isAuthenticated, user } = await getAuthState();

  if (!isAuthenticated) {
    redirect("/login");
  }

  return (
    <div className="flex h-screen w-full overflow-hidden font-sans">
      <div className="mesh-gradient" />
      <Sidebar activePath="" userName={user?.name ?? undefined} />
      <main className="flex-1 overflow-auto min-w-0">{children}</main>
    </div>
  );
}
