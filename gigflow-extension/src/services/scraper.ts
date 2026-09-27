/**
 * Scraper service — fetches HTML pages and parses them using the offscreen document.
 * Works inside Chrome Extension Service Workers (no DOMParser limitations).
 * CORS is bypassed via host_permissions in manifest.json.
 */

export interface ScrapedGig {
  title: string;
  description: string;
  budget: string;
  url: string;
  requiredSkills: string[];
}

const HEADERS: Record<string, string> = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'ar,en-US;q=0.9,en;q=0.8',
  'Cache-Control': 'max-age=0',
};

async function fetchHtml(url: string): Promise<string> {
  const res = await fetch(url, { headers: HEADERS });
  return await res.text();
}

async function parseHtml(html: string, parserType: string): Promise<any> {
  await setupOffscreenDocument();
  const response = await chrome.runtime.sendMessage({
    type: 'PARSE_HTML',
    html,
    parserType
  });
  if (!response?.ok) {
    throw new Error(response?.error || 'Failed to parse HTML');
  }
  return response.data;
}

let creating: Promise<void> | null = null;
async function setupOffscreenDocument() {
  const contexts = await (chrome.runtime as any).getContexts({
    contextTypes: ['OFFSCREEN_DOCUMENT']
  });
  if (contexts?.length > 0) return;

  if (creating) {
    await creating;
    return;
  }

  creating = chrome.offscreen.createDocument({
    url: 'offscreen.html',
    reasons: [chrome.offscreen.Reason.DOM_PARSER],
    justification: 'Parse HTML freelance gigs'
  });
  await creating;
  creating = null;
}

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

// ── Mostaql ───────────────────────────────────────────────

export class MostaqlScraper {
  private static BASE = 'https://mostaql.com/projects';

  static async fetchLatestGigs(pages = 2): Promise<ScrapedGig[]> {
    console.log(`[EXT-SCRAPER] Mostaql — fetching ${pages} page(s)...`);
    const basicGigs: { title: string; description: string; url: string }[] = [];

    for (let p = 1; p <= pages; p++) {
      const url = p === 1 ? this.BASE : `${this.BASE}?page=${p}`;
      try {
        const html = await fetchHtml(url);
        const rows = await parseHtml(html, 'mostaql-list');
        console.log(`[EXT-SCRAPER] Mostaql p${p}: ${rows.length} rows`);
        basicGigs.push(...rows);
      } catch (e) {
        console.error(`[EXT-SCRAPER] Mostaql p${p} failed:`, e);
        if (p === 1) throw e;
        break;
      }
      if (p < pages) await delay(800);
    }

    const toFetch = basicGigs.slice(0, 12);
    const gigs: ScrapedGig[] = [];
    const BATCH = 3;
    for (let i = 0; i < toFetch.length; i += BATCH) {
      const batch = toFetch.slice(i, i + BATCH);
      const results = await Promise.allSettled(
        batch.map(async (basic) => {
          const detail = await MostaqlScraper.fetchDetail(basic.url);
          return {
            title: basic.title,
            description: basic.description || detail.description,
            budget: detail.budget,
            url: basic.url,
            requiredSkills: detail.skills,
          };
        })
      );
      results.forEach((r) => r.status === 'fulfilled' && gigs.push(r.value));
      if (i + BATCH < toFetch.length) await delay(400);
    }

    console.log(`[EXT-SCRAPER] Mostaql done: ${gigs.length} gigs`);
    return gigs;
  }

  private static async fetchDetail(url: string): Promise<{ budget: string; skills: string[]; description: string }> {
    try {
      const html = await fetchHtml(url);
      return await parseHtml(html, 'mostaql-detail');
    } catch {
      return { budget: 'Not specified', skills: [], description: '' };
    }
  }
}

// ── Khamsat ───────────────────────────────────────────────

export class KhamsatScraper {
  private static BASE = 'https://khamsat.com/community/requests';

  static async fetchLatestGigs(pages = 2): Promise<ScrapedGig[]> {
    console.log(`[EXT-SCRAPER] Khamsat — fetching ${pages} page(s)...`);
    const basicGigs: { title: string; url: string }[] = [];

    for (let p = 1; p <= pages; p++) {
      const url = p === 1 ? this.BASE : `${this.BASE}?page=${p}`;
      try {
        const html = await fetchHtml(url);
        const rows = await parseHtml(html, 'khamsat-list');
        console.log(`[EXT-SCRAPER] Khamsat p${p}: ${rows.length} rows`);
        basicGigs.push(...rows);
      } catch (e) {
        console.error(`[EXT-SCRAPER] Khamsat p${p} failed:`, e);
        if (p === 1) throw e;
        break;
      }
      if (p < pages) await delay(800);
    }

    const toFetch = basicGigs.slice(0, 12);
    const gigs: ScrapedGig[] = [];
    const BATCH = 3;
    for (let i = 0; i < toFetch.length; i += BATCH) {
      const batch = toFetch.slice(i, i + BATCH);
      const results = await Promise.allSettled(
        batch.map(async (basic) => {
          const detail = await KhamsatScraper.fetchDetail(basic.url);
          return {
            title: basic.title,
            description: detail.description,
            budget: 'Microbudget (5$–25$)',
            url: basic.url,
            requiredSkills: detail.skills,
          };
        })
      );
      results.forEach((r) => r.status === 'fulfilled' && gigs.push(r.value));
      if (i + BATCH < toFetch.length) await delay(400);
    }

    console.log(`[EXT-SCRAPER] Khamsat done: ${gigs.length} gigs`);
    return gigs;
  }

  private static async fetchDetail(url: string): Promise<{ description: string; skills: string[] }> {
    try {
      const html = await fetchHtml(url);
      const detail = await parseHtml(html, 'khamsat-detail');
      const description = detail.description;
      const skillKeywords = [
        'برمجة', 'تصميم', 'كتابة', 'ترجمة', 'فيديو', 'تسويق', 'ووردبريس', 'صوت',
        'بيانات', 'موقع', 'تطبيق', 'موشن جرافيك', 'تعديل صور', 'تعليق صوتي',
        'تصميم شعار', 'كتابة محتوى', 'SEO', 'سوشيال ميديا', 'فوتوشوب', 'مونتاج',
      ];
      const skills = skillKeywords.filter((k) =>
        description.toLowerCase().includes(k.toLowerCase())
      );
      return { description, skills };
    } catch {
      return { description: '', skills: [] };
    }
  }
}
