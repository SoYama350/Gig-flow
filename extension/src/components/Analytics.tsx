import { useMemo } from "react";
import { motion } from "motion/react";
import { TrendingUp, BarChart3, Target, Zap } from "lucide-react";

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

export default function Analytics({ gigs, userSkills }: AnalyticsProps) {
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
      const date = new Date(now - d * 86400000).toLocaleDateString("en-US", { month: "short", day: "numeric" });
      dayMap[date] = 0;
    }
    gigs.forEach((g) => {
      const date = new Date(g.scrapedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" });
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
  }, [gigs, userSkills]);

  const applyRate = stats.total > 0 ? Math.round((stats.byStatus.APPLIED / stats.total) * 100) : 0;
  const viewRate = stats.total > 0 ? Math.round(((stats.byStatus.VIEWED + stats.byStatus.APPLIED) / stats.total) * 100) : 0;

  const kpiCards = [
    { label: "Apply Rate", value: `${applyRate}%`, sub: `${stats.byStatus.APPLIED} applied`, color: "text-emerald-400", bar: applyRate, barColor: "bg-emerald-500" },
    { label: "View Rate", value: `${viewRate}%`, sub: `${stats.byStatus.VIEWED + stats.byStatus.APPLIED} viewed`, color: "text-cyan-400", bar: viewRate, barColor: "bg-cyan-500" },
    { label: "Avg Match", value: `${stats.avgMatch}%`, sub: `${stats.highMatch} high-match gigs`, color: "text-accent-400", bar: stats.avgMatch, barColor: "bg-accent-500" },
    { label: "With Proposals", value: `${gigs.filter((g) => g.proposal).length}`, sub: "AI proposals written", color: "text-purple-400", bar: stats.total > 0 ? (gigs.filter((g) => g.proposal).length / stats.total) * 100 : 0, barColor: "bg-purple-500" },
  ];

  return (
    <div className="p-4 md:p-8 space-y-6 animate-fade-in-up">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">Analytics</h1>
        <p className="text-slate-500 text-sm mt-1">Your freelance pipeline performance</p>
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
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">{kpi.label}</p>
              <p className={`text-2xl font-bold mt-1 ${kpi.color}`}>{kpi.value}</p>
              <p className="text-[11px] text-slate-600 mt-0.5">{kpi.sub}</p>
            </div>
            <MiniBar value={kpi.bar} max={100} color={kpi.barColor} />
          </motion.div>
        ))}
      </div>

      {/* Status Breakdown + Daily Chart side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Status Breakdown */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="glass-card rounded-2xl p-5"
        >
          <h2 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            <Target size={14} className="text-accent-400" /> Status Breakdown
          </h2>
          <div className="space-y-3">
            {[
              { label: "New", key: "NEW" as const, color: "bg-accent-500", textColor: "text-accent-400" },
              { label: "Viewed", key: "VIEWED" as const, color: "bg-cyan-500", textColor: "text-cyan-400" },
              { label: "Applied", key: "APPLIED" as const, color: "bg-emerald-500", textColor: "text-emerald-400" },
              { label: "Archived", key: "ARCHIVED" as const, color: "bg-slate-500", textColor: "text-slate-400" },
            ].map((item) => {
              const count = stats.byStatus[item.key];
              const pct = stats.total > 0 ? Math.round((count / stats.total) * 100) : 0;
              return (
                <div key={item.key}>
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="text-slate-400">{item.label}</span>
                    <span className={`font-semibold ${item.textColor}`}>{count} <span className="text-slate-600 font-normal">({pct}%)</span></span>
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
            <TrendingUp size={14} className="text-cyan-400" /> Gigs Scraped (14 days)
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
                  {/* Tooltip on hover */}
                  {count > 0 && (
                    <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-dark-700 text-white text-[9px] px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap border border-white/10 pointer-events-none z-10">
                      {count} gig{count !== 1 ? "s" : ""}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <div className="flex justify-between mt-2 text-[9px] text-slate-700">
            <span>{stats.dailyData[0]?.[0]}</span>
            <span>{stats.dailyData[stats.dailyData.length - 1]?.[0]}</span>
          </div>
        </motion.div>
      </div>

      {/* Top Skills Demanded */}
      {stats.topSkills.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="glass-card rounded-2xl p-5"
        >
          <h2 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            <BarChart3 size={14} className="text-emerald-400" /> Most Demanded Skills
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {stats.topSkills.map(([skill, count], i) => {
              const isOwned = userSkills.some(
                (s) => s.toLowerCase() === skill.toLowerCase() || skill.toLowerCase().includes(s.toLowerCase())
              );
              return (
                <div key={skill}>
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className={`font-medium ${isOwned ? "text-emerald-400" : "text-slate-400"}`}>
                      {isOwned && "✓ "}{skill}
                    </span>
                    <span className="text-slate-600">{count} gigs</span>
                  </div>
                  <MiniBar value={count} max={stats.maxSkill} color={isOwned ? "bg-emerald-500" : "bg-slate-600"} />
                </div>
              );
            })}
          </div>
          {userSkills.length > 0 && (
            <p className="text-xs text-slate-600 mt-4">
              <span className="text-emerald-400">✓ Green</span> = skills you own
            </p>
          )}
        </motion.div>
      )}

      {/* Empty state */}
      {stats.total === 0 && (
        <div className="glass-card rounded-2xl p-16 text-center">
          <Zap size={40} className="mx-auto mb-4 text-slate-700" />
          <p className="text-slate-500 text-sm">No data yet. Scrape some gigs to see analytics.</p>
        </div>
      )}
    </div>
  );
}
