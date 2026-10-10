import { useState, useEffect } from "react";
import {
  Search,
  User,
  BarChart3,
  Zap,
  Settings,
  LineChart,
  Moon,
  Sun,
  LogOut,
  Bot,
  Languages,
} from "lucide-react";
import { useLogout } from "../features/auth";
import { translations, Language } from "../i18n";

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  userName?: string;
  language: Language;
  onLanguageChange: (lang: Language) => void;
}

export default function Sidebar({
  activeTab,
  onTabChange,
  userName,
  language,
  onLanguageChange,
}: SidebarProps) {
  const initial = userName ? userName[0].toUpperCase() : "GF";
  const [isLightMode, setIsLightMode] = useState(false);
  const { logout } = useLogout();
  const t = translations[language] || translations.ar;

  const tabs = [
    { id: "dashboard", icon: BarChart3, label: t.dashboard },
    { id: "agent", icon: Bot, label: t.agentWorkspace },
    { id: "gigs", icon: Search, label: t.gigsFeed },
    { id: "analytics", icon: LineChart, label: t.analytics },
    { id: "profile", icon: User, label: t.profile },
    { id: "settings", icon: Settings, label: t.settings },
  ];

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

  const toggleLanguage = () => {
    onLanguageChange(language === "ar" ? "en" : "ar");
  };

  return (
    <>
      {/* ── Desktop sidebar ──────────────────────────────── */}
      <aside className="hidden md:flex w-[72px] bg-dark-900 flex-col items-center py-6 border-r border-white/5 shrink-0 z-30">
        {/* Logo */}
        <button
          onClick={() => onTabChange("dashboard")}
          className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent-500 to-cyan-500 flex items-center justify-center mb-8 glow-accent cursor-pointer hover:scale-105 transition-transform"
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

        <div className="flex flex-col gap-2 mt-auto mb-2">
          {/* Language Switcher */}
          <button
            onClick={toggleLanguage}
            className="tooltip-wrapper w-11 h-11 rounded-xl flex items-center justify-center text-accent-400 hover:text-accent-300 hover:bg-accent-500/10 transition-all duration-200 cursor-pointer text-xs font-bold font-mono"
            data-tooltip={t.switchLanguage}
          >
            {language === "ar" ? "EN" : "ع"}
          </button>

          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="tooltip-wrapper w-11 h-11 rounded-xl flex items-center justify-center text-slate-500 hover:text-slate-300 hover:bg-white/5 transition-all duration-200 cursor-pointer"
            data-tooltip={isLightMode ? t.darkMode : t.lightMode}
          >
            {isLightMode ? <Moon size={18} /> : <Sun size={18} />}
          </button>

          {/* Logout */}
          <button
            onClick={() => logout()}
            className="tooltip-wrapper w-11 h-11 rounded-xl flex items-center justify-center text-rose-500 hover:text-rose-400 hover:bg-rose-500/10 transition-all duration-200 cursor-pointer"
            data-tooltip={t.logout}
          >
            <LogOut size={18} />
          </button>
        </div>

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
            className={`flex flex-col items-center gap-0.5 px-2.5 py-1.5 rounded-xl transition-all cursor-pointer ${
              activeTab === tab.id
                ? "text-accent-400"
                : "text-slate-600 hover:text-slate-400"
            }`}
          >
            <tab.icon size={18} />
            <span className="text-[9px] font-medium tracking-wide truncate max-w-[50px]">{tab.label}</span>
          </button>
        ))}
        <button
          onClick={toggleLanguage}
          className="flex flex-col items-center gap-0.5 px-2.5 py-1.5 rounded-xl text-accent-400 font-bold text-xs"
        >
          {language === "ar" ? "EN" : "ع"}
          <span className="text-[9px] font-medium">{language === "ar" ? "En" : "عربي"}</span>
        </button>
      </nav>
    </>
  );
}
