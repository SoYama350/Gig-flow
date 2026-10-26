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
  Trash2,
  Edit3,
  Eye,
  Save,
  X,
  CreditCard,
  Zap,
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
  proposal?: string | null;
  proposalDraft?: string | null;
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
  extractedText?: string;
  updatedAt: string;
}

interface QuotaStatus {
  allowed: boolean;
  usedToday: number;
  remainingFree: number;
  credits: number;
  tier: string;
  limit: number;
  message?: string;
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
  const [isEditingProposal, setIsEditingProposal] = useState(false);
  const [sources, setSources] = useState<SourceHealth[]>([]);
  const [docs, setDocs] = useState<UserDoc[]>([]);
  const [newDocName, setNewDocName] = useState("");
  const [newDocContent, setNewDocContent] = useState("");
  const [isAddingDoc, setIsAddingDoc] = useState(false);
  const [filterStage, setFilterStage] = useState<string>("ALL");
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Quota & credits state
  const [quota, setQuota] = useState<QuotaStatus | null>(null);

  // Document modal (View & Edit)
  const [activeDocModal, setActiveDocModal] = useState<UserDoc | null>(null);
  const [docModalName, setDocModalName] = useState("");
  const [docModalText, setDocModalText] = useState("");
  const [savingDocModal, setSavingDocModal] = useState(false);

