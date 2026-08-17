import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { Key, Clock, Globe, Save, CheckCircle2, RefreshCw, Shield, ChevronRight } from "lucide-react";
import { getSettings, saveSettings, deleteAllGigs } from "../services/storage";

interface SettingsProps {
  onShowToast: (msg: string, type?: "success" | "error") => void;
  onSettingsSaved?: () => void;
}

const SCRAPE_INTERVALS = [
  { label: "Off", value: 0 },
  { label: "Every 15 min", value: 15 },
  { label: "Every 30 min", value: 30 },
  { label: "Every 1 hour", value: 60 },
  { label: "Every 2 hours", value: 120 },
  { label: "Every 6 hours", value: 360 },
];

export default function Settings({ onShowToast, onSettingsSaved }: SettingsProps) {
  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [scrapeInterval, setScrapeInterval] = useState(0);
  const [platform, setPlatform] = useState("mostaql");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    getSettings().then((s) => {
      setApiKey(s.apiKey || "");
      setScrapeInterval(s.scrapeInterval || 0);
      setPlatform(s.platform || "mostaql");
    });
  }, []);

  const handleSave = async () => {
    const settings = { apiKey, scrapeInterval, platform };
    await saveSettings(settings);
    
    // Notify background worker to reschedule alarm
    chrome.runtime.sendMessage({ type: "RESCHEDULE_ALARM" }, () => {
      // Ignore runtime.lastError if background script is not active
      if (chrome.runtime.lastError) {
        console.warn("Could not reschedule alarm: background script inactive");
      }
    });

    setSaved(true);
    onShowToast("Settings saved!");
    if (onSettingsSaved) onSettingsSaved();
    setTimeout(() => setSaved(false), 2500);
  };

  const handleTestKey = async () => {
    if (!apiKey) {
      onShowToast("Enter an API key first", "error");
      return;
    }
    onShowToast("Testing API key...");
    chrome.runtime.sendMessage({ type: "TEST_KEY", apiKey }, (response) => {
      if (chrome.runtime.lastError) {
        onShowToast("Could not communicate with background script", "error");
        return;
      }
      if (response && response.valid) {
        onShowToast("API key is valid ✓");
      } else {
        onShowToast("API key is invalid or has no quota", "error");
      }
    });
  };

  const handleClearDB = async () => {
    if (!confirm("Are you sure? This will delete ALL scraped gigs. This cannot be undone.")) return;
    try {
      await deleteAllGigs();
      onShowToast("All gigs cleared from database");
    } catch {
      onShowToast("Failed to clear gigs", "error");
    }
  };

  return (
    <div className="p-6 md:p-8 max-w-2xl mx-auto animate-fade-in-up">
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">Settings</h1>
        <p className="text-slate-500 text-sm mt-1">Configure GigFlow to match your workflow</p>
      </div>

      <div className="space-y-4">
        {/* API Key */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="glass-card rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
              <Key size={15} className="text-white" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white">Gemini API Key</h2>
              <p className="text-xs text-slate-500">Required for AI proposal generation</p>
            </div>
          </div>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <input
                type={showKey ? "text" : "password"}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="AIza..."
                className="w-full bg-dark-800 border border-white/6 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-600 focus:border-accent-500/50 transition-colors font-mono"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 cursor-pointer text-xs"
              >
                {showKey ? "Hide" : "Show"}
              </button>
            </div>
            <button onClick={handleTestKey} className="btn-ghost text-xs px-3 rounded-xl cursor-pointer whitespace-nowrap flex items-center gap-1.5">
              <Shield size={14} /> Test
            </button>
          </div>
          <p className="text-xs text-slate-600">
            Get your key at{" "}
            <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-accent-400 hover:underline">
              aistudio.google.com
            </a>
            . It's free for personal use.
          </p>
        </motion.div>

        {/* Scrape Interval */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
              <Clock size={15} className="text-white" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white">Auto-Scrape Interval</h2>
              <p className="text-xs text-slate-500">Automatically fetch new gigs in the background</p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {SCRAPE_INTERVALS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setScrapeInterval(opt.value)}
                className={`py-2 px-3 rounded-xl text-xs font-medium transition-all cursor-pointer border ${
                  scrapeInterval === opt.value
                    ? "bg-accent-500/20 text-accent-400 border-accent-500/30"
                    : "bg-dark-800 text-slate-500 border-white/5 hover:text-slate-300 hover:bg-white/5"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          {scrapeInterval > 0 && (
            <p className="text-xs text-cyan-400 flex items-center gap-1.5">
              <RefreshCw size={11} className="animate-spin" />
              Will scrape every {scrapeInterval} minutes
            </p>
          )}
        </motion.div>

        {/* Platform */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="glass-card rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-accent-500 to-purple-600 flex items-center justify-center">
              <Globe size={15} className="text-white" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white">Scrape Platform</h2>
              <p className="text-xs text-slate-500">Choose which freelance platform to scrape</p>
            </div>
          </div>
          <div className="flex gap-2">
            {[
              { id: "mostaql", label: "Mostaql", desc: "Arabic freelance platform", disabled: false },
              { id: "khamsat", label: "Khamsat", desc: "Arabic community requests", disabled: false },
            ].map((p) => (
              <button
                key={p.id}
                onClick={() => !p.disabled && setPlatform(p.id)}
                disabled={p.disabled}
                className={`flex-1 p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  platform === p.id && !p.disabled
                    ? "bg-accent-500/15 border-accent-500/30"
                    : "bg-dark-800 border-white/5 opacity-50"
                } ${p.disabled ? "cursor-not-allowed" : ""}`}
              >
                <div className="text-sm font-medium text-white">{p.label}</div>
                <div className="text-xs text-slate-500 mt-0.5">{p.desc}</div>
              </button>
            ))}
          </div>
        </motion.div>

        {/* Danger Zone */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass-card rounded-2xl p-6 border border-rose-500/10">
          <h2 className="text-sm font-semibold text-rose-400 mb-4">Danger Zone</h2>
          <button
            onClick={handleClearDB}
            className="w-full py-2.5 px-4 rounded-xl border border-rose-500/20 text-rose-400 text-sm font-medium hover:bg-rose-500/10 transition-all cursor-pointer flex items-center justify-between"
          >
            <span>Clear all scraped gigs</span>
            <ChevronRight size={16} />
          </button>
        </motion.div>

        {/* Save Button */}
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.25 }}
          onClick={handleSave}
          className="btn-primary w-full flex items-center justify-center gap-2 text-sm cursor-pointer py-3"
        >
          {saved ? <CheckCircle2 size={16} /> : <Save size={16} />}
          {saved ? "Saved!" : "Save Settings"}
        </motion.button>
      </div>
    </div>
  );
}
