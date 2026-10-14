import { BarChart3, Search, Briefcase, TrendingUp, RefreshCw, Zap } from "lucide-react";
import { motion } from "motion/react";
import { translations, Language } from "../i18n";

interface Stats {
  totalGigs: number;
  newGigs: number;
  appliedGigs: number;
  archivedGigs: number;
}

interface DashboardProps {
  stats: Stats;
  onNavigate: (tab: string) => void;
  onScrape: () => void;
  scraping: boolean;
  lastScraped?: string | null;
  language?: Language;
}

export default function Dashboard({
  stats,
  onNavigate,
  onScrape,
  scraping,
  lastScraped,
  language = "ar",
}: DashboardProps) {
  const t = translations[language] || translations.ar;
  const isRtl = language === "ar";
  const applyRate = stats.totalGigs > 0 ? Math.round((stats.appliedGigs / stats.totalGigs) * 100) : 0;

  const statCards = [
    {
      key: "totalGigs",
      label: t.totalGigs,
      icon: Briefcase,
      color: "from-accent-500 to-accent-700",
      glow: "glow-accent",
      trend: null,
    },
    {
      key: "newGigs",
      label: t.newGigs,
      icon: Search,
      color: "from-cyan-500 to-cyan-700",
      glow: "glow-cyan",
      trend: "fresh",
    },
    {
      key: "appliedGigs",
      label: t.appliedGigs,
      icon: TrendingUp,
      color: "from-emerald-500 to-emerald-700",
      glow: "",
      trend: null,
    },
    {
      key: "archivedGigs",
      label: t.archivedGigs,
      icon: BarChart3,
      color: "from-slate-500 to-slate-700",
      glow: "",
      trend: null,
    },
  ];

  return (
    <div className={`p-6 md:p-8 space-y-8 animate-fade-in-up ${isRtl ? "text-right" : "text-left"}`}>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Zap size={16} className="text-accent-400" />
            <span className="text-xs font-medium text-accent-400 uppercase tracking-widest">{t.appName}</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">{t.dashboard}</h1>
          <p className="text-slate-400 text-sm mt-1">
            {lastScraped
              ? `${t.lastScrapedPrefix} ${new Date(lastScraped).toLocaleString(language === "ar" ? "ar-EG" : "en-US")}`
              : t.dashboardSubtitle}
          </p>
        </div>
        <button
          onClick={onScrape}
          disabled={scraping}
          className="btn-primary flex items-center justify-center gap-2 text-sm cursor-pointer shrink-0"
        >
          {scraping ? (
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <RefreshCw size={16} />
          )}
          {scraping ? t.scraping : t.scrapeMostaql}
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card, i) => (
          <motion.div
            key={card.key}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className={`glass-card rounded-2xl p-5 ${card.glow} cursor-pointer`}
            onClick={() => card.key !== "archivedGigs" && onNavigate("gigs")}
          >
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">{card.label}</span>
              <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${card.color} flex items-center justify-center`}>
                <card.icon size={16} className="text-white" />
              </div>
            </div>
            <p className="text-3xl font-bold text-white tabular-nums">
              {(stats as any)[card.key] ?? 0}
            </p>
            {card.trend === "fresh" && (stats as any)[card.key] > 0 && (
              <p className="text-xs text-cyan-400 mt-1 font-medium">{t.newOpportunities}</p>
            )}
          </motion.div>
        ))}
      </div>

      {/* Apply Rate Banner */}
      {stats.totalGigs > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
          className="glass-card rounded-2xl p-5"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold text-white">{t.applicationRate}</span>
            <span className="text-sm font-bold text-accent-400">{applyRate}%</span>
          </div>
          <div className="h-2 bg-dark-700 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${applyRate}%` }}
              transition={{ delay: 0.6, duration: 0.8, ease: "easeOut" }}
              className="h-full bg-gradient-to-r from-accent-600 to-accent-400 rounded-full"
            />
          </div>
          <div className="flex justify-between mt-2 text-xs text-slate-400">
            <span>{t.appliedCount.replace("{count}", String(stats.appliedGigs))}</span>
            <span>{t.totalCount.replace("{count}", String(stats.totalGigs))}</span>
          </div>
        </motion.div>
      )}

      {/* Quick Actions */}
      <div className="glass-card rounded-2xl p-6">
        <h2 className="text-sm font-semibold text-white mb-4">{t.quickActions}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <button
            onClick={() => onNavigate("gigs")}
            className="btn-ghost text-sm text-start cursor-pointer p-4 rounded-xl"
          >
            <Search size={18} className="mb-2 text-accent-400" />
            <span className="block font-medium text-white">{t.browseGigs}</span>
            <span className="text-xs text-slate-400 mt-0.5 block">{t.browseGigsDesc}</span>
          </button>
          <button
            onClick={onScrape}
            disabled={scraping}
            className="btn-ghost text-sm text-start cursor-pointer p-4 rounded-xl"
          >
            <TrendingUp size={18} className="mb-2 text-cyan-400" />
            <span className="block font-medium text-white">{t.runScraper}</span>
            <span className="text-xs text-slate-400 mt-0.5 block">{t.runScraperDesc}</span>
          </button>
          <button
            onClick={() => onNavigate("profile")}
            className="btn-ghost text-sm text-start cursor-pointer p-4 rounded-xl"
          >
            <Briefcase size={18} className="mb-2 text-emerald-400" />
            <span className="block font-medium text-white">{t.editProfile}</span>
            <span className="text-xs text-slate-400 mt-0.5 block">{t.editProfileDesc}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
