import { Zap } from "lucide-react";

interface PlaceholderProps {
  title: string;
  description?: string;
}

/**
 * Styled placeholder used by routed pages while the full feature
 * UI is being migrated. Uses the existing dark glassmorphism design tokens.
 */
export function Placeholder({ title, description }: PlaceholderProps) {
  return (
    <div className="p-6 md:p-8 animate-fade-in-up">
      <div className="flex items-center gap-2 mb-1">
        <Zap size={16} className="text-accent-400" />
        <span className="text-xs font-medium text-accent-400 uppercase tracking-widest">
          GigFlow
        </span>
      </div>
      <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
        {title}
      </h1>
      <p className="text-slate-500 text-sm mt-1">
        {description ?? "This screen is part of the routed skeleton."}
      </p>

      <div className="glass-card rounded-2xl p-10 mt-8 text-center">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-accent-500 to-cyan-500 flex items-center justify-center glow-accent mx-auto mb-4">
          <Zap size={22} className="text-white" />
        </div>
        <h2 className="text-sm font-semibold text-white">Coming soon</h2>
        <p className="text-xs text-slate-500 mt-1">
          Full feature UI is being wired into this route.
        </p>
      </div>
    </div>
  );
}
