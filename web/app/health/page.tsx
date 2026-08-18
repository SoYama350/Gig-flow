import { CheckCircle2, Activity, Database, Clock } from "lucide-react";

interface HealthData {
  status: "ok";
  service: string;
  time: string;
  gigs: number;
  uptime: number;
}

/**
 * Mock data source that simulates a server-side fetch (e.g. from a database or
 * external API). This keeps the deployed preview buildable without a hosted
 * database while still demonstrating Server Component data fetching.
 */
async function fetchHealthData(): Promise<HealthData> {
  // Simulate network/IO latency to exercise the async data-fetching path.
  await new Promise((resolve) => setTimeout(resolve, 150));

  return {
    status: "ok",
    service: "GigFlow",
    time: new Date().toISOString(),
    gigs: 128,
    uptime: 99.97,
  };
}

export default async function HealthPage() {
  const data = await fetchHealthData();

  const cards = [
    { label: "Status", value: data.status.toUpperCase(), icon: CheckCircle2, color: "text-emerald-400" },
    { label: "Service", value: data.service, icon: Activity, color: "text-accent-400" },
    { label: "Gigs tracked", value: String(data.gigs), icon: Database, color: "text-cyan-400" },
    { label: "Uptime", value: `${data.uptime}%`, icon: Clock, color: "text-amber-400" },
  ];

  return (
    <div className="min-h-screen bg-dark-950 p-6 md:p-8">
      <div className="mesh-gradient" />
      <div className="max-w-3xl mx-auto animate-fade-in-up">
        <div className="flex items-center gap-2 mb-1">
          <Activity size={16} className="text-accent-400" />
          <span className="text-xs font-medium text-accent-400 uppercase tracking-widest">
            Health Check
          </span>
        </div>
        <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
          Service Health
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          Rendered from a server-side data fetch.
        </p>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-8">
          {cards.map((card) => (
            <div key={card.label} className="glass-card rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                  {card.label}
                </span>
                <card.icon size={16} className={card.color} />
              </div>
              <p className="text-2xl font-bold text-white tabular-nums">
                {card.value}
              </p>
            </div>
          ))}
        </div>

        <div className="glass-card rounded-2xl p-6 mt-6">
          <h2 className="text-sm font-semibold text-white mb-3">
            Raw response
          </h2>
          <pre className="text-xs text-slate-400 font-mono overflow-auto bg-dark-900/60 rounded-xl p-4">
{JSON.stringify(data, null, 2)}
          </pre>
          <p className="text-[11px] text-slate-600 mt-3">
            Generated at {new Date().toLocaleString()} · Server Component
          </p>
        </div>
      </div>
    </div>
  );
}
