/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { useState, useEffect, useCallback, useRef } from "react";
import { AnimatePresence, motion } from "motion/react";
import { AlertCircle, X } from "lucide-react";
import { Routes, Route, Navigate } from "react-router-dom";
import {
  LoginForm,
  RegisterForm,
  ForgotPasswordForm,
  ResetPasswordForm,
  ProtectedRoute,
  GuestRoute,
  EmailVerificationNotice
} from "./features/auth";
import Sidebar from "./components/Sidebar";
import Dashboard from "./components/Dashboard";
import GigsFeed from "./components/GigsFeed";
import Profile from "./components/Profile";
import Settings from "./components/Settings";
import Analytics from "./components/Analytics";

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

interface Stats {
  totalGigs: number;
  newGigs: number;
  appliedGigs: number;
  archivedGigs: number;
}

// ── localStorage helpers ──────────────────────────────────
function loadProfile() {
  try {
    const raw = localStorage.getItem("gigflow_profile");
    if (!raw) return null;
    return JSON.parse(raw) as { email: string; name: string; bio: string; skills: string };
  } catch {
    return null;
  }
}

function saveProfile(profile: { email: string; name: string; bio: string; skills: string }) {
  localStorage.setItem("gigflow_profile", JSON.stringify(profile));
}

function loadLastScraped(): string | null {
  return localStorage.getItem("gigflow_lastScraped");
}

function saveLastScraped(date: string) {
  localStorage.setItem("gigflow_lastScraped", date);
}

