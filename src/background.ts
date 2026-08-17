/**
 * Background Service Worker — GigFlow Chrome Extension
 * Handles: alarms (auto-scrape), scraping, notifications, side panel opening.
 */

import { MostaqlScraper, KhamsatScraper } from './services/scraper';
import { upsertGig, getSettings, setLastScraped, getProfile } from './services/storage';

const ALARM_NAME = 'gigflow-auto-scrape';

// ── Install / Startup ─────────────────────────────────────

chrome.runtime.onInstalled.addListener(() => {
  console.log('[GigFlow BG] Extension installed');
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
  scheduleAlarm();
});

chrome.runtime.onStartup.addListener(() => {
  scheduleAlarm();
});

// ── Alarm scheduling ──────────────────────────────────────

async function scheduleAlarm() {
  const settings = await getSettings();
  await chrome.alarms.clear(ALARM_NAME);
  if (settings.scrapeInterval > 0) {
    chrome.alarms.create(ALARM_NAME, {
      delayInMinutes: settings.scrapeInterval,
      periodInMinutes: settings.scrapeInterval,
    });
    console.log(`[GigFlow BG] Auto-scrape alarm set every ${settings.scrapeInterval}m`);
  }
}

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === ALARM_NAME) {
    console.log('[GigFlow BG] Alarm fired — scraping...');
    await runScrape(true);
  }
});

// ── Message Handler ───────────────────────────────────────

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === 'SCRAPE') {
    runScrape(false, msg.platform, msg.skills)
      .then((result) => sendResponse({ ok: true, ...result }))
      .catch((err) => sendResponse({ ok: false, error: err.message }));
    return true; // Keep channel open for async response
  }

  if (msg.type === 'RESCHEDULE_ALARM') {
    scheduleAlarm().then(() => sendResponse({ ok: true }));
    return true;
  }

  if (msg.type === 'TEST_KEY') {
    testApiKey(msg.apiKey)
      .then((valid) => sendResponse({ valid }))
      .catch(() => sendResponse({ valid: false }));
    return true;
  }
});

// ── Core Scrape Function ──────────────────────────────────

async function runScrape(
  silent: boolean,
  platformOverride?: string,
  skillsOverride?: string[]
): Promise<{ processed: number; total: number }> {
  const settings = await getSettings();
  const platform = platformOverride ?? settings.platform ?? 'mostaql';

  // Get user skills from profile if not provided
  let skills: string[] = skillsOverride || [];
  if (skills.length === 0) {
    const profile = await getProfile();
    if (profile?.skills) {
      skills = profile.skills.split(',').map((s) => s.trim()).filter(Boolean);
    }
  }

  let scraped = platform === 'khamsat'
    ? await KhamsatScraper.fetchLatestGigs(2)
    : await MostaqlScraper.fetchLatestGigs(2);

  // Filter by user skills if any are set
  if (skills.length > 0) {
    const before = scraped.length;
    scraped = scraped.filter((gig) => {
      const text = `${gig.title} ${gig.description} ${gig.requiredSkills.join(' ')}`.toLowerCase();
      return skills.some((s) => text.includes(s.toLowerCase()));
    });
    console.log(`[GigFlow BG] Skills filter: ${scraped.length}/${before} kept`);
  }

  let newCount = 0;
  for (const gig of scraped) {
    const isNew = await upsertGig({
      title: gig.title,
      description: gig.description,
      budget: gig.budget,
      url: gig.url,
      platform: platform === 'khamsat' ? 'Khamsat' : 'Mostaql',
      requiredSkills: gig.requiredSkills.join(', '),
    });
    if (isNew) newCount++;
  }

  const now = new Date().toISOString();
  await setLastScraped(now);

  // Notify all open side panels to refresh
  chrome.runtime.sendMessage({ type: 'SCRAPE_DONE', processed: newCount, total: scraped.length }).catch(() => {});

  // Chrome notification for background scrapes
  if (silent && newCount > 0) {
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icons/icon48.png',
      title: 'GigFlow — New Gigs!',
      message: `✓ Found ${newCount} new ${platform === 'khamsat' ? 'Khamsat' : 'Mostaql'} opportunities matching your skills!`,
    });
  }

  return { processed: newCount, total: scraped.length };
}

// ── API Key Test ──────────────────────────────────────────

async function testApiKey(apiKey: string): Promise<boolean> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: 'Say: OK' }] }] }),
    }
  );
  return res.ok;
}
