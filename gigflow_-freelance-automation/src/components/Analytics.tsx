import { useMemo } from "react";
import { motion } from "motion/react";
import { TrendingUp, BarChart3, Target, Zap } from "lucide-react";
import { translations, Language } from "../i18n";

interface Gig {
  id: string;
  title: string;
  status: string;
  platform: string;
  requiredSkills: string | null;
  scrapedAt: string;
  proposal: string | null;
}

interface AnalyticsProps {
  gigs: Gig[];
  userSkills: string[];
  language?: Language;
}

function MiniBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div className="h-1.5 bg-dark-700 rounded-full overflow-hidden">
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className={`h-full rounded-full ${color}`}
      />
    </div>
  );
}

export default function Analytics({ gigs, userSkills, language = "ar" }: AnalyticsProps) {
  const t = translations[language] || translations.ar;
  const isRtl = language === "ar";

  const stats = useMemo(() => {
    const total = gigs.length;
    const byStatus = {
      NEW: gigs.filter((g) => g.status === "NEW").length,
      VIEWED: gigs.filter((g) => g.status === "VIEWED").length,
      APPLIED: gigs.filter((g) => g.status === "APPLIED").length,
      ARCHIVED: gigs.filter((g) => g.status === "ARCHIVED").length,
    };

    // Gigs by day (last 14 days)
    const now = Date.now();
    const dayMap: Record<string, number> = {};
    for (let d = 13; d >= 0; d--) {
      const date = new Date(now - d * 86400000).toLocaleDateString(language === "ar" ? "ar-EG" : "en-US", { month: "short", day: "numeric" });
      dayMap[date] = 0;
    }
    gigs.forEach((g) => {
      const date = new Date(g.scrapedAt).toLocaleDateString(language === "ar" ? "ar-EG" : "en-US", { month: "short", day: "numeric" });
      if (date in dayMap) dayMap[date]++;
    });
    const dailyData = Object.entries(dayMap);
    const maxDay = Math.max(...Object.values(dayMap), 1);

    // Top skills demanded
    const skillCount: Record<string, number> = {};
    gigs.forEach((g) => {
      g.requiredSkills?.split(",").forEach((s) => {
        const skill = s.trim();
        if (skill) skillCount[skill] = (skillCount[skill] || 0) + 1;
      });
    });
    const topSkills = Object.entries(skillCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8);
    const maxSkill = topSkills[0]?.[1] || 1;

    // Match analysis
    const matchScores = gigs
      .filter((g) => g.requiredSkills && userSkills.length > 0)
      .map((g) => {
        const gigSkills = (g.requiredSkills || "").toLowerCase().split(",").map((s) => s.trim());
        const matches = userSkills.filter((s) =>
          gigSkills.some((gs) => gs.includes(s.toLowerCase()) || s.toLowerCase().includes(gs))
        );
        return Math.round((matches.length / Math.max(gigSkills.length, 1)) * 100);
      });
    const avgMatch = matchScores.length > 0 ? Math.round(matchScores.reduce((a, b) => a + b, 0) / matchScores.length) : 0;
    const highMatch = matchScores.filter((s) => s >= 70).length;

    return { total, byStatus, dailyData, maxDay, topSkills, maxSkill, avgMatch, highMatch };
  }, [gigs, userSkills, language]);

  const applyRate = stats.total > 0 ? Math.round((stats.byStatus.APPLIED / stats.total) * 100) : 0;
  const viewRate = stats.total > 0 ? Math.round(((stats.byStatus.VIEWED + stats.byStatus.APPLIED) / stats.total) * 100) : 0;

  const kpiCards = [
    {
      label: language === "ar" ? "معدل التقديم" : "Apply Rate",
      value: `${applyRate}%`,
      sub: language === "ar" ? `${stats.byStatus.APPLIED} تم التقديم` : `${stats.byStatus.APPLIED} applied`,
      color: "text-emerald-400",
      bar: applyRate,
      barColor: "bg-emerald-500",
    },
    {
      label: language === "ar" ? "معدل المشاهدة" : "View Rate",
      value: `${viewRate}%`,
      sub: language === "ar" ? `${stats.byStatus.VIEWED + stats.byStatus.APPLIED} تمت المشاهدة` : `${stats.byStatus.VIEWED + stats.byStatus.APPLIED} viewed`,
      color: "text-cyan-400",
      bar: viewRate,
      barColor: "bg-cyan-500",
    },
    {
      label: language === "ar" ? "متوسط التطابق" : "Avg Match",
      value: `${stats.avgMatch}%`,
      sub: language === "ar" ? `${stats.highMatch} مشاريع عالية الملاءمة` : `${stats.highMatch} high-match gigs`,
      color: "text-accent-400",
      bar: stats.avgMatch,
      barColor: "bg-accent-500",
    },
    {
      label: language === "ar" ? "عروض منجزة" : "With Proposals",
      value: `${gigs.filter((g) => g.proposal).length}`,
      sub: language === "ar" ? "عروض ذكاء اصطناعي مكتوبة" : "AI proposals written",
      color: "text-purple-400",
      bar: stats.total > 0 ? (gigs.filter((g) => g.proposal).length / stats.total) * 100 : 0,
      barColor: "bg-purple-500",
    },
  ];

  return (
    <div className={`p-4 md:p-8 space-y-6 animate-fade-in-up ${isRtl ? "text-right" : "text-left"}`}>
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">{t.analyticsTitle}</h1>
        <p className="text-slate-400 text-sm mt-1">{t.analyticsSubtitle}</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {kpiCards.map((kpi, i) => (
          <motion.div
            key={kpi.label}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
            className="glass-card rounded-2xl p-4 space-y-3"
          >
            <div>
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">{kpi.label}</p>
              <p className={`text-2xl font-bold mt-1 ${kpi.color}`}>{kpi.value}</p>
              <p className="text-[11px] text-slate-500 mt-0.5">{kpi.sub}</p>
            </div>
            <MiniBar value={kpi.bar} max={100} color={kpi.barColor} />
          </motion.div>
        ))}
      </div>

      {/* Status Breakdown + Daily Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Status Breakdown */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="glass-card rounded-2xl p-5"
        >
          <h2 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            <Target size={14} className="text-accent-400" /> {t.pipelineFunnel}
          </h2>
          <div className="space-y-3">
            {[
              { label: t.statusNew, key: "NEW" as const, color: "bg-accent-500", textColor: "text-accent-400" },
              { label: t.statusViewed, key: "VIEWED" as const, color: "bg-cyan-500", textColor: "text-cyan-400" },
              { label: t.statusApplied, key: "APPLIED" as const, color: "bg-emerald-500", textColor: "text-emerald-400" },
              { label: t.statusArchived, key: "ARCHIVED" as const, color: "bg-slate-500", textColor: "text-slate-400" },
            ].map((item) => {
              const count = stats.byStatus[item.key];
              const pct = stats.total > 0 ? Math.round((count / stats.total) * 100) : 0;
              return (
                <div key={item.key}>
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="text-slate-400">{item.label}</span>
                    <span className={`font-semibold ${item.textColor}`}>{count} <span className="text-slate-500 font-normal">({pct}%)</span></span>
                  </div>
                  <MiniBar value={count} max={stats.total} color={item.color} />
                </div>
              );
            })}
          </div>
        </motion.div>

        {/* Daily Activity Chart */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.42 }}
          className="glass-card rounded-2xl p-5"
        >
          <h2 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            <TrendingUp size={14} className="text-cyan-400" /> {t.activityLast14Days}
          </h2>
          <div className="flex items-end gap-1 h-28">
            {stats.dailyData.map(([date, count], i) => {
              const barH = stats.maxDay > 0 ? (count / stats.maxDay) * 100 : 0;
              return (
                <div key={date} className="flex-1 flex flex-col items-center gap-1 group relative">
                  <div className="w-full flex items-end justify-center h-24">
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: `${Math.max(barH, count > 0 ? 4 : 0)}%` }}
                      transition={{ delay: i * 0.03, duration: 0.4, ease: "easeOut" }}
                      className={`w-full rounded-t-sm ${count > 0 ? "bg-accent-500/70 hover:bg-accent-400 transition-colors" : "bg-dark-700"}`}
                      style={{ minHeight: count > 0 ? 4 : 0 }}
                    />
                  </div>
                  <span className="text-[9px] text-slate-500 truncate max-w-full">{date.split(" ")[1] || date}</span>
                </div>
              );
            })}
          </div>
        </motion.div>
      </div>

      {/* Top Skills */}
      {stats.topSkills.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="glass-card rounded-2xl p-5"
        >
          <h2 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            <BarChart3 size={14} className="text-purple-400" /> {t.topDemandedSkills}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {stats.topSkills.map(([skill, count]) => {
              const isUserSkill = userSkills.some((us) => us.toLowerCase() === skill.toLowerCase());
              return (
                <div key={skill} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-300 flex items-center gap-1.5">
                      {skill}
                      {isUserSkill && (
                        <span className="text-[10px] bg-accent-500/20 text-accent-400 px-1.5 py-0.2 rounded font-medium">
                          ✓
                        </span>
                      )}
                    </span>
                    <span className="text-slate-400">{count} {language === "ar" ? "مشروع" : "gigs"}</span>
                  </div>
                  <MiniBar value={count} max={stats.maxSkill} color={isUserSkill ? "bg-accent-500" : "bg-dark-600"} />
                </div>
              );
            })}
          </div>
        </motion.div>
      )}
    </div>
  );
}
