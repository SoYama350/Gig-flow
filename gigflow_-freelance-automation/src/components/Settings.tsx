import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { Key, Clock, Globe, Save, CheckCircle2, RefreshCw, Shield, ChevronRight, MoonStar, SunMedium } from "lucide-react";
import { type Theme } from "../theme";
import { httpClient } from "../shared/api/httpClient";
import { translations, Language } from "../i18n";

interface SettingsProps {
  theme: Theme;
  onThemeChange: (theme: Theme) => void;
  onShowToast: (msg: string, type?: "success" | "error") => void;
  onSettingsSaved?: () => void;
  language?: Language;
}

export default function Settings({
  theme,
  onThemeChange,
  onShowToast,
  onSettingsSaved,
  language = "ar",
}: SettingsProps) {
  const t = translations[language] || translations.ar;
  const isRtl = language === "ar";
  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [scrapeInterval, setScrapeInterval] = useState(0);
  const [platform, setPlatform] = useState("mostaql");
  const [saved, setSaved] = useState(false);

  const scrapeIntervalOptions = [
    { label: t.intervalOff, value: 0 },
    { label: t.interval15m, value: 15 },
    { label: t.interval30m, value: 30 },
    { label: t.interval1h, value: 60 },
    { label: t.interval2h, value: 120 },
    { label: t.interval6h, value: 360 },
  ];

  useEffect(() => {
    const stored = localStorage.getItem("gigflow_settings");
    if (stored) {
      try {
        const s = JSON.parse(stored);
        setApiKey(s.apiKey || "");
        setScrapeInterval(s.scrapeInterval || 0);
        setPlatform(s.platform || "mostaql");
      } catch {}
    }
  }, []);

  const handleSave = () => {
    const settings = { apiKey: apiKey.trim(), scrapeInterval, platform };
    localStorage.setItem("gigflow_settings", JSON.stringify(settings));
    setSaved(true);
    onShowToast(t.saved);
    if (onSettingsSaved) onSettingsSaved();
    setTimeout(() => setSaved(false), 2500);
  };

  const handleTestKey = async () => {
    onShowToast(language === "ar" ? "جاري اختبار مفتاح Gemini..." : "Testing Gemini key...");
    try {
      await httpClient.post("/api/test-key", { apiKey: apiKey.trim() });
      onShowToast(language === "ar" ? "مفتاح Gemini صالح ويعمل بنجاح ✓" : "Gemini key is valid ✓");
    } catch (error: any) {
      onShowToast(error?.message || (language === "ar" ? "المفتاح غير صالح أو استنفد الحصة" : "Gemini key is invalid or has no quota"), "error");
    }
  };

  const handleClearDB = async () => {
    if (!confirm(language === "ar" ? "هل أنت متأكد؟ سيتم حذف جميع المشاريع المجلوبة من قاعدة البيانات." : "Are you sure? This will delete ALL scraped gigs. This cannot be undone.")) return;
    try {
      await httpClient.delete("/api/gigs/all");
      onShowToast(language === "ar" ? "تم مسح جميع المشاريع بنجاح" : "All gigs cleared from database");
    } catch (error: any) {
      onShowToast(error?.message || "Failed to clear gigs", "error");
    }
  };

  return (
    <div className={`p-6 md:p-8 max-w-2xl mx-auto animate-fade-in-up ${isRtl ? "text-right" : "text-left"}`}>
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">{t.settingsTitle}</h1>
        <p className="text-slate-400 text-sm mt-1">{t.settingsSubtitle}</p>
      </div>

      <div className="space-y-4">
        {/* Appearance */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="glass-card rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shrink-0">
              {theme === "dark" ? <MoonStar size={15} className="text-white" /> : <SunMedium size={15} className="text-white" />}
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white">{t.appearance}</h2>
              <p className="text-xs text-slate-400">{language === "ar" ? "التبديل بين الوضع الليلي والوضع الفاتح" : "Switch between dark and light mode"}</p>
            </div>
          </div>

          <div className="flex gap-2">
            {(["dark", "light"] as const).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => onThemeChange(option)}
                className={`flex-1 rounded-xl border px-3 py-2.5 text-sm font-medium transition-all cursor-pointer ${
                  theme === option
                    ? "border-accent-500/40 bg-accent-500/15 text-accent-400"
                    : "border-white/5 bg-dark-800 text-slate-500 hover:text-slate-300"
                }`}
              >
                {option === "dark" ? t.darkMode : t.lightMode}
              </button>
            ))}
          </div>
        </motion.div>

        {/* API Key */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }} className="glass-card rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shrink-0">
              <Key size={15} className="text-white" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white">{t.geminiKeyLabel}</h2>
              <p className="text-xs text-slate-400">{language === "ar" ? "مطلوب لتوليد وتحسين مقترحات الذكاء الاصطناعي" : "Required for AI proposal generation"}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <input
                type={showKey ? "text" : "password"}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={t.geminiKeyPlaceholder}
                className={`w-full bg-dark-800 border border-white/6 rounded-xl py-3 text-sm text-white placeholder-slate-500 focus:border-accent-500/50 transition-colors font-mono ${
                  isRtl ? "pr-4 pl-14" : "pl-4 pr-14"
                }`}
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className={`absolute top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 cursor-pointer text-xs ${
                  isRtl ? "left-3" : "right-3"
                }`}
              >
                {showKey ? (language === "ar" ? "إخفاء" : "Hide") : (language === "ar" ? "إظهار" : "Show")}
              </button>
            </div>
            <button onClick={handleTestKey} className="btn-ghost text-xs px-3 rounded-xl cursor-pointer whitespace-nowrap flex items-center gap-1.5 shrink-0">
              <Shield size={14} /> {t.testKeyBtn}
            </button>
          </div>
        </motion.div>

        {/* Scrape Interval */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shrink-0">
              <Clock size={15} className="text-white" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white">{t.autoScrapeLabel}</h2>
              <p className="text-xs text-slate-400">{t.autoScrapeDesc}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {scrapeIntervalOptions.map((opt) => (
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
              {language === "ar" ? `سيتم الجلب تلقائياً كل ${scrapeInterval} دقيقة` : `Will scrape every ${scrapeInterval} minutes`}
            </p>
          )}
        </motion.div>

        {/* Platform */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="glass-card rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-accent-500 to-purple-600 flex items-center justify-center shrink-0">
              <Globe size={15} className="text-white" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white">{t.primaryPlatform}</h2>
              <p className="text-xs text-slate-400">{language === "ar" ? "اختر منصة العمل الحر الرئيسية" : "Choose which freelance platform to scrape"}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {[
              { id: "mostaql", label: "مستقل (Mostaql)", desc: language === "ar" ? "مشاريع العمل الحر العربية" : "Arabic freelance platform", disabled: false },
              { id: "khamsat", label: "خمسات (Khamsat)", desc: language === "ar" ? "طلبات مجتمع خمسات" : "Arabic community requests", disabled: false },
            ].map((p) => (
              <button
                key={p.id}
                onClick={() => !p.disabled && setPlatform(p.id)}
                disabled={p.disabled}
                className={`p-3 rounded-xl border text-start transition-all cursor-pointer ${
                  platform === p.id && !p.disabled
                    ? "bg-accent-500/15 border-accent-500/30"
                    : "bg-dark-800 border-white/5 opacity-50"
                } ${p.disabled ? "cursor-not-allowed" : ""}`}
              >
                <div className="text-sm font-medium text-white">{p.label}</div>
                <div className="text-xs text-slate-400 mt-0.5">{p.desc}</div>
              </button>
            ))}
          </div>
        </motion.div>

        {/* Danger Zone */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass-card rounded-2xl p-6 border border-rose-500/10">
          <h2 className="text-sm font-semibold text-rose-400 mb-4">{language === "ar" ? "منطقة الحظر والمسح" : "Danger Zone"}</h2>
          <button
            onClick={handleClearDB}
            className="w-full py-2.5 px-4 rounded-xl border border-rose-500/20 text-rose-400 text-sm font-medium hover:bg-rose-500/10 transition-all cursor-pointer flex items-center justify-between"
          >
            <span>{language === "ar" ? "مسح جميع المشاريع المجلوبة من قاعدة البيانات" : "Clear all scraped gigs"}</span>
            <ChevronRight size={16} className={isRtl ? "rotate-180" : ""} />
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
          {saved ? t.saved : t.saveSettingsBtn}
        </motion.button>
      </div>
    </div>
  );
}
