import { useState } from "react";
import { motion } from "motion/react";
import { User, CheckCircle2, Loader2, Save, Plus, X } from "lucide-react";

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
}

const PRESET_SKILLS = [
  "React", "TypeScript", "Node.js", "Python", "Vue.js", "Next.js",
  "UI Design", "Figma", "WordPress", "Laravel", "Flutter", "React Native",
  "Django", "FastAPI", "PostgreSQL", "MongoDB", "Docker", "AWS",
  "Graphic Design", "Logo Design", "SEO", "Content Writing",
];

export default function Profile({ email, setEmail, name, setName, bio, setBio, skills, setSkills, onSave, loading, message }: ProfileProps) {
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
    <div className="p-6 md:p-8 max-w-2xl mx-auto animate-fade-in-up">
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">Profile</h1>
        <p className="text-slate-500 text-sm mt-1">Configure your freelancer identity for AI proposals</p>
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card rounded-2xl p-6 md:p-8 space-y-6">
        {/* Avatar header */}
        <div className="flex items-center gap-4 pb-6 border-b border-white/5">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-accent-500 to-cyan-500 flex items-center justify-center glow-accent text-white text-xl font-bold">
            {name ? name[0].toUpperCase() : "?"}
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">{name || "Your Name"}</h2>
            <p className="text-sm text-slate-500">{email || "your@email.com"}</p>
            {skillList.length > 0 && (
              <p className="text-xs text-accent-400 mt-0.5">{skillList.length} skills added</p>
            )}
          </div>
        </div>

        <form onSubmit={(e) => { e.preventDefault(); onSave(); }} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-2">Full Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ahmed Hassan"
                className="w-full bg-dark-800 border border-white/6 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-600 focus:border-accent-500/50 transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-2">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="dev@example.com"
                required
                className="w-full bg-dark-800 border border-white/6 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-600 focus:border-accent-500/50 transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-2">Bio / Experience</label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Brief description of your experience and expertise..."
              rows={3}
              className="w-full bg-dark-800 border border-white/6 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-600 focus:border-accent-500/50 transition-colors resize-none"
            />
          </div>

          {/* Skill Tags UI */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-2">Skills</label>

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
                placeholder="Type a skill and press Enter..."
                className="flex-1 bg-dark-800 border border-white/6 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-600 focus:border-accent-500/50 transition-colors"
              />
              <button
                type="button"
                onClick={() => addSkill(newSkill)}
                className="btn-ghost text-sm px-3 py-2.5 flex items-center gap-1 rounded-xl cursor-pointer"
              >
                <Plus size={16} />
              </button>
            </div>

            {/* Quick-add presets */}
            {unusedPresets.length > 0 && (
              <div className="mt-3">
                <p className="text-[10px] text-slate-600 mb-2 uppercase tracking-wider">Quick add</p>
                <div className="flex flex-wrap gap-1.5">
                  {unusedPresets.slice(0, 12).map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => addSkill(p)}
                      className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-white/3 text-slate-500 border border-white/5 hover:bg-accent-500/10 hover:text-accent-400 hover:border-accent-500/20 transition-all cursor-pointer"
                    >
                      + {p}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2 text-sm cursor-pointer py-3">
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            {loading ? "Saving..." : "Save Profile"}
          </button>
        </form>

        {message && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20"
          >
            <CheckCircle2 size={16} className="text-emerald-400" />
            <span className="text-sm text-emerald-400">{message}</span>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}
