import { useState } from "react";
import { motion } from "motion/react";
import { User, CheckCircle2, Loader2, Save, Plus, X } from "lucide-react";
import { translations, Language } from "../i18n";

interface ProfileProps {
  email: string;
  setEmail: (v: string) => void;
  name: string;
  setName: (v: string) => void;
  bio: string;
  setBio: (v: string) => void;
  skills: string;
  setSkills: (v: string) => void;
  onSave: () => void;
  loading: boolean;
  message: string;
  language?: Language;
}

const PRESET_SKILLS = [
  "React", "TypeScript", "Node.js", "Python", "Vue.js", "Next.js",
  "UI Design", "Figma", "WordPress", "Laravel", "Flutter", "React Native",
  "Django", "FastAPI", "PostgreSQL", "MongoDB", "Docker", "AWS",
  "Graphic Design", "Logo Design", "SEO", "Content Writing",
];

export default function Profile({
  email, setEmail, name, setName, bio, setBio, skills, setSkills,
  onSave, loading, message, language = "ar"
}: ProfileProps) {
  const t = translations[language] || translations.ar;
  const isRtl = language === "ar";
  const [newSkill, setNewSkill] = useState("");
  const skillList = skills.split(",").map((s) => s.trim()).filter(Boolean);

  const addSkill = (skill: string) => {
    const trimmed = skill.trim();
    if (!trimmed) return;
    if (skillList.some((s) => s.toLowerCase() === trimmed.toLowerCase())) return;
    setSkills(skillList.length > 0 ? `${skills}, ${trimmed}` : trimmed);
    setNewSkill("");
  };

  const removeSkill = (toRemove: string) => {
    const updated = skillList.filter((s) => s !== toRemove).join(", ");
    setSkills(updated);
  };

  const handleAddSkillKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addSkill(newSkill);
    }
  };

  const unusedPresets = PRESET_SKILLS.filter(
    (p) => !skillList.some((s) => s.toLowerCase() === p.toLowerCase())
  );

  return (
    <div className={`p-6 md:p-8 max-w-2xl mx-auto animate-fade-in-up ${isRtl ? "text-right" : "text-left"}`}>
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">{t.profileTitle}</h1>
        <p className="text-slate-400 text-sm mt-1">{t.profileSubtitle}</p>
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card rounded-2xl p-6 md:p-8 space-y-6">
        {/* Avatar header */}
        <div className="flex items-center gap-4 pb-6 border-b border-white/5">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-accent-500 to-cyan-500 flex items-center justify-center glow-accent text-white text-xl font-bold shrink-0">
            {name ? name[0].toUpperCase() : "?"}
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">{name || (language === "ar" ? "اسمك هنا" : "Your Name")}</h2>
            <p className="text-sm text-slate-400">{email || "your@email.com"}</p>
            {skillList.length > 0 && (
              <p className="text-xs text-accent-400 mt-0.5">
                {language === "ar" ? `تمت إضافة ${skillList.length} مهارات` : `${skillList.length} skills added`}
              </p>
            )}
          </div>
        </div>

        <form onSubmit={(e) => { e.preventDefault(); onSave(); }} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-2">{t.fullName}</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t.fullNamePlaceholder}
                className="w-full bg-dark-800 border border-white/6 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:border-accent-500/50 transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-2">{t.emailAddress}</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="dev@example.com"
                required
                className="w-full bg-dark-800 border border-white/6 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:border-accent-500/50 transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-2">{t.bioLabel}</label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder={t.bioPlaceholder}
              rows={3}
              className="w-full bg-dark-800 border border-white/6 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:border-accent-500/50 transition-colors resize-none leading-relaxed"
            />
          </div>

          {/* Skill Tags UI */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-2">{t.skillsLabel}</label>

            {/* Tag bubbles */}
            {skillList.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-3">
                {skillList.map((s, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-accent-500/10 text-accent-400 text-xs font-medium border border-accent-500/20"
                  >
                    {s}
                    <button
                      type="button"
                      onClick={() => removeSkill(s)}
                      className="hover:text-rose-400 transition-colors cursor-pointer"
                    >
                      <X size={10} />
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* Add skill input */}
            <div className="flex gap-2">
              <input
                type="text"
                value={newSkill}
                onChange={(e) => setNewSkill(e.target.value)}
                onKeyDown={handleAddSkillKey}
                placeholder={t.addSkillPlaceholder}
                className="flex-1 bg-dark-800 border border-white/6 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-accent-500/50 transition-colors"
              />
              <button
                type="button"
                onClick={() => addSkill(newSkill)}
                disabled={!newSkill.trim()}
                className="btn-ghost text-xs px-3 rounded-xl flex items-center gap-1 cursor-pointer disabled:opacity-40"
              >
                <Plus size={14} />
                {t.addBtn}
              </button>
            </div>

            {/* Preset Suggestions */}
            {unusedPresets.length > 0 && (
              <div className="mt-3">
                <span className="text-[11px] text-slate-400 block mb-1.5">{t.popularSkills}</span>
                <div className="flex flex-wrap gap-1">
                  {unusedPresets.slice(0, 10).map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => addSkill(preset)}
                      className="text-[11px] text-slate-400 hover:text-white bg-dark-800 hover:bg-dark-700 border border-white/5 rounded-lg px-2 py-0.5 transition-colors cursor-pointer"
                    >
                      + {preset}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {message && (
            <div className="flex items-center gap-2 text-emerald-400 text-xs bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-3 py-2">
              <CheckCircle2 size={14} />
              <span>{message}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full btn-primary py-3 rounded-xl flex items-center justify-center gap-2 text-sm font-semibold cursor-pointer shadow-lg shadow-accent-600/20"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            {loading ? t.saving : t.saveProfileBtn}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
