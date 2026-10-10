import { useState, useEffect } from "react";
import {
  Bot,
  Sparkles,
  Search,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Send,
  Eye,
  FileText,
  ThumbsUp,
  XCircle,
  RefreshCw,
  ExternalLink,
  Sliders,
  ShieldCheck,
  ChevronRight,
  Database,
  Check,
} from "lucide-react";

interface AgentTask {
  id: string;
  stage: string;
  status: string;
  score: number | null;
  fitAssessment: string | null;
  recommendationReason: string | null;
  riskWarnings: string | null;
  proposalDraft: string | null;
  reviewedAt: string | null;
  opportunity: {
    id: string;
    title: string;
    description: string;
    url: string;
    budget: string | null;
    sourceKey: string;
    requiredSkills: string | null;
  };
}

interface AgentRun {
  id: string;
  command: string;
  status: string;
  createdAt: string;
  tasks: AgentTask[];
  stats?: {
    totalTasks: number;
    approved: number;
    rejected: number;
  };
}

interface SourceHealth {
  key: string;
  name: string;
  enabled: boolean;
  isHealthy: boolean;
  latencyMs?: number;
  failureCount: number;
  lastCheckedAt?: string;
}

interface UserDoc {
  id: string;
  name: string;
  type: string;
  updatedAt: string;
}

