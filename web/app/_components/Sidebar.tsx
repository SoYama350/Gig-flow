"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Search,
  Briefcase,
  User,
  BarChart3,
  Zap,
  Settings,
  LineChart,
  Moon,
  Sun,
  LogOut,
} from "lucide-react";
import { useState, useEffect } from "react";

interface SidebarProps {
  activePath: string;
  userName?: string;
}

const tabs = [
  { href: "/dashboard", icon: BarChart3, label: "Dashboard" },
  { href: "/gigs", icon: Search, label: "Gigs Feed" },
  { href: "/analytics", icon: LineChart, label: "Analytics" },
  { href: "/profile", icon: User, label: "Profile" },
  { href: "/settings", icon: Settings, label: "Settings" },
];

export function Sidebar({ userName }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const initial = userName ? userName[0].toUpperCase() : "GF";
  const [isLightMode, setIsLightMode] = useState(false);

  useEffect(() => {
    if (localStorage.getItem("theme") === "light") {
      setIsLightMode(true);
      document.body.classList.add("light");
    }
  }, []);

  const toggleTheme = () => {
    if (isLightMode) {
      document.body.classList.remove("light");
      localStorage.setItem("theme", "dark");
    } else {
      document.body.classList.add("light");
      localStorage.setItem("theme", "light");
    }
    setIsLightMode(!isLightMode);
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // ignore network failures — clear locally regardless
    } finally {
      router.push("/login");
    }
  };

  return (
    <>
      {/* ── Desktop sidebar ──────────────────────────────── */}
      <aside className="hidden md:flex w-[72px] bg-dark-900 flex-col items-center py-6 border-r border-white/5 shrink-0">
        <Link
          href="/dashboard"
          className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent-500 to-cyan-500 flex items-center justify-center mb-10 glow-accent hover:scale-105 transition-transform"
        >
          <Zap size={20} className="text-white" />
        </Link>

        <nav className="flex flex-col gap-2 flex-1">
          {tabs.map((tab) => {
            const isActive = pathname === tab.href || pathname.startsWith(`${tab.href}/`);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`tooltip-wrapper w-11 h-11 rounded-xl flex items-center justify-center transition-all duration-200 ${
                  isActive
                    ? "bg-accent-500/15 text-accent-400 glow-accent"
                    : "text-slate-500 hover:text-slate-300 hover:bg-white/5"
                }`}
                data-tooltip={tab.label}
              >
                <tab.icon size={20} />
              </Link>
            );
          })}
        </nav>

        <div className="flex flex-col gap-2 mt-auto mb-2">
          <button
            onClick={toggleTheme}
            className="tooltip-wrapper w-11 h-11 rounded-xl flex items-center justify-center text-slate-500 hover:text-slate-300 hover:bg-white/5 transition-all duration-200"
            data-tooltip={isLightMode ? "Dark Mode" : "Light Mode"}
          >
            {isLightMode ? <Moon size={18} /> : <Sun size={18} />}
          </button>

          <button
            onClick={handleLogout}
            className="tooltip-wrapper w-11 h-11 rounded-xl flex items-center justify-center text-rose-500 hover:text-rose-400 hover:bg-rose-500/10 transition-all duration-200"
            data-tooltip="Logout"
          >
            <LogOut size={18} />
          </button>
        </div>

        <Link
          href="/profile"
          className="w-9 h-9 rounded-full bg-gradient-to-br from-accent-600 to-cyan-600 flex items-center justify-center text-white text-xs font-bold hover:scale-105 transition-transform"
        >
          {initial}
        </Link>
      </aside>

      {/* ── Mobile bottom nav ─────────────────────────────── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-dark-900/95 backdrop-blur-xl border-t border-white/6 flex items-center justify-around px-2 py-2 safe-bottom">
        {tabs.map((tab) => {
          const isActive = pathname === tab.href || pathname.startsWith(`${tab.href}/`);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all ${
                isActive ? "text-accent-400" : "text-slate-600 hover:text-slate-400"
              }`}
            >
              <tab.icon size={20} />
              <span className="text-[9px] font-medium tracking-wide">
                {tab.label.split(" ")[0]}
              </span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