// ── Main App ──────────────────────────────────────────────
export default function App() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [gigs, setGigs] = useState<Gig[]>([]);
  const [stats, setStats] = useState<Stats>({ totalGigs: 0, newGigs: 0, appliedGigs: 0, archivedGigs: 0 });
  const [scraping, setScraping] = useState(false);
  const [generatingFor, setGeneratingFor] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [lastScraped, setLastScraped] = useState<string | null>(loadLastScraped);
  const autoScrapeRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Profile state — restored from localStorage
  const savedProfile = loadProfile();
  const [email, setEmail] = useState(savedProfile?.email ?? "");
  const [name, setName] = useState(savedProfile?.name ?? "");
  const [bio, setBio] = useState(savedProfile?.bio ?? "");
  const [skills, setSkills] = useState(savedProfile?.skills ?? "");
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileMessage, setProfileMessage] = useState("");

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchGigs = useCallback(async () => {
    try {
      const res = await fetch("/api/gigs");
      const data = await res.json();
      setGigs(data);
    } catch (e) {
      console.error("Error fetching gigs:", e);
    }
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch("/api/stats");
      const data = await res.json();
      setStats(data);
    } catch (e) {
      console.error("Error fetching stats:", e);
    }
  }, []);

  useEffect(() => {
    fetchGigs();
    fetchStats();
  }, [fetchGigs, fetchStats]);

  // Auto-scrape interval from settings
  const initAutoScrape = useCallback(() => {
    const stored = localStorage.getItem("gigflow_settings");
    if (autoScrapeRef.current) {
      clearInterval(autoScrapeRef.current);
      autoScrapeRef.current = null;
    }
    if (!stored) return;
    const s = JSON.parse(stored);
    const minutes: number = s.scrapeInterval || 0;
    if (minutes <= 0) return;

    autoScrapeRef.current = setInterval(() => {
      triggerScrape(true);
    }, minutes * 60 * 1000);
  }, []);

  useEffect(() => {
    initAutoScrape();
    return () => {
      if (autoScrapeRef.current) clearInterval(autoScrapeRef.current);
    };
  }, [initAutoScrape]);

  // Request browser notification permission on mount
  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  // Persist profile to localStorage when any field changes
  useEffect(() => {
    saveProfile({ email, name, bio, skills });
  }, [email, name, bio, skills]);

  const triggerScrape = async (silent = false) => {
    setScraping(true);
    try {
      // Read selected platform from settings
      const settingsRaw = localStorage.getItem("gigflow_settings");
      const platform = settingsRaw ? JSON.parse(settingsRaw).platform : "mostaql";

      // Read skills from profile to pass to scraper
      const profileRaw = localStorage.getItem("gigflow_profile");
      let userSkills: string[] = [];
      if (profileRaw) {
        try {
          const profile = JSON.parse(profileRaw);
          if (profile.skills) {
            userSkills = profile.skills.split(",").map((s: string) => s.trim()).filter(Boolean);
          }
        } catch (e) {}
      }

      const res = await fetch("/api/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platform, skills: userSkills }),
      });
      const data = await res.json();
      if (res.ok) {
        const now = new Date().toISOString();
        setLastScraped(now);
        saveLastScraped(now);

        const platformName = platform === "khamsat" ? "Khamsat" : "Mostaql";

        // System notification on background scrape find
        if (silent && data.processed > 0 && "Notification" in window && Notification.permission === "granted") {
          new Notification("GigFlow Update", {
            body: `✓ Found ${data.processed} new ${platformName} opportunities!`,
            icon: "/favicon.ico",
          });
        }

        if (!silent) showToast(`✓ Scraped ${data.processed} ${platformName} gigs successfully`);
        fetchGigs();
        fetchStats();
      } else {
        if (!silent) showToast(data.error || "Scraping failed", "error");
      }
    } catch (e) {
      if (!silent) showToast("Network error during scraping", "error");
    } finally {
      setScraping(false);
    }
  };

  const handleStatusChange = async (id: string, status: string) => {
    try {
      const res = await fetch(`/api/gigs/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        setGigs((prev) => prev.map((g) => (g.id === id ? { ...g, status } : g)));
        fetchStats();
      }
    } catch (e) {
      showToast("Failed to update status", "error");
    }
  };

  const handleGenerateProposal = async (gigId: string, language?: "arabic" | "english") => {
    setGeneratingFor(gigId);
    try {
      // Prefer API key from settings if set
      const settingsRaw = localStorage.getItem("gigflow_settings");
      const settingsApiKey = settingsRaw ? JSON.parse(settingsRaw).apiKey : null;

      const userSkills = skills.split(",").map((s) => s.trim()).filter(Boolean);
      const res = await fetch("/api/generate-proposal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gigId,
          userSkills,
          userName: name,
          userBio: bio,
          apiKey: settingsApiKey || undefined,
          language
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setGigs((prev) => prev.map((g) => (g.id === gigId ? { ...g, proposal: data.proposal, status: "APPLIED" } : g)));
        fetchStats();
        showToast("✓ Proposal generated!");
      } else {
        showToast(data.error || "Generation failed", "error");
      }
    } catch (e) {
      showToast("Network error", "error");
    } finally {
      setGeneratingFor(null);
    }
  };

  const handleSaveProposal = async (gigId: string, proposal: string) => {
    try {
      const res = await fetch(`/api/gigs/${gigId}/proposal`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ proposal }),
      });
      const data = await res.json();
      if (res.ok) {
        setGigs((prev) => prev.map((g) => (g.id === gigId ? { ...g, proposal } : g)));
        showToast("✓ Proposal saved successfully");
      } else {
        showToast(data.error || "Failed to save proposal", "error");
      }
    } catch (e) {
      showToast("Network error saving proposal", "error");
    }
  };

  const handleProfileSave = async () => {
    if (!email) return;
    setProfileLoading(true);
    try {
      const skillArray = skills.split(",").map((s) => s.trim()).filter(Boolean);
      const res = await fetch("/api/user/skills", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, name, bio, skills: skillArray }),
      });
      if (res.ok) {
        setProfileMessage("Profile saved successfully!");
        showToast("✓ Profile saved");
        setTimeout(() => setProfileMessage(""), 3000);
      }
    } catch (e) {
      setProfileMessage("Failed to save profile");
    } finally {
      setProfileLoading(false);
    }
  };

  const userSkillsList = skills.split(",").map((s) => s.trim()).filter(Boolean);

  return (
    <>
      <EmailVerificationNotice />
      <Routes>
        {/* Auth Routes */}
        <Route path="/login" element={
          <GuestRoute>
            <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4 dark:bg-gray-900">
              <LoginForm />
            </div>
          </GuestRoute>
        } />
        <Route path="/register" element={
          <GuestRoute>
            <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4 dark:bg-gray-900">
              <RegisterForm />
            </div>
          </GuestRoute>
        } />
        <Route path="/forgot-password" element={
          <GuestRoute>
            <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4 dark:bg-gray-900">
              <ForgotPasswordForm />
            </div>
          </GuestRoute>
        } />
        <Route path="/reset-password" element={
          <GuestRoute>
            <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4 dark:bg-gray-900">
              <ResetPasswordForm />
            </div>
          </GuestRoute>
        } />

        {/* Protected App Routes */}
        <Route path="/*" element={
          <ProtectedRoute>
            <div className="flex h-screen w-full overflow-hidden font-sans">
              <div className="mesh-gradient" />
              <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />

              <main className="flex-1 overflow-auto min-w-0">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeTab}
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    transition={{ duration: 0.2 }}
                  >
                    {activeTab === "dashboard" && (
                      <Dashboard
                        stats={stats}
                        onNavigate={setActiveTab}
                        onScrape={() => triggerScrape()}
                        scraping={scraping}
                        lastScraped={lastScraped}
                      />
                    )}
                    {activeTab === "gigs" && (
                      <GigsFeed
                        gigs={gigs}
                        onScrape={() => triggerScrape()}
                        scraping={scraping}
                        onStatusChange={handleStatusChange}
                        onGenerateProposal={handleGenerateProposal}
                        onSaveProposal={handleSaveProposal}
                        generatingFor={generatingFor}
                        userSkills={userSkillsList}
                      />
                    )}
                    {activeTab === "analytics" && (
                      <Analytics gigs={gigs} userSkills={userSkillsList} />
                    )}
                    {activeTab === "profile" && (
                      <Profile
                        email={email} setEmail={setEmail}
                        name={name} setName={setName}
                        bio={bio} setBio={setBio}
                        skills={skills} setSkills={setSkills}
                        onSave={handleProfileSave}
                        loading={profileLoading}
                        message={profileMessage}
                      />
                    )}
                    {activeTab === "settings" && (
                      <Settings onShowToast={showToast} onSettingsSaved={initAutoScrape} />
                    )}
                  </motion.div>
                </AnimatePresence>
              </main>

              {/* Toast */}
              <AnimatePresence>
                {toast && (
                  <motion.div
                    initial={{ opacity: 0, y: 40 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 40 }}
                    className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3 rounded-xl border text-sm font-medium shadow-2xl ${
                      toast.type === "error"
                        ? "bg-rose-500/15 border-rose-500/30 text-rose-400"
                        : "bg-emerald-500/15 border-emerald-500/30 text-emerald-400"
                    }`}
                  >
                    {toast.type === "error" && <AlertCircle size={16} />}
                    {toast.message}
                    <button onClick={() => setToast(null)} className="ml-2 hover:opacity-70 cursor-pointer"><X size={14} /></button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </ProtectedRoute>
        } />
      </Routes>
    </>
  );
}
