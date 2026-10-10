import { useState, useEffect, useRef } from "react";
import {
  Bot,
  Sparkles,
  Search,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Send,
  FileText,
  ThumbsUp,
  XCircle,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  Database,
  UploadCloud,
  FileCheck,
} from "lucide-react";
import { translations, Language } from "../i18n";

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
  instruction: string;
  command?: string;
  status: string;
  createdAt: string;
  tasks: AgentTask[];
}

interface SourceHealth {
  key: string;
  name: string;
  enabled: boolean;
  isHealthy: boolean;
  latencyMs?: number;
  failureCount: number;
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
  language = "ar",
}: {
  onShowToast: (msg: string, type?: "success" | "error") => void;
  userSkills?: string[];
  language?: Language;
}) {
  const t = translations[language] || translations.ar;
  const isRtl = language === "ar";

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
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
          const firstPending =
            data.tasks.find((t: AgentTask) => t.status === "PENDING_REVIEW") || data.tasks[0];
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
    onShowToast(t.agentInitToast);
    try {
      const storedKey = typeof localStorage !== "undefined"
        ? (JSON.parse(localStorage.getItem("gigflow_settings") || "{}")?.apiKey || "")
        : "";

      const res = await fetch("/api/agent-runs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          instruction: command.trim(),
          command: command.trim(),
          apiKey: storedKey,
        }),
      });
      if (res.ok) {
        const newRun = await res.json();
        setCommand("");
        onShowToast(t.agentDoneToast);
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
          proposalStatus: status,
          proposal: draft !== undefined ? draft : proposalEdit,
          proposalDraft: draft !== undefined ? draft : proposalEdit,
        }),
      });
      if (res.ok) {
        onShowToast(status === "APPROVED" ? t.taskApproved : t.taskRejected);
        if (currentRun) {
          fetchRunDetails(currentRun.id);
        }
      }
    } catch {
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
          name: newDocName.trim(),
          type: "PROPOSAL_GUIDE",
          content: newDocContent.trim(),
          extractedText: newDocContent.trim(),
        }),
      });
      if (res.ok) {
        onShowToast(t.guideSaved);
        setNewDocName("");
        setNewDocContent("");
        setIsAddingDoc(false);
        fetchDocs();
      }
    } catch {
      onShowToast("Failed to save document", "error");
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingFile(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        if (!text) throw new Error("Empty file content");

        const res = await fetch("/api/documents", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: file.name,
            type: "UPLOADED_GUIDE",
            content: text,
            extractedText: text,
          }),
        });

        if (res.ok) {
          onShowToast(`${t.fileUploadedSuccess}: ${file.name}`);
          fetchDocs();
          if (fileInputRef.current) fileInputRef.current.value = "";
        } else {
          const err = await res.json();
          onShowToast(err.error || "Failed to upload document", "error");
        }
      } catch (err: any) {
        onShowToast(err.message || "Failed to parse file", "error");
      } finally {
        setIsUploadingFile(false);
      }
    };

    reader.onerror = () => {
      onShowToast("Could not read local file", "error");
      setIsUploadingFile(false);
    };

    reader.readAsText(file);
  };

  const handleToggleSource = async (key: string, currentEnabled: boolean) => {
    try {
      const res = await fetch(`/api/sources/${key}/toggle`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: !currentEnabled }),
      });
      if (res.ok) {
        onShowToast(t.sourceToggled);
        fetchSources();
      }
    } catch {
      onShowToast("Failed to toggle source", "error");
    }
  };

  const filteredTasks =
    currentRun?.tasks.filter((task) => {
      if (filterStage === "ALL") return true;
      if (filterStage === "PENDING") return task.status === "PENDING_REVIEW";
      if (filterStage === "APPROVED") return task.status === "APPROVED";
      if (filterStage === "REJECTED") return task.status === "REJECTED";
      return true;
    }) || [];

  return (
    <div className={`space-y-6 ${isRtl ? "text-right" : "text-left"}`}>
      {/* ── Top Header & Command Intake Bar ────────────────── */}
      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-dark-900 via-dark-850 to-accent-950/20 p-6 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent-500/10 text-accent-400 border border-accent-500/20 text-xs font-semibold mb-2">
              <Sparkles size={13} />
              {t.agentBadge}
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
              <Bot className="text-accent-400" size={28} />
              {t.agentTitle}
            </h1>
            <p className="text-sm text-slate-400 mt-1 max-w-3xl leading-relaxed">
              {t.agentSubtitle}
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
              placeholder={t.commandPlaceholder}
              className={`w-full py-3.5 rounded-xl bg-dark-800/80 border border-white/10 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-accent-500 focus:ring-1 focus:ring-accent-500 transition-all ${
                isRtl ? "pr-11 pl-4" : "pl-11 pr-4"
              }`}
            />
            <Search
              className={`absolute top-4 text-slate-400 ${isRtl ? "right-3.5" : "left-3.5"}`}
              size={18}
            />
          </div>
          <button
            onClick={handleStartRun}
            disabled={submitting || !command.trim()}
            className="px-6 py-3.5 rounded-xl bg-accent-600 hover:bg-accent-500 text-white font-medium text-sm flex items-center justify-center gap-2 shadow-lg shadow-accent-600/30 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
          >
            {submitting ? (
              <>
                <RefreshCw size={16} className="animate-spin" />
                {t.orchestrating}
              </>
            ) : (
              <>
                <Send size={16} className={isRtl ? "rotate-180" : ""} />
                {t.executeInstruction}
              </>
            )}
          </button>
        </div>

        {/* Preset Prompt Suggestions */}
        <div className="flex flex-wrap items-center gap-2 mt-4 text-xs text-slate-400">
          <span className="text-slate-500 font-medium">{t.quickIntents}</span>
          {[t.intent1, t.intent2, t.intent3].map((preset, i) => (
            <button
              key={i}
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
        {/* Column 1: Runs History & Knowledge / Sources (4 Cols) */}
        <div className="lg:col-span-4 space-y-6">
          {/* Agent Runs History */}
          <div className="rounded-2xl border border-white/8 bg-dark-900/60 p-5 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <Clock size={16} className="text-accent-400" />
                {t.runHistory}
              </h3>
              <button
                onClick={fetchRuns}
                className="text-xs text-slate-400 hover:text-slate-200 transition-colors"
              >
                {t.refresh}
              </button>
            </div>

            <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
              {runs.length === 0 ? (
                <div className="text-xs text-slate-500 py-4 text-center">
                  {t.noRuns}
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
                      "{r.instruction || r.command}"
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-500">
                      <span>{new Date(r.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
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
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <Database size={16} className="text-emerald-400" />
                {t.sourceAdapters}
              </h3>
              <button onClick={fetchSources} className="text-xs text-slate-400 hover:text-slate-200">
                {t.check}
              </button>
            </div>
            <div className="space-y-2">
              {sources.map((s) => (
                <div
                  key={s.key}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-dark-800/40 border border-white/5 text-xs"
                >
                  <div>
                    <div className="font-medium text-slate-200 flex items-center gap-1.5">
                      <span
                        className={`w-2 h-2 rounded-full ${
                          s.isHealthy ? "bg-emerald-400 shadow-sm shadow-emerald-400/50" : "bg-rose-400"
                        }`}
                      />
                      {s.name}
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5">
                      {s.latencyMs ? `${s.latencyMs}ms ${t.latency}` : t.ready} • {t.failures}: {s.failureCount}
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
                    {s.enabled ? t.active : t.disabled}
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Proposal Grounding Knowledge Base + File Upload */}
          <div className="rounded-2xl border border-white/8 bg-dark-900/60 p-5 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <FileText size={16} className="text-cyan-400" />
                {t.groundingKb}
              </h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploadingFile}
                  className="text-xs text-emerald-400 hover:text-emerald-300 font-medium flex items-center gap-1 cursor-pointer"
                  title="Upload text, markdown, or PDF file"
                >
                  <UploadCloud size={14} />
                  {isUploadingFile ? "..." : t.uploadFile}
                </button>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept=".txt,.md,.pdf,.json"
                  className="hidden"
                />
                <button
                  onClick={() => setIsAddingDoc(!isAddingDoc)}
                  className="text-xs text-accent-400 hover:text-accent-300 font-medium cursor-pointer"
                >
                  {isAddingDoc ? t.cancel : t.addGuide}
                </button>
              </div>
            </div>

            {isAddingDoc && (
              <div className="mb-3 p-3 rounded-xl bg-dark-800/80 border border-white/10 space-y-2 text-xs">
                <input
                  type="text"
                  placeholder={t.docTitlePlaceholder}
                  value={newDocName}
                  onChange={(e) => setNewDocName(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-dark-900 border border-white/10 text-white placeholder-slate-500"
                />
                <textarea
                  placeholder={t.docContentPlaceholder}
                  value={newDocContent}
                  onChange={(e) => setNewDocContent(e.target.value)}
                  rows={3}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-dark-900 border border-white/10 text-white placeholder-slate-500 text-xs"
                />
                <button
                  onClick={handleSaveDoc}
                  className="w-full py-1.5 rounded-lg bg-accent-600 hover:bg-accent-500 text-white font-medium cursor-pointer"
                >
                  {t.saveGuide}
                </button>
              </div>
            )}

            <div className="space-y-1.5 max-h-[180px] overflow-y-auto pr-1">
              {docs.length === 0 ? (
                <div className="text-xs text-slate-500 py-3 text-center">
                  {t.dropOrClick}
                </div>
              ) : (
                docs.map((d) => (
                  <div
                    key={d.id}
                    className="flex items-center justify-between p-2 rounded-lg bg-dark-800/30 border border-white/5 text-xs text-slate-300"
                  >
                    <span className="truncate flex items-center gap-1.5">
                      <FileCheck size={13} className="text-emerald-400 shrink-0" />
                      {d.name}
                    </span>
                    <span className="text-[10px] text-slate-500 px-1.5 py-0.5 rounded bg-white/5 shrink-0">
                      {d.type}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Column 2: Opportunities Review Queue & Grounded Proposal Inspection (8 Cols) */}
        <div className="lg:col-span-8 space-y-6">
          <div className="rounded-2xl border border-white/8 bg-dark-900/60 p-5 backdrop-blur-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div>
                <h2 className="text-base font-semibold text-white flex items-center gap-2">
                  <ShieldCheck size={18} className="text-accent-400" />
                  {t.candidateQueue}
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  {t.candidateSubtitle}
                </p>
              </div>
              <div className="flex items-center gap-1.5 bg-dark-800/60 p-1 rounded-xl border border-white/5 text-xs">
                {[
                  { id: "ALL", label: t.filterAll },
                  { id: "PENDING", label: t.filterPending },
                  { id: "APPROVED", label: t.filterApproved },
                  { id: "REJECTED", label: t.filterRejected },
                ].map((st) => (
                  <button
                    key={st.id}
                    onClick={() => setFilterStage(st.id)}
                    className={`px-3 py-1 rounded-lg font-medium transition-all cursor-pointer ${
                      filterStage === st.id
                        ? "bg-accent-600 text-white shadow-sm"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    {st.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Opportunities List */}
            {filteredTasks.length === 0 ? (
              <div className="py-12 text-center text-slate-500 text-sm">
                {t.noTasks}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-5 max-h-[300px] overflow-y-auto pr-1">
                {filteredTasks.map((taskItem) => {
                  const isSelected = selectedTask?.id === taskItem.id;
                  const score = taskItem.score ?? 0;
                  const scoreColor =
                    score >= 80
                      ? "text-emerald-400 border-emerald-500/20 bg-emerald-500/10"
                      : score >= 60
                      ? "text-amber-400 border-amber-500/20 bg-amber-500/10"
                      : "text-rose-400 border-rose-500/20 bg-rose-500/10";

                  return (
                    <div
                      key={taskItem.id}
                      onClick={() => {
                        setSelectedTask(taskItem);
                        setProposalEdit(taskItem.proposalDraft || "");
                      }}
                      className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                        isSelected
                          ? "bg-accent-500/10 border-accent-500/40 shadow-md shadow-accent-500/5"
                          : "bg-dark-800/40 border-white/5 hover:border-white/10 hover:bg-dark-800/80"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <span className={`px-2 py-0.5 rounded-md text-[11px] font-bold border ${scoreColor}`}>
                          {score}% {t.match}
                        </span>
                        <span className="text-[10px] text-slate-400 uppercase tracking-wider bg-white/5 px-2 py-0.5 rounded border border-white/5">
                          {taskItem.opportunity.sourceKey}
                        </span>
                      </div>
                      <h4 className="text-xs font-semibold text-white line-clamp-1 mb-1">
                        {taskItem.opportunity.title}
                      </h4>
                      <p className="text-[11px] text-slate-400 line-clamp-2 mb-2">
                        {taskItem.opportunity.description}
                      </p>
                      <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-white/5">
                        <span>{taskItem.opportunity.budget || t.budgetNegotiable}</span>
                        <span className="font-semibold text-slate-300">
                          {taskItem.status === "APPROVED" && <span className="text-emerald-400">{t.approvedBadge}</span>}
                          {taskItem.status === "REJECTED" && <span className="text-rose-400">{t.rejectedBadge}</span>}
                          {taskItem.status === "PENDING_REVIEW" && (
                            <span className="text-amber-400">{t.pendingBadge}</span>
                          )}
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
                      <span>
                        {t.source}: <strong className="text-slate-200">{selectedTask.opportunity.sourceKey}</strong>
                      </span>
                      <span>•</span>
                      <span>
                        {t.budget}: <strong className="text-slate-200">{selectedTask.opportunity.budget || "N/A"}</strong>
                      </span>
                      <span>•</span>
                      <span>
                        {t.fit}: <strong className="text-emerald-400">{selectedTask.score}%</strong>
                      </span>
                    </div>
                  </div>

                  {/* Approve / Reject Controls */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleTaskAction(selectedTask.id, "REJECTED")}
                      className="px-3.5 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
                    >
                      <XCircle size={15} />
                      {t.rejectBtn}
                    </button>
                    <button
                      onClick={() => handleTaskAction(selectedTask.id, "APPROVED")}
                      className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-lg shadow-emerald-600/30 transition-all cursor-pointer"
                    >
                      <CheckCircle2 size={15} />
                      {t.approveBtn}
                    </button>
                  </div>
                </div>

                {/* Fit Reasoning & Risks */}
                {(selectedTask.recommendationReason || selectedTask.riskWarnings) && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                    {selectedTask.recommendationReason && (
                      <div className="p-3 rounded-xl bg-dark-800/60 border border-white/5">
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-accent-400 block mb-1">
                          {t.agentFitAssessment}
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
                          {t.riskWarnings}
                        </span>
                        <p className="text-slate-300 leading-relaxed">
                          {selectedTask.riskWarnings}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Grounded Proposal Editor */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <label className="font-semibold text-slate-300 flex items-center gap-1.5">
                      <FileText size={14} className="text-accent-400" />
                      {t.groundedDraft}
                    </label>
                    <span className="text-[11px] text-slate-500">
                      {t.groundedNotice}
                    </span>
                  </div>
                  <textarea
                    rows={7}
                    value={proposalEdit}
                    onChange={(e) => setProposalEdit(e.target.value)}
                    dir="auto"
                    className="w-full p-3.5 rounded-xl bg-dark-800/80 border border-white/10 text-white placeholder-slate-500 text-xs font-mono leading-relaxed focus:outline-none focus:border-accent-500 focus:ring-1 focus:ring-accent-500 transition-all"
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => handleTaskAction(selectedTask.id, "APPROVED", proposalEdit)}
                      className="px-3.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10 text-xs font-medium cursor-pointer"
                    >
                      {t.saveDraft}
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
