/**
 * @license SPDX-License-Identifier: Apache-2.0
 * GigFlow Extension — Main App (Side Panel)
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { AlertCircle, X } from 'lucide-react';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import GigsFeed from './components/GigsFeed';
import Profile from './components/Profile';
import Settings from './components/Settings';
import Analytics from './components/Analytics';
import {
  getGigs, getStats, getProfile, saveProfile,
  getLastScraped, updateGigStatus, updateGigProposal,
  type Gig,
} from './services/storage';
import { generateProposal } from './services/ai';
import { getSettings } from './services/storage';

interface Stats {
  totalGigs: number;
  newGigs: number;
  appliedGigs: number;
  archivedGigs: number;
}

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [gigs, setGigs] = useState<Gig[]>([]);
  const [stats, setStats] = useState<Stats>({ totalGigs: 0, newGigs: 0, appliedGigs: 0, archivedGigs: 0 });
  const [scraping, setScraping] = useState(false);
  const [generatingFor, setGeneratingFor] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [lastScraped, setLastScraped] = useState<string | null>(null);

  // Profile state
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [skills, setSkills] = useState('');
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileMessage, setProfileMessage] = useState('');

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchGigs = useCallback(async () => {
    const [g, s, ls] = await Promise.all([getGigs(), getStats(), getLastScraped()]);
    setGigs(g);
    setStats(s);
    setLastScraped(ls);
  }, []);

  // Load profile on mount
  useEffect(() => {
    fetchGigs();
    getProfile().then((p) => {
      if (p) { setEmail(p.email); setName(p.name); setBio(p.bio); setSkills(p.skills); }
    });
  }, [fetchGigs]);

  // Listen for SCRAPE_DONE from background Service Worker
  useEffect(() => {
    const handler = (msg: any) => {
      if (msg.type === 'SCRAPE_DONE') {
        fetchGigs();
        setScraping(false);
        if (msg.processed > 0) showToast(`✓ Found ${msg.processed} new gigs!`);
        else showToast('Scraping complete — no new gigs');
      }
    };
    chrome.runtime.onMessage.addListener(handler);
    return () => chrome.runtime.onMessage.removeListener(handler);
  }, [fetchGigs]);

  // Listen for storage changes (when background scrapes while panel is open)
  useEffect(() => {
    const handler = (changes: Record<string, chrome.storage.StorageChange>) => {
      if (changes.gigs || changes.lastScraped) fetchGigs();
    };
    chrome.storage.onChanged.addListener(handler);
    return () => chrome.storage.onChanged.removeListener(handler);
  }, [fetchGigs]);

  const triggerScrape = async (silent = false) => {
    setScraping(true);
    const settings = await getSettings();
    const platform = settings.platform || 'mostaql';
    const userSkills = skills.split(',').map((s) => s.trim()).filter(Boolean);

    chrome.runtime.sendMessage(
      { type: 'SCRAPE', platform, skills: userSkills },
      (response) => {
        if (chrome.runtime.lastError) {
          setScraping(false);
          if (!silent) showToast('Background worker error', 'error');
          return;
        }
        if (response?.ok) {
          fetchGigs();
          if (!silent) showToast(`✓ Scraped ${response.processed} new ${platform === 'khamsat' ? 'Khamsat' : 'Mostaql'} gigs`);
        } else {
          if (!silent) showToast(response?.error || 'Scraping failed', 'error');
        }
        setScraping(false);
      }
    );
  };

  const handleStatusChange = async (id: string, status: string) => {
    await updateGigStatus(id, status as Gig['status']);
    setGigs((prev) => prev.map((g) => (g.id === id ? { ...g, status: status as Gig['status'] } : g)));
    const s = await getStats();
    setStats(s);
  };

  const handleGenerateProposal = async (gigId: string, language: 'arabic' | 'english' = 'arabic') => {
    setGeneratingFor(gigId);
    try {
      const settings = await getSettings();
      if (!settings.apiKey) {
        showToast('Set your Gemini API key in Settings first', 'error');
        return;
      }
      const gig = gigs.find((g) => g.id === gigId);
      if (!gig) return;
      const userSkills = skills.split(',').map((s) => s.trim()).filter(Boolean);
      const proposal = await generateProposal({ gig, userSkills, userName: name, userBio: bio, apiKey: settings.apiKey, language });
      await updateGigProposal(gigId, proposal);
      setGigs((prev) => prev.map((g) => (g.id === gigId ? { ...g, proposal, status: 'APPLIED' } : g)));
      const s = await getStats();
      setStats(s);
      showToast('✓ Proposal generated!');
    } catch (e: any) {
      showToast(e.message || 'Generation failed', 'error');
    } finally {
      setGeneratingFor(null);
    }
  };

  const handleSaveProposal = async (gigId: string, proposal: string) => {
    await updateGigProposal(gigId, proposal);
    setGigs((prev) => prev.map((g) => (g.id === gigId ? { ...g, proposal } : g)));
    showToast('✓ Proposal saved');
  };

  const handleProfileSave = async () => {
    setProfileLoading(true);
    try {
      await saveProfile({ email, name, bio, skills });
      setProfileMessage('Profile saved!');
      showToast('✓ Profile saved');
      setTimeout(() => setProfileMessage(''), 3000);
    } finally {
      setProfileLoading(false);
    }
  };

  const userSkillsList = skills.split(',').map((s) => s.trim()).filter(Boolean);

  return (
    <div className="flex h-screen w-full overflow-hidden font-sans">
      <div className="mesh-gradient" />
      <Sidebar activeTab={activeTab} onTabChange={setActiveTab} userName={name} />

      <main className="flex-1 overflow-auto min-w-0">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === 'dashboard' && (
              <Dashboard stats={stats} onNavigate={setActiveTab} onScrape={triggerScrape} scraping={scraping} lastScraped={lastScraped} />
            )}
            {activeTab === 'gigs' && (
              <GigsFeed
                gigs={gigs} onScrape={triggerScrape} scraping={scraping}
                onStatusChange={handleStatusChange} onGenerateProposal={handleGenerateProposal}
                onSaveProposal={handleSaveProposal} generatingFor={generatingFor} userSkills={userSkillsList}
              />
            )}
            {activeTab === 'analytics' && <Analytics gigs={gigs} userSkills={userSkillsList} />}
            {activeTab === 'profile' && (
              <Profile
                email={email} setEmail={setEmail} name={name} setName={setName}
                bio={bio} setBio={setBio} skills={skills} setSkills={setSkills}
                onSave={handleProfileSave} loading={profileLoading} message={profileMessage}
              />
            )}
            {activeTab === 'settings' && <Settings onShowToast={showToast} />}
          </motion.div>
        </AnimatePresence>
      </main>

      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            className={`fixed bottom-4 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-xl border text-sm font-medium shadow-2xl ${
              toast.type === 'error'
                ? 'bg-rose-500/15 border-rose-500/30 text-rose-400'
                : 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
            }`}
          >
            {toast.type === 'error' && <AlertCircle size={16} />}
            {toast.message}
            <button onClick={() => setToast(null)} className="ml-1 hover:opacity-70 cursor-pointer"><X size={14} /></button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
