import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Search, ExternalLink, Sparkles, Loader2, Copy, Check,
  ChevronDown, RefreshCw, Trash2, Eye, CheckCheck, Globe, Save
} from "lucide-react";

interface Gig {
  id: string;
  title: string;
  description: string;
  budget: string | null;
  url: string;
  platform: string;
  requiredSkills: string | null;
  scrapedAt: string;
  status: string;
  proposal: string | null;
}

interface GigsFeedProps {
  gigs: Gig[];
  onScrape: () => void;
  scraping: boolean;
  onStatusChange: (id: string, status: string) => void;
  onGenerateProposal: (gigId: string, language: "arabic" | "english") => void;
  onSaveProposal: (gigId: string, proposal: string) => void;
  generatingFor: string | null;
  userSkills: string[];
}

const statusFilters = ["ALL", "NEW", "VIEWED", "APPLIED", "ARCHIVED"];
const statusStyles: Record<string, string> = {
  NEW: "status-new",
  VIEWED: "status-viewed",
  APPLIED: "status-applied",
  ARCHIVED: "status-archived",
};

export default function GigsFeed({
  gigs, onScrape, scraping, onStatusChange,
  onGenerateProposal, onSaveProposal, generatingFor, userSkills
}: GigsFeedProps) {
  const [filter, setFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedGig, setExpandedGig] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [editingProposals, setEditingProposals] = useState<Record<string, string>>({});
  const [savingProposal, setSavingProposal] = useState<string | null>(null);
  const [proposalLang, setProposalLang] = useState<"arabic" | "english">("arabic");

  const filtered = gigs.filter((g) => {
    if (filter !== "ALL" && g.status !== filter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        g.title.toLowerCase().includes(q) ||
        g.description.toLowerCase().includes(q) ||
        (g.requiredSkills || "").toLowerCase().includes(q)
      );
    }
    return true;
  });

  const copyProposal = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getMatchingSkills = (gig: Gig) => {
    if (!gig.requiredSkills || userSkills.length === 0) return [];
    const gigSkills = gig.requiredSkills.toLowerCase().split(",").map((s) => s.trim());
    return userSkills.filter((s) =>
      gigSkills.some((gs) => gs.includes(s.toLowerCase()) || s.toLowerCase().includes(gs))
    );
  };

  const getMatchScore = (gig: Gig) => {
    if (!gig.requiredSkills || userSkills.length === 0) return 0;
    const gigSkills = gig.requiredSkills.toLowerCase().split(",").map((s) => s.trim());
    const matches = userSkills.filter((s) =>
      gigSkills.some((gs) => gs.includes(s.toLowerCase()) || s.toLowerCase().includes(gs))
    );
    return Math.round((matches.length / Math.max(gigSkills.length, 1)) * 100);
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const bulkStatusChange = (status: string) => {
    selectedIds.forEach((id) => onStatusChange(id, status));
    setSelectedIds(new Set());
  };

  const handleViewLink = (gig: Gig) => {
    if (gig.status === "NEW") onStatusChange(gig.id, "VIEWED");
  };

  const startEditProposal = (gig: Gig) => {
    setEditingProposals((prev) => ({ ...prev, [gig.id]: gig.proposal || "" }));
  };

  const cancelEdit = (gigId: string) => {
    setEditingProposals((prev) => {
      const next = { ...prev };
      delete next[gigId];
      return next;
    });
  };

  const handleSaveProposal = async (gigId: string) => {
    const text = editingProposals[gigId];
    if (text === undefined) return;
    setSavingProposal(gigId);
    await onSaveProposal(gigId, text);
    setSavingProposal(null);
    cancelEdit(gigId);
  };

  const exportCSV = () => {
    const rows = [
      ["Title", "Platform", "Budget", "Status", "Skills", "URL", "Date"],
      ...filtered.map((g) => [
        `"${g.title.replace(/"/g, '""')}"`,
        g.platform,
        g.budget || "",
        g.status,
        `"${(g.requiredSkills || "").replace(/"/g, '""')}"`,
        g.url,
        new Date(g.scrapedAt).toLocaleDateString(),
      ]),
    ];
    const csv = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `gigflow-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-4 md:p-8 space-y-5 animate-fade-in-up">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">Gigs Feed</h1>
          <p className="text-slate-500 text-sm mt-1">
            {filtered.length} gigs{filter !== "ALL" ? ` · ${filter}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Language toggle */}
          <div className="flex items-center gap-1 bg-dark-800 border border-white/6 rounded-xl p-1">
            <button
              onClick={() => setProposalLang("arabic")}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                proposalLang === "arabic" ? "bg-accent-500/20 text-accent-400" : "text-slate-500 hover:text-slate-300"
              }`}
            >
              <Globe size={11} /> AR
            </button>
            <button
              onClick={() => setProposalLang("english")}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                proposalLang === "english" ? "bg-accent-500/20 text-accent-400" : "text-slate-500 hover:text-slate-300"
              }`}
            >
              <Globe size={11} /> EN
            </button>
          </div>
          <button onClick={exportCSV} className="btn-ghost text-xs py-2 px-3 flex items-center gap-1.5 rounded-lg cursor-pointer">
            ↓ CSV
          </button>
          <button onClick={onScrape} disabled={scraping} className="btn-primary flex items-center gap-2 text-sm cursor-pointer">
            {scraping ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={15} />}
            {scraping ? "Scraping..." : "Scrape"}
          </button>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Search gigs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-dark-800 border border-white/6 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-slate-600 focus:border-accent-500/50 transition-colors"
          />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {statusFilters.map((s) => {
            const count = s === "ALL" ? gigs.length : gigs.filter((g) => g.status === s).length;
            return (
              <button
                key={s}
                onClick={() => setFilter(s)}
                className={`px-3 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                  filter === s
                    ? "bg-accent-500/20 text-accent-400 border border-accent-500/30"
                    : "text-slate-500 hover:text-slate-300 border border-transparent hover:bg-white/5"
                }`}
              >
                {s}
                <span className="ml-1.5 opacity-50">{count}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Bulk Actions Bar */}
      <AnimatePresence>
        {selectedIds.size > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="flex items-center gap-3 glass-card rounded-xl px-4 py-3">
              <span className="text-sm text-slate-400 font-medium">{selectedIds.size} selected</span>
              <div className="flex gap-2 ml-auto flex-wrap">
                <button onClick={() => bulkStatusChange("VIEWED")} className="btn-ghost text-xs py-1.5 px-3 flex items-center gap-1.5 rounded-lg cursor-pointer">
                  <Eye size={11} /> Viewed
                </button>
                <button onClick={() => bulkStatusChange("APPLIED")} className="btn-ghost text-xs py-1.5 px-3 flex items-center gap-1.5 rounded-lg cursor-pointer">
                  <CheckCheck size={11} /> Applied
                </button>
                <button onClick={() => bulkStatusChange("ARCHIVED")} className="btn-ghost text-xs py-1.5 px-3 flex items-center gap-1.5 rounded-lg cursor-pointer text-rose-400 border-rose-500/20 hover:bg-rose-500/10">
                  <Trash2 size={11} /> Archive
                </button>
                <button onClick={() => setSelectedIds(new Set())} className="text-xs text-slate-500 hover:text-slate-300 cursor-pointer px-2">✕</button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Gig List */}
      <div className="space-y-3">
        <AnimatePresence mode="popLayout">
          {filtered.length === 0 ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card rounded-2xl p-16 text-center">
              <Search size={40} className="mx-auto mb-4 text-slate-700" />
              <p className="text-slate-500 text-sm mb-4">No gigs found. Try scraping or adjusting filters.</p>
              <button onClick={onScrape} disabled={scraping} className="btn-primary text-sm mx-auto inline-flex items-center gap-2 cursor-pointer">
                <RefreshCw size={14} /> Scrape Now
              </button>
            </motion.div>
          ) : (
            filtered.map((gig, i) => {
              const isExpanded = expandedGig === gig.id;
              const matchingSkills = getMatchingSkills(gig);
              const matchScore = getMatchScore(gig);
              const isSelected = selectedIds.has(gig.id);
              const isEditing = gig.id in editingProposals;
              const editText = editingProposals[gig.id] ?? gig.proposal ?? "";

              return (
                <motion.div
                  key={gig.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  transition={{ delay: Math.min(i * 0.03, 0.25) }}
                  className={`glass-card rounded-2xl overflow-hidden ${isSelected ? "ring-1 ring-accent-500/40" : ""}`}
                >
                  <div className="p-4 md:p-5">
                    <div className="flex items-start gap-3">
                      {/* Checkbox */}
                      <button
                        onClick={() => toggleSelect(gig.id)}
                        className={`mt-1 w-4.5 h-4.5 rounded border flex items-center justify-center shrink-0 transition-all cursor-pointer ${
                          isSelected ? "bg-accent-500 border-accent-500 text-white" : "border-white/15 hover:border-accent-500/50"
                        }`}
                        style={{ width: 18, height: 18, minWidth: 18 }}
                      >
                        {isSelected && <Check size={10} />}
                      </button>

                      {/* Platform badge */}
                      <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-accent-600 to-accent-800 flex items-center justify-center shrink-0 text-white text-[9px] font-bold uppercase tracking-tight">
                        {gig.platform.substring(0, 3)}
                      </div>

                      <div className="flex-1 min-w-0">
                        {/* Title row */}
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <h3 className="text-sm font-semibold text-white leading-snug line-clamp-2 flex-1">{gig.title}</h3>
                          <div className="flex items-center gap-1.5 shrink-0">
                            {gig.budget && (
                              <span className="text-xs font-mono font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-lg whitespace-nowrap">
                                {gig.budget}
                              </span>
                            )}
                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md ${statusStyles[gig.status] || statusStyles.NEW}`}>
                              {gig.status}
                            </span>
                          </div>
                        </div>

                        <p className="text-xs text-slate-400 line-clamp-2 mb-3 leading-relaxed">{gig.description}</p>

                        {/* Skills row */}
                        <div className="flex flex-wrap gap-1.5 mb-3">
                          {gig.requiredSkills?.split(",").slice(0, 5).map((s) => {
                            const skill = s.trim();
                            const isMatch = matchingSkills.some(
                              (ms) => ms.toLowerCase() === skill.toLowerCase() || skill.toLowerCase().includes(ms.toLowerCase())
                            );
                            return (
                              <span
                                key={s}
                                className={`px-2 py-0.5 rounded-md text-[10px] font-medium ${
                                  isMatch
                                    ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20"
                                    : "bg-white/5 text-slate-500 border border-white/5"
                                }`}
                              >
                                {skill}
                              </span>
                            );
                          })}
                          {matchScore > 0 && (
                            <span
                              className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                                matchScore >= 70
                                  ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                                  : matchScore >= 35
                                  ? "bg-amber-500/20 text-amber-300 border-amber-500/30"
                                  : "bg-slate-500/15 text-slate-400 border-slate-500/20"
                              }`}
                            >
                              {matchScore}% match
                            </span>
                          )}
                        </div>

                        {/* Action row */}
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <a
                            href={gig.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={() => handleViewLink(gig)}
                            className="btn-ghost text-xs py-1.5 px-2.5 inline-flex items-center gap-1 rounded-lg"
                          >
                            <ExternalLink size={11} /> View
                          </a>
                          <button
                            onClick={() => onGenerateProposal(gig.id, proposalLang)}
                            disabled={generatingFor === gig.id}
                            className="btn-primary text-xs py-1.5 px-2.5 inline-flex items-center gap-1 rounded-lg cursor-pointer"
                          >
                            {generatingFor === gig.id ? (
                              <Loader2 size={11} className="animate-spin" />
                            ) : (
                              <Sparkles size={11} />
                            )}
                            {generatingFor === gig.id
                              ? "Generating…"
                              : gig.proposal
                              ? "Regenerate"
                              : `AI Proposal (${proposalLang === "arabic" ? "AR" : "EN"})`}
                          </button>
                          <select
                            value={gig.status}
                            onChange={(e) => onStatusChange(gig.id, e.target.value)}
                            className="bg-dark-800 text-slate-400 text-xs border border-white/6 rounded-lg px-2 py-1.5 cursor-pointer focus:border-accent-500/50"
                          >
                            <option value="NEW">NEW</option>
                            <option value="VIEWED">VIEWED</option>
                            <option value="APPLIED">APPLIED</option>
                            <option value="ARCHIVED">ARCHIVED</option>
                          </select>
                          {gig.proposal && (
                            <button
                              onClick={() => setExpandedGig(isExpanded ? null : gig.id)}
                              className="btn-ghost text-xs py-1.5 px-2.5 inline-flex items-center gap-1 rounded-lg cursor-pointer"
                            >
                              <ChevronDown size={11} className={`transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                              Proposal
                            </button>
                          )}
                          <span className="text-[10px] text-slate-600 font-mono ml-auto hidden sm:inline">
                            {new Date(gig.scrapedAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Proposal panel */}
                  <AnimatePresence>
                    {isExpanded && gig.proposal && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25 }}
                        className="overflow-hidden"
                      >
                        <div className="border-t border-white/5 p-4 md:p-5 bg-dark-900/60">
                          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                            <span className="text-xs font-medium text-accent-400 flex items-center gap-1.5">
                              <Sparkles size={11} />
                              AI Proposal
                              <span className="text-slate-600 ml-1">
                                ({gig.proposal && /[\u0600-\u06FF]/.test(gig.proposal) ? "Arabic" : "English"})
                              </span>
                            </span>
                            <div className="flex gap-2">
                              {!isEditing ? (
                                <>
                                  <button
                                    onClick={() => startEditProposal(gig)}
                                    className="btn-ghost text-xs py-1 px-2.5 rounded-lg cursor-pointer"
                                  >
                                    Edit
                                  </button>
                                  <button
                                    onClick={() => copyProposal(gig.id, gig.proposal!)}
                                    className="btn-ghost text-xs py-1 px-2.5 inline-flex items-center gap-1 rounded-lg cursor-pointer"
                                  >
                                    {copiedId === gig.id ? (
                                      <Check size={11} className="text-emerald-400" />
                                    ) : (
                                      <Copy size={11} />
                                    )}
                                    {copiedId === gig.id ? "Copied!" : "Copy"}
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button
                                    onClick={() => copyProposal(gig.id, editText)}
                                    className="btn-ghost text-xs py-1 px-2.5 inline-flex items-center gap-1 rounded-lg cursor-pointer"
                                  >
                                    {copiedId === gig.id ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
                                    Copy
                                  </button>
                                  <button
                                    onClick={() => cancelEdit(gig.id)}
                                    className="btn-ghost text-xs py-1 px-2.5 rounded-lg cursor-pointer text-slate-500"
                                  >
                                    Cancel
                                  </button>
                                  <button
                                    onClick={() => handleSaveProposal(gig.id)}
                                    disabled={savingProposal === gig.id}
                                    className="btn-primary text-xs py-1 px-2.5 inline-flex items-center gap-1 rounded-lg cursor-pointer"
                                  >
                                    {savingProposal === gig.id ? (
                                      <Loader2 size={11} className="animate-spin" />
                                    ) : (
                                      <Save size={11} />
                                    )}
                                    Save
                                  </button>
                                </>
                              )}
                            </div>
                          </div>

                          {isEditing ? (
                            <textarea
                              value={editText}
                              onChange={(e) =>
                                setEditingProposals((prev) => ({ ...prev, [gig.id]: e.target.value }))
                              }
                              className="w-full bg-dark-800 border border-white/6 rounded-xl px-4 py-3 text-sm text-slate-300 focus:border-accent-500/50 transition-colors resize-none leading-relaxed"
                              rows={10}
                              dir={/[\u0600-\u06FF]/.test(editText) ? "rtl" : "ltr"}
                            />
                          ) : (
                            <p
                              className="text-sm text-slate-300 whitespace-pre-wrap leading-relaxed"
                              dir={/[\u0600-\u06FF]/.test(gig.proposal || "") ? "rtl" : "ltr"}
                            >
                              {gig.proposal}
                            </p>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