  const fetchQuota = async () => {
    try {
      const res = await fetch("/api/user/ai-quota");
      if (res.ok) {
        const data = await res.json();
        setQuota(data);
      }
    } catch (e) {
      console.error("Failed to fetch quota:", e);
    }
  };

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
            data.tasks.find((task: AgentTask) => task.status === "PENDING_REVIEW") || data.tasks[0];
          setSelectedTask(firstPending);
          setProposalEdit(firstPending.proposal || firstPending.proposalDraft || "");
          setIsEditingProposal(false);
        } else {
          setSelectedTask(null);
          setProposalEdit("");
          setIsEditingProposal(false);
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
    fetchQuota();
    fetchRuns();
    fetchSources();
    fetchDocs();
  }, []);

  const handleStartRun = async () => {
    if (!command.trim()) return;

    // Check quota locally
    if (quota && !quota.allowed) {
      onShowToast(t.quotaExceeded, "error");
      return;
    }

    setSubmitting(true);
    onShowToast(t.agentInitToast);
    try {
      const res = await fetch("/api/agent-runs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          instruction: command.trim(),
          command: command.trim(),
        }),
      });

      if (res.ok) {
        const newRun = await res.json();
        setCommand("");
        onShowToast(t.agentDoneToast);
        fetchRuns();
        fetchRunDetails(newRun.id);
        fetchQuota();
      } else {
        const err = await res.json();
        onShowToast(err.error || "Failed to start run", "error");
        fetchQuota();
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
        setIsEditingProposal(false);
        if (currentRun) {
          fetchRunDetails(currentRun.id);
        }
      }
    } catch {
      onShowToast("Failed to update task", "error");
    }
  };

  const handleApproveAll = async () => {
    if (!currentRun || !currentRun.tasks || currentRun.tasks.length === 0) return;
    const taskIds = currentRun.tasks.map((t) => t.id);
    try {
      const res = await fetch(`/api/agent-runs/${currentRun.id}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskIds }),
      });
      if (res.ok) {
        onShowToast(t.batchApprovedSuccess);
        fetchRunDetails(currentRun.id);
      } else {
        const err = await res.json();
        onShowToast(err.error || "Failed to approve tasks", "error");
      }
    } catch {
      onShowToast("Failed to approve tasks", "error");
    }
  };

  const handleExecuteApplications = async () => {
    if (!currentRun) return;
    try {
      const res = await fetch(`/api/agent-runs/${currentRun.id}/execute`, {
        method: "POST",
      });
      if (res.ok) {
        onShowToast(t.applicationsExecutedSuccess);
        fetchRunDetails(currentRun.id);
      } else {
        const err = await res.json();
        onShowToast(err.error || "Failed to execute applications", "error");
      }
    } catch {
      onShowToast("Failed to execute applications", "error");
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

  const handleOpenDocModal = (doc: UserDoc) => {
    setActiveDocModal(doc);
    setDocModalName(doc.name);
    setDocModalText(doc.extractedText || "");
  };

  const handleSaveDocModal = async () => {
    if (!activeDocModal) return;
    setSavingDocModal(true);
    try {
      const res = await fetch(`/api/documents/${activeDocModal.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: docModalName.trim(),
          extractedText: docModalText,
          content: docModalText,
        }),
      });
      if (res.ok) {
        onShowToast(t.docUpdated);
        setActiveDocModal(null);
        fetchDocs();
      } else {
        onShowToast("Failed to update document", "error");
      }
    } catch {
      onShowToast("Failed to update document", "error");
    } finally {
      setSavingDocModal(false);
    }
  };

  const handleDeleteDoc = async (id: string, name: string) => {
    if (!window.confirm(`${t.confirmDeleteDoc} (${name})`)) return;
    try {
      const res = await fetch(`/api/documents/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        onShowToast(t.docDeleted);
        fetchDocs();
      } else {
        onShowToast("Failed to delete document", "error");
      }
    } catch {
      onShowToast("Failed to delete document", "error");
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

          {/* AI Usage & Subscription Plan Card */}
          {quota && (
            <div className="p-3 rounded-xl bg-dark-800/80 border border-white/10 shrink-0 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent-500 to-cyan-500 flex items-center justify-center text-white shrink-0 shadow-md">
                <Zap size={18} />
              </div>
              <div className="text-xs">
                <div className="flex items-center gap-1.5 font-semibold text-white">
                  <span>{t.quotaStatus.replace("{used}", String(quota.usedToday)).replace("{limit}", String(quota.limit))}</span>
                </div>
                <div className="text-slate-400 text-[11px] mt-0.5 flex items-center gap-2">
                  <span>
                    {language === "ar" ? "رصيد الكريديت:" : "Credits:"} <strong className="text-emerald-400 font-mono">{quota.credits}</strong>
                  </span>
                  <span>•</span>
                  <span className="text-accent-400 font-medium">
                    {quota.tier === "FREE" ? (language === "ar" ? "باقة مجانية" : "Free Plan") : quota.tier}
                  </span>
                </div>
              </div>
            </div>
          )}
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

          {/* Proposal Grounding Knowledge Base + File Upload & Document Viewer/Editor */}
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
                    className="flex items-center justify-between p-2 rounded-lg bg-dark-800/30 border border-white/5 text-xs text-slate-300 group hover:border-white/10 transition-colors"
                  >
                    <button
                      onClick={() => handleOpenDocModal(d)}
                      className="truncate flex items-center gap-1.5 flex-1 mr-2 text-start hover:text-accent-400 cursor-pointer"
                    >
                      <FileCheck size={13} className="text-emerald-400 shrink-0" />
                      <span className="truncate font-medium">{d.name}</span>
                    </button>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => handleOpenDocModal(d)}
                        className="text-slate-400 hover:text-cyan-400 p-1 rounded transition-colors cursor-pointer"
                        title={t.editDoc}
                      >
                        <Edit3 size={12} />
                      </button>
                      <button
                        onClick={() => handleDeleteDoc(d.id, d.name)}
                        className="text-slate-500 hover:text-rose-400 p-1 rounded transition-colors cursor-pointer"
                        title={t.delete}
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
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
              <div className="flex flex-wrap items-center gap-2">
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

                {currentRun && currentRun.tasks && currentRun.tasks.length > 0 && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleApproveAll}
                      className="px-3 py-1.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
                      title={t.approveAllBtn}
                    >
                      <CheckCircle2 size={13} />
                      {t.approveAllBtn}
                    </button>
                    <button
                      onClick={handleExecuteApplications}
                      className="px-3 py-1.5 rounded-xl bg-accent-600 hover:bg-accent-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-accent-600/20 transition-all cursor-pointer"
                      title={t.executeApplicationsBtn}
                    >
                      <Send size={13} />
                      {t.executeApplicationsBtn}
                    </button>
                  </div>
                )}
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
                        setProposalEdit(taskItem.proposal || taskItem.proposalDraft || "");
                        setIsEditingProposal(false);
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

            {/* Selected Task Details & Grounded Proposal Inspection */}
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

                {/* Grounded Proposal Draft: View Mode by default, Edit on Click */}
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

                  {!isEditingProposal ? (
                    /* Read-Only Display Mode */
                    <div
                      onClick={() => setIsEditingProposal(true)}
                      className="group relative p-4 rounded-xl bg-dark-800/60 border border-white/10 hover:border-accent-500/40 text-slate-200 text-xs font-mono leading-relaxed transition-all cursor-pointer whitespace-pre-wrap select-text"
                      title={t.clickToEditNotice}
                    >
                      <div className="absolute top-2.5 left-2.5 opacity-0 group-hover:opacity-100 transition-opacity bg-accent-500/20 text-accent-400 px-2 py-0.5 rounded text-[10px] font-sans flex items-center gap-1 pointer-events-none">
                        <Edit3 size={11} /> {t.editDraftBtn}
                      </div>
                      {proposalEdit || (
                        <span className="text-slate-500 italic">
                          {language === "ar" ? "لا يوجد مقترح تم توليده بعد." : "No proposal drafted yet."}
                        </span>
                      )}
                    </div>
                  ) : (
                    /* Active Edit Mode */
                    <div className="space-y-2">
                      <div className="text-[11px] text-cyan-400 flex items-center gap-1">
                        <Edit3 size={12} />
                        <span>{t.editDraftBtn}</span>
                      </div>
                      <textarea
                        rows={8}
                        value={proposalEdit}
                        onChange={(e) => setProposalEdit(e.target.value)}
                        dir="auto"
                        autoFocus
                        className="w-full p-3.5 rounded-xl bg-dark-800 border border-accent-500/50 text-white placeholder-slate-500 text-xs font-mono leading-relaxed focus:outline-none focus:ring-1 focus:ring-accent-500 transition-all"
                      />
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => setIsEditingProposal(false)}
                          className="px-3.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 text-xs font-medium cursor-pointer"
                        >
                          {t.cancel}
                        </button>
                        <button
                          onClick={() => handleTaskAction(selectedTask.id, "APPROVED", proposalEdit)}
                          className="px-4 py-1.5 rounded-xl bg-accent-600 hover:bg-accent-500 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-md shadow-accent-600/30"
                        >
                          <Save size={13} />
                          {t.saveDraft}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Document View & Edit Modal ──────────────────────── */}
      {activeDocModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="bg-dark-900 border border-white/10 rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <FileText size={16} className="text-cyan-400" />
                {t.docModalTitle}
              </h3>
              <button
                onClick={() => setActiveDocModal(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-4 space-y-3 overflow-y-auto flex-1 text-xs">
              <div>
                <label className="block text-slate-400 mb-1 font-medium">{t.docTitlePlaceholder}</label>
                <input
                  type="text"
                  value={docModalName}
                  onChange={(e) => setDocModalName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-dark-800 border border-white/10 text-white font-medium"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-medium">{t.docContentPlaceholder}</label>
                <textarea
                  rows={14}
                  value={docModalText}
                  onChange={(e) => setDocModalText(e.target.value)}
                  dir="auto"
                  className="w-full p-3 rounded-xl bg-dark-800 border border-white/10 text-white font-mono leading-relaxed resize-none focus:outline-none focus:border-accent-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 p-4 border-t border-white/10 bg-dark-850">
              <button
                onClick={() => setActiveDocModal(null)}
                className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-medium cursor-pointer"
              >
                {t.cancel}
              </button>
              <button
                onClick={handleSaveDocModal}
                disabled={savingDocModal}
                className="btn-primary px-5 py-2 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
              >
                {savingDocModal ? <RefreshCw size={13} className="animate-spin" /> : <Save size={13} />}
                {t.saveChanges}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
