/**
 * Storage service — wraps chrome.storage.local
 * Replaces Prisma + SQLite from the web app.
 */

export interface Gig {
  id: string;
  title: string;
  description: string;
  budget: string | null;
  url: string;
  platform: string;
  requiredSkills: string | null;
  scrapedAt: string;
  status: 'NEW' | 'VIEWED' | 'APPLIED' | 'ARCHIVED';
  proposal: string | null;
}

export interface Profile {
  email: string;
  name: string;
  bio: string;
  skills: string;
}

export interface Settings {
  apiKey: string;
  scrapeInterval: number;
  platform: string;
}

// ── Gigs ──────────────────────────────────────────────────

export async function getGigs(): Promise<Gig[]> {
  const result = await chrome.storage.local.get('gigs');
  return (result.gigs as Gig[]) || [];
}

export async function upsertGig(gig: Omit<Gig, 'id' | 'status' | 'proposal' | 'scrapedAt'>): Promise<boolean> {
  const gigs = await getGigs();
  const idx = gigs.findIndex((g) => g.url === gig.url);
  if (idx >= 0) {
    // Update fields but keep status/proposal
    gigs[idx] = {
      ...gigs[idx],
      title: gig.title,
      description: gig.description,
      budget: gig.budget,
      requiredSkills: gig.requiredSkills,
    };
    await chrome.storage.local.set({ gigs });
    return false; // existing
  } else {
    const newGig: Gig = {
      ...gig,
      id: `gig_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      status: 'NEW',
      proposal: null,
      scrapedAt: new Date().toISOString(),
    };
    gigs.unshift(newGig);
    await chrome.storage.local.set({ gigs });
    return true; // new
  }
}

export async function updateGigStatus(id: string, status: Gig['status']): Promise<void> {
  const gigs = await getGigs();
  const idx = gigs.findIndex((g) => g.id === id);
  if (idx >= 0) {
    gigs[idx] = { ...gigs[idx], status };
    await chrome.storage.local.set({ gigs });
  }
}

export async function updateGigProposal(id: string, proposal: string): Promise<void> {
  const gigs = await getGigs();
  const idx = gigs.findIndex((g) => g.id === id);
  if (idx >= 0) {
    gigs[idx] = { ...gigs[idx], proposal, status: 'APPLIED' };
    await chrome.storage.local.set({ gigs });
  }
}

export async function deleteAllGigs(): Promise<void> {
  await chrome.storage.local.set({ gigs: [] });
}

export async function getStats() {
  const gigs = await getGigs();
  return {
    totalGigs: gigs.length,
    newGigs: gigs.filter((g) => g.status === 'NEW').length,
    appliedGigs: gigs.filter((g) => g.status === 'APPLIED').length,
    archivedGigs: gigs.filter((g) => g.status === 'ARCHIVED').length,
  };
}

// ── Profile ───────────────────────────────────────────────

export async function getProfile(): Promise<Profile | null> {
  const result = await chrome.storage.local.get('profile');
  return (result.profile as Profile) || null;
}

export async function saveProfile(profile: Profile): Promise<void> {
  await chrome.storage.local.set({ profile });
}

// ── Settings ──────────────────────────────────────────────

export async function getSettings(): Promise<Settings> {
  const result = await chrome.storage.local.get('settings');
  return (result.settings as Settings) || { apiKey: '', scrapeInterval: 0, platform: 'mostaql' };
}

export async function saveSettings(settings: Settings): Promise<void> {
  await chrome.storage.local.set({ settings });
}

// ── Last scraped ──────────────────────────────────────────

export async function getLastScraped(): Promise<string | null> {
  const result = await chrome.storage.local.get('lastScraped');
  return (result.lastScraped as string) || null;
}

export async function setLastScraped(date: string): Promise<void> {
  await chrome.storage.local.set({ lastScraped: date });
}