export default function AgentWorkspace({
  onShowToast,
  userSkills,
}: {
  onShowToast: (msg: string, type?: "success" | "error") => void;
  userSkills?: string[];
}) {
  const [command, setCommand] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [runs, setRuns] = useState<AgentRun[]>([]);
  const [currentRun, setCurrentRun] = useState<AgentRun | null>(null);
  const [selectedTask, setSelectedTask] = useState<AgentTask | null>(null);
  const [proposalEdit, setProposalEdit] = useState("");
  const [sources, setSources] = useState<SourceHealth[]>([]);
  const [docs, setDocs] = useState<UserDoc[]>([]);
  const [newDocName, setNewDocName] = useState("");
  const [newDocContent, setNewDocContent] = useState("");
  const [isAddingDoc, setIsAddingDoc] = useState(false);
  const [filterStage, setFilterStage] = useState<string>("ALL");

  const fetchRuns = async () => {
    try {
      const res = await fetch("/api/agent-runs");
      if (res.ok) {
        const data = await res.json();
        setRuns(data);
        if (data.length > 0 && !currentRun) {
          fetchRunDetails(data[0].id);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchRunDetails = async (runId: string) => {
    try {
      const res = await fetch(`/api/agent-runs/${runId}`);
      if (res.ok) {
        const data = await res.json();
        setCurrentRun(data);
        if (data.tasks?.length > 0) {
          const firstPending = data.tasks.find((t: AgentTask) => t.status === "PENDING_REVIEW") || data.tasks[0];
          setSelectedTask(firstPending);
          setProposalEdit(firstPending.proposalDraft || "");
        } else {
          setSelectedTask(null);
          setProposalEdit("");
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchSources = async () => {
    try {
      const res = await fetch("/api/sources");
      if (res.ok) {
        const data = await res.json();
        setSources(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchDocs = async () => {
    try {
      const res = await fetch("/api/documents");
      if (res.ok) {
        const data = await res.json();
        setDocs(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchRuns();
    fetchSources();
    fetchDocs();
  }, []);

  const handleStartRun = async () => {
    if (!command.trim()) return;
    setSubmitting(true);
    onShowToast("Agent initialized: Planning & Collecting…");
    try {
      const res = await fetch("/api/agent-runs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command }),
      });
      if (res.ok) {
        const newRun = await res.json();
        setCommand("");
        onShowToast(`Agent Run completed with ${newRun.tasks?.length || 0} evaluated opportunities!`);
        fetchRuns();
        fetchRunDetails(newRun.id);
      } else {
        const err = await res.json();
        onShowToast(err.error || "Failed to start run", "error");
      }
    } catch (err: any) {
      onShowToast(err?.message || "Failed to contact agent", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleTaskAction = async (taskId: string, status: "APPROVED" | "REJECTED", draft?: string) => {
    try {
      const res = await fetch(`/api/agent-tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          proposalDraft: draft !== undefined ? draft : proposalEdit,
        }),
      });
      if (res.ok) {
        onShowToast(`Task ${status.toLowerCase()} successfully`);
        if (currentRun) {
          fetchRunDetails(currentRun.id);
        }
      }
    } catch (err: any) {
      onShowToast("Failed to update task", "error");
    }
  };

  const handleSaveDoc = async () => {
    if (!newDocName.trim() || !newDocContent.trim()) return;
    try {
      const res = await fetch("/api/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newDocName,
          type: "PROPOSAL_GUIDE",
          content: newDocContent,
        }),
      });
      if (res.ok) {
        onShowToast("Guide saved to Knowledge Base");
        setNewDocName("");
        setNewDocContent("");
        setIsAddingDoc(false);
        fetchDocs();
      }
    } catch {
      onShowToast("Failed to save document", "error");
    }
  };

  const handleToggleSource = async (key: string, currentEnabled: boolean) => {
    try {
      const res = await fetch(`/api/sources/${key}/toggle`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: !currentEnabled }),
      });
      if (res.ok) {
        onShowToast(`Source ${key} toggled`);
        fetchSources();
      }
    } catch {
      onShowToast("Failed to toggle source", "error");
    }
  };

  const filteredTasks = currentRun?.tasks.filter((t) => {
    if (filterStage === "ALL") return true;
    if (filterStage === "PENDING") return t.status === "PENDING_REVIEW";
    if (filterStage === "APPROVED") return t.status === "APPROVED";
    if (filterStage === "REJECTED") return t.status === "REJECTED";
    return true;
  }) || [];

  return (
    <div className="space-y-6">
      {/* ── Top Header & Command Intake Bar ────────────────── */}
      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-dark-900 via-dark-850 to-accent-950/20 p-6 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent-500/10 text-accent-400 border border-accent-500/20 text-xs font-semibold mb-2">
              <Sparkles size={13} />
              Autonomous Freelance Discovery & Grounding
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
              <Bot className="text-accent-400" size={28} />
              Agent Workspace
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Issue high-level natural language instructions. The agent plans, fetches across isolated adapters, scores against your verified profile, and generates grounded proposals for your approval.
            </p>
          </div>
        </div>

        {/* Command Input Box */}
        <div className="mt-2 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <input
              type="text"
              value={command}
              onChange={(e) => setCommand(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !submitting && handleStartRun()}
              placeholder="e.g., 'Find 5 React and TypeScript web gigs on Mostaql with high budgets'..."
              className="w-full pl-11 pr-4 py-3 rounded-xl bg-dark-800/80 border border-white/10 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-accent-500 focus:ring-1 focus:ring-accent-500 transition-all"
            />
            <Search className="absolute left-3.5 top-3.5 text-slate-400" size={18} />
          </div>
          <button
            onClick={handleStartRun}
            disabled={submitting || !command.trim()}
            className="px-6 py-3 rounded-xl bg-accent-600 hover:bg-accent-500 text-white font-medium text-sm flex items-center justify-center gap-2 shadow-lg shadow-accent-600/30 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
          >
            {submitting ? (
              <>
                <RefreshCw size={16} className="animate-spin" />
                Orchestrating...
              </>
            ) : (
              <>
                <Send size={16} />
                Execute Instruction
              </>
            )}
          </button>
        </div>

        {/* Preset Prompt Suggestions */}
        <div className="flex flex-wrap items-center gap-2 mt-4 text-xs text-slate-400">
          <span className="text-slate-500">Quick intents:</span>
          {[
            "Find 5 Frontend React gigs on Mostaql",
            "Collect Fullstack Node.js projects from all sources",
            "Look for Remote React or Python jobs with good fit",
          ].map((preset) => (
            <button
              key={preset}
              onClick={() => setCommand(preset)}
              className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 border border-white/5 transition-colors cursor-pointer"
            >
              {preset}
            </button>
          ))}
        </div>
      </div>

      {/* ── Main Workspace Body ────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Runs History & Knowledge/Sources (4 Cols) */}
        <div className="lg:col-span-4 space-y-6">
          {/* Agent Runs History */}
          <div className="rounded-2xl border border-white/8 bg-dark-900/60 p-5 backdrop-blur-sm">
            <h3 className="text-sm font-semibold text-white flex items-center justify-between mb-3">
              <span className="flex items-center gap-2">
                <Clock size={16} className="text-accent-400" />
                Run History
              </span>
              <button
                onClick={fetchRuns}
                className="text-xs text-slate-400 hover:text-slate-200 transition-colors"
              >
                Refresh
              </button>
            </h3>

            <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
              {runs.length === 0 ? (
                <div className="text-xs text-slate-500 py-4 text-center">
                  No previous runs. Enter an instruction above to trigger the agent.
                </div>
              ) : (
                runs.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => {
                      setCurrentRun(r);
                      fetchRunDetails(r.id);
                    }}
                    className={`w-full text-left p-3 rounded-xl border text-xs transition-all cursor-pointer ${
                      currentRun?.id === r.id
                        ? "bg-accent-500/10 border-accent-500/30 text-white"
                        : "bg-dark-800/40 border-white/5 text-slate-300 hover:bg-dark-800/80"
                    }`}
                  >
                    <div className="font-medium truncate mb-1 text-slate-200">
                      "{r.command}"
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-500">
                      <span>{new Date(r.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      <span className="px-2 py-0.5 rounded-full bg-white/5 border border-white/5 text-slate-400 font-mono">
                        {r.status}
                      </span>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Sources Control Panel */}
          <div className="rounded-2xl border border-white/8 bg-dark-900/60 p-5 backdrop-blur-sm">
            <h3 className="text-sm font-semibold text-white flex items-center justify-between mb-3">
              <span className="flex items-center gap-2">
                <Database size={16} className="text-emerald-400" />
                Source Adapters
              </span>
              <button onClick={fetchSources} className="text-xs text-slate-400 hover:text-slate-200">
                Check
              </button>
            </h3>
            <div className="space-y-2">
              {sources.map((s) => (
                <div
                  key={s.key}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-dark-800/40 border border-white/5 text-xs"
                >
                  <div>
                    <div className="font-medium text-slate-200 flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full ${s.isHealthy ? 'bg-emerald-400 shadow-sm shadow-emerald-400/50' : 'bg-rose-400'}`} />
                      {s.name}
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5">
                      {s.latencyMs ? `${s.latencyMs}ms latency` : "Ready"} • failures: {s.failureCount}
                    </div>
                  </div>
                  <button
                    onClick={() => handleToggleSource(s.key, s.enabled)}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold uppercase tracking-wider transition-all cursor-pointer ${
                      s.enabled
                        ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                        : "bg-slate-800 text-slate-500 border border-white/5"
                    }`}
                  >
                    {s.enabled ? "Active" : "Disabled"}
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Proposal Grounding Guides */}
          <div className="rounded-2xl border border-white/8 bg-dark-900/60 p-5 backdrop-blur-sm">
            <h3 className="text-sm font-semibold text-white flex items-center justify-between mb-3">
              <span className="flex items-center gap-2">
                <FileText size={16} className="text-cyan-400" />
                Grounding Knowledge Base
              </span>
              <button
                onClick={() => setIsAddingDoc(!isAddingDoc)}
                className="text-xs text-accent-400 hover:text-accent-300 font-medium"
              >
                {isAddingDoc ? "Cancel" : "+ Add Guide"}
              </button>
            </h3>

            {isAddingDoc && (
              <div className="mb-3 p-3 rounded-xl bg-dark-800/80 border border-white/10 space-y-2 text-xs">
                <input
                  type="text"
                  placeholder="Doc title (e.g., My Upwork Proposal Blueprint)"
                  value={newDocName}
                  onChange={(e) => setNewDocName(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-dark-900 border border-white/10 text-white placeholder-slate-500"
                />
                <textarea
                  placeholder="Paste proposal guidelines, rules, portfolio links, or preferred structure here..."
                  value={newDocContent}
                  onChange={(e) => setNewDocContent(e.target.value)}
                  rows={3}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-dark-900 border border-white/10 text-white placeholder-slate-500 text-xs"
                />
                <button
                  onClick={handleSaveDoc}
                  className="w-full py-1.5 rounded-lg bg-accent-600 hover:bg-accent-500 text-white font-medium cursor-pointer"
                >
                  Save Guide
                </button>
              </div>
            )}

            <div className="space-y-1.5">
              {docs.map((d) => (
                <div
                  key={d.id}
                  className="flex items-center justify-between p-2 rounded-lg bg-dark-800/30 border border-white/5 text-xs text-slate-300"
                >
                  <span className="truncate">{d.name}</span>
                  <span className="text-[10px] text-slate-500 px-1.5 py-0.5 rounded bg-white/5">
                    {d.type}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Opportunities Review Queue & Grounded Proposal Inspection (8 Cols) */}
        <div className="lg:col-span-8 space-y-6">
          {/* Opportunities Evaluation Queue Header */}
          <div className="rounded-2xl border border-white/8 bg-dark-900/60 p-5 backdrop-blur-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div>
                <h2 className="text-base font-semibold text-white flex items-center gap-2">
                  <ShieldCheck size={18} className="text-accent-400" />
                  Candidate Queue & Human-in-the-Loop Review
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Inspect agent fit scores, grounded proposals, and approve or reject before application.
                </p>
              </div>
              <div className="flex items-center gap-1.5 bg-dark-800/60 p-1 rounded-xl border border-white/5 text-xs">
                {["ALL", "PENDING", "APPROVED", "REJECTED"].map((st) => (
                  <button
                    key={st}
                    onClick={() => setFilterStage(st)}
                    className={`px-3 py-1 rounded-lg font-medium transition-all cursor-pointer ${
                      filterStage === st
                        ? "bg-accent-600 text-white shadow-sm"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>

            {/* Opportunities List */}
            {filteredTasks.length === 0 ? (
              <div className="py-12 text-center text-slate-500 text-sm">
                No candidate tasks matching filter in this run. Start a new run or select another from history.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-5 max-h-[300px] overflow-y-auto pr-1">
                {filteredTasks.map((t) => {
                  const isSelected = selectedTask?.id === t.id;
                  const score = t.score ?? 0;
                  const scoreColor =
                    score >= 80 ? "text-emerald-400 border-emerald-500/20 bg-emerald-500/10" :
                    score >= 60 ? "text-amber-400 border-amber-500/20 bg-amber-500/10" :
                    "text-rose-400 border-rose-500/20 bg-rose-500/10";

                  return (
                    <div
                      key={t.id}
                      onClick={() => {
                        setSelectedTask(t);
                        setProposalEdit(t.proposalDraft || "");
                      }}
                      className={`p-3.5 rounded-xl border transition-all cursor-pointer text-left ${
                        isSelected
                          ? "bg-accent-500/10 border-accent-500/40 shadow-md shadow-accent-500/5"
                          : "bg-dark-800/40 border-white/5 hover:border-white/10 hover:bg-dark-800/80"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <span className={`px-2 py-0.5 rounded-md text-[11px] font-bold border ${scoreColor}`}>
                          {score}% Match
                        </span>
                        <span className="text-[10px] text-slate-400 uppercase tracking-wider bg-white/5 px-2 py-0.5 rounded border border-white/5">
                          {t.opportunity.sourceKey}
                        </span>
                      </div>
                      <h4 className="text-xs font-semibold text-white line-clamp-1 mb-1">
                        {t.opportunity.title}
                      </h4>
                      <p className="text-[11px] text-slate-400 line-clamp-2 mb-2">
                        {t.opportunity.description}
                      </p>
                      <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-white/5">
                        <span>{t.opportunity.budget || "Budget negotiable"}</span>
                        <span className="font-semibold text-slate-300">
                          {t.status === "APPROVED" && <span className="text-emerald-400">Approved ✓</span>}
                          {t.status === "REJECTED" && <span className="text-rose-400">Rejected ✗</span>}
                          {t.status === "PENDING_REVIEW" && <span className="text-amber-400">Pending Review</span>}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Selected Task Details & Grounded Proposal Editor */}
            {selectedTask && (
              <div className="border-t border-white/10 pt-5 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <span>{selectedTask.opportunity.title}</span>
                      <a
                        href={selectedTask.opportunity.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-accent-400 hover:text-accent-300"
                      >
                        <ExternalLink size={14} />
                      </a>
                    </h3>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400 mt-1">
                      <span>Source: <strong className="text-slate-200">{selectedTask.opportunity.sourceKey}</strong></span>
                      <span>•</span>
                      <span>Budget: <strong className="text-slate-200">{selectedTask.opportunity.budget || "N/A"}</strong></span>
                      <span>•</span>
                      <span>Fit: <strong className="text-emerald-400">{selectedTask.score}%</strong></span>
                    </div>
                  </div>

                  {/* Approve / Reject Controls */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleTaskAction(selectedTask.id, "REJECTED")}
                      className="px-3.5 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
                    >
                      <XCircle size={15} />
                      Reject
                    </button>
                    <button
                      onClick={() => handleTaskAction(selectedTask.id, "APPROVED")}
                      className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-lg shadow-emerald-600/30 transition-all cursor-pointer"
                    >
                      <CheckCircle2 size={15} />
                      Approve Application
                    </button>
                  </div>
                </div>

                {/* Fit Reasoning & Risks */}
                {(selectedTask.recommendationReason || selectedTask.riskWarnings) && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                    {selectedTask.recommendationReason && (
                      <div className="p-3 rounded-xl bg-dark-800/60 border border-white/5">
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-accent-400 block mb-1">
                          Agent Fit Assessment
                        </span>
                        <p className="text-slate-300 leading-relaxed">
                          {selectedTask.recommendationReason}
                        </p>
                      </div>
                    )}
                    {selectedTask.riskWarnings && (
                      <div className="p-3 rounded-xl bg-rose-500/5 border border-rose-500/15">
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-rose-400 block mb-1 flex items-center gap-1">
                          <AlertTriangle size={12} />
                          Risk & Boundary Warnings
                        </span>
                        <p className="text-slate-300 leading-relaxed">
                          {selectedTask.riskWarnings}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Proposal Editor (Grounded) */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <label className="font-semibold text-slate-300 flex items-center gap-1.5">
                      <FileText size={14} className="text-accent-400" />
                      Grounded AI Proposal Draft (Editable)
                    </label>
                    <span className="text-[11px] text-slate-500">
                      Grounded strictly in verified skills & knowledge base guidelines
                    </span>
                  </div>
                  <textarea
                    rows={7}
                    value={proposalEdit}
                    onChange={(e) => setProposalEdit(e.target.value)}
                    className="w-full p-3.5 rounded-xl bg-dark-800/80 border border-white/10 text-white placeholder-slate-500 text-xs font-mono leading-relaxed focus:outline-none focus:border-accent-500 focus:ring-1 focus:ring-accent-500 transition-all"
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => handleTaskAction(selectedTask.id, "APPROVED", proposalEdit)}
                      className="px-3.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10 text-xs font-medium cursor-pointer"
                    >
                      Save Draft Changes
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
