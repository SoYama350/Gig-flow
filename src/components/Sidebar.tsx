import { useState, useEffect } from "react";
import { Search, BarChart3, User, Zap, Settings, LineChart, Moon, Sun } from "lucide-react";

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  userName?: string;
}

const tabs = [
  { id: "dashboard", icon: BarChart3, label: "Dashboard" },
  { id: "gigs", icon: Search, label: "Gigs Feed" },
  { id: "analytics", icon: LineChart, label: "Analytics" },
  { id: "profile", icon: User, label: "Profile" },
  { id: "settings", icon: Settings, label: "Settings" },
];

export default function Sidebar({ activeTab, onTabChange, userName }: SidebarProps) {
  const initial = userName ? userName[0].toUpperCase() : "GF";
  const [isLightMode, setIsLightMode] = useState(false);

  useEffect(() => {
    chrome.storage.local.get("theme").then((res) => {
      if (res.theme === "light") {
        setIsLightMode(true);
        document.body.classList.add("light");
      } else {
        setIsLightMode(false);
        document.body.classList.remove("light");
      }
    });
  }, []);

  const toggleTheme = () => {
    const nextTheme = !isLightMode;
    setIsLightMode(nextTheme);
    if (nextTheme) {
      document.body.classList.add("light");
      chrome.storage.local.set({ theme: "light" });
    } else {
      document.body.classList.remove("light");
      chrome.storage.local.set({ theme: "dark" });
    }
  };

  return (
    <>
      {/* ── Desktop sidebar ──────────────────────────────── */}
      <aside className="hidden md:flex w-[72px] bg-dark-900 flex-col items-center py-6 border-r border-white/5 shrink-0">
        {/* Logo */}
        <button
          onClick={() => onTabChange("dashboard")}
          className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent-500 to-cyan-500 flex items-center justify-center mb-10 glow-accent cursor-pointer hover:scale-105 transition-transform"
        >
          <Zap size={20} className="text-white" />
        </button>

        <nav className="flex flex-col gap-2 flex-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`tooltip-wrapper w-11 h-11 rounded-xl flex items-center justify-center transition-all duration-200 cursor-pointer ${
                activeTab === tab.id
                  ? "bg-accent-500/15 text-accent-400 glow-accent"
                  : "text-slate-500 hover:text-slate-300 hover:bg-white/5"
              }`}
              data-tooltip={tab.label}
            >
              <tab.icon size={20} />
            </button>
          ))}
        </nav>

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="tooltip-wrapper w-11 h-11 rounded-xl flex items-center justify-center text-slate-500 hover:text-slate-300 hover:bg-white/5 transition-all duration-200 cursor-pointer mb-2"
          data-tooltip={isLightMode ? "Dark Mode" : "Light Mode"}
        >
          {isLightMode ? <Moon size={18} /> : <Sun size={18} />}
        </button>

        {/* Avatar */}
        <button
          onClick={() => onTabChange("profile")}
          className="w-9 h-9 rounded-full bg-gradient-to-br from-accent-600 to-cyan-600 flex items-center justify-center text-white text-xs font-bold cursor-pointer hover:scale-105 transition-transform"
        >
          {initial}
        </button>
      </aside>

      {/* ── Mobile bottom nav ─────────────────────────────── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-dark-900/95 backdrop-blur-xl border-t border-white/6 flex items-center justify-around px-2 py-2 safe-bottom">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
              activeTab === tab.id
                ? "text-accent-400"
                : "text-slate-600 hover:text-slate-400"
            }`}
          >
            <tab.icon size={20} />
            <span className="text-[9px] font-medium tracking-wide">{tab.label.split(" ")[0]}</span>
          </button>
        ))}
      </nav>
    </>
  );
}
