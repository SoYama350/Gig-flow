import axios from 'axios';
import * as cheerio from 'cheerio';

export interface ScrapedGig {
  title: string;
  description: string;
  budget: string;
  url: string;
  requiredSkills: string[];
}

export class MostaqlScraper {
  private static BASE_URL = 'https://mostaql.com/projects';

  private static readonly HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'ar,en-US;q=0.9,en;q=0.8',
    'Accept-Encoding': 'gzip, deflate, br',
    'Connection': 'keep-alive',
    'Cache-Control': 'max-age=0',
  };

  static async fetchLatestGigs(pages = 2): Promise<ScrapedGig[]> {
    try {
      console.log(`[SCRAPER] Fetching project listings from Mostaql (pages: ${pages})...`);
      
      const basicGigs: { title: string; description: string; url: string }[] = [];

      for (let p = 1; p <= pages; p++) {
        const pageUrl = p === 1 ? this.BASE_URL : `${this.BASE_URL}?page=${p}`;
        console.log(`[SCRAPER] Scraping Mostaql Page ${p}: ${pageUrl}`);
        
        try {
          const response = await axios.get(pageUrl, {
            headers: this.HEADERS,
            timeout: 15000,
          });

          const $ = cheerio.load(response.data);
          const projectElements = $('.project-row').toArray();
          console.log(`[SCRAPER] Found ${projectElements.length} project rows on Mostaql Page ${p}`);

          for (const element of projectElements) {
            const el = $(element);
            const titleLink = el.find('h2 a').first();
            if (titleLink.length === 0) continue;

            const title = titleLink.text().trim();
            const relativeUrl = titleLink.attr('href') || '';
            const url = relativeUrl.startsWith('http') ? relativeUrl : `https://mostaql.com${relativeUrl}`;
            const description = el.find('p.project__brief').text().trim();

            if (title && url) {
              basicGigs.push({ title, description, url });
            }
          }
        } catch (pageError: any) {
          console.error(`[SCRAPER] Failed to fetch Mostaql page ${p}:`, pageError.message);
          if (p === 1) throw pageError;
          break;
        }

        // Small delay between page scrapes
        if (p < pages) {
          await new Promise((r) => setTimeout(r, 1000));
        }
      }

      console.log(`[SCRAPER] Total parsed basic gig entries across pages: ${basicGigs.length}`);
      
      // Limit details scraping to first 12 entries to avoid rate-limiting or long response times
      const gigsToFetchDetails = basicGigs.slice(0, 12);
      const gigs: ScrapedGig[] = [];

      // Fetch detail pages to get budget & skills (limit concurrency)
      const BATCH_SIZE = 3;
      for (let i = 0; i < gigsToFetchDetails.length; i += BATCH_SIZE) {
        const batch = gigsToFetchDetails.slice(i, i + BATCH_SIZE);
        const detailResults = await Promise.allSettled(
          batch.map(async (basic) => {
            const detail = await this.fetchGigDetails(basic.url);
            return {
              title: basic.title,
              description: basic.description || detail.description,
              budget: detail.budget,
              url: basic.url,
              requiredSkills: detail.skills,
            };
          })
        );

        for (const result of detailResults) {
          if (result.status === 'fulfilled') {
            gigs.push(result.value);
          }
        }

        if (i + BATCH_SIZE < gigsToFetchDetails.length) {
          await new Promise((r) => setTimeout(r, 500));
        }
      }

      console.log(`[SCRAPER] Successfully scraped ${gigs.length} gigs with details`);
      return gigs;
    } catch (error: any) {
      console.error('[SCRAPER] Error scraping Mostaql:', error.message || error);
      if (error.response?.status === 503 || error.response?.status === 403) {
        console.error('[SCRAPER] Access blocked by Mostaql (anti-bot protection)');
      }
      throw error;
    }
  }

  private static async fetchGigDetails(url: string): Promise<{
    budget: string;
    skills: string[];
    description: string;
  }> {
    try {
      const response = await axios.get(url, {
        headers: this.HEADERS,
        timeout: 10000,
      });

      const $ = cheerio.load(response.data);

      let budget = 'Not specified';
      $('.meta-row').each((_, row) => {
        const label = $(row).find('.meta-label').text().trim();
        if (label.includes('الميزانية')) {
          budget = $(row).find('.meta-value span').text().trim() || $(row).find('.meta-value').text().trim();
        }
      });

      const skillsSet = new Set<string>();
      $('.skills.list-tags .skills__item a.tag').each((_, skillElem) => {
        const skill = $(skillElem).text().trim();
        if (skill) skillsSet.add(skill);
      });
      const skills = Array.from(skillsSet);

      const description = $('.project-content__body, .fr-view').first().text().trim();

      return { budget, skills, description };
    } catch (error) {
      return { budget: 'Not specified', skills: [], description: '' };
    }
  }
}

export class KhamsatScraper {
  private static BASE_URL = 'https://khamsat.com/community/requests';

  private static readonly HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'ar,en-US;q=0.9,en;q=0.8',
    'Accept-Encoding': 'gzip, deflate, br',
    'Connection': 'keep-alive',
    'Cache-Control': 'max-age=0',
  };

  static async fetchLatestGigs(pages = 2): Promise<ScrapedGig[]> {
    try {
      console.log(`[SCRAPER] Fetching community requests from Khamsat (pages: ${pages})...`);
      
      const basicGigs: { title: string; url: string }[] = [];

      for (let p = 1; p <= pages; p++) {
        const pageUrl = p === 1 ? this.BASE_URL : `${this.BASE_URL}?page=${p}`;
        console.log(`[SCRAPER] Scraping Khamsat Page ${p}: ${pageUrl}`);

        try {
          const response = await axios.get(pageUrl, {
            headers: this.HEADERS,
            timeout: 15000,
          });

          const $ = cheerio.load(response.data);
          const postElements = $('tr.forum_post').toArray();
          console.log(`[SCRAPER] Found ${postElements.length} post rows on Khamsat Page ${p}`);

          for (const element of postElements) {
            const el = $(element);
            const titleLink = el.find('td.details-td h3.details-head a.ajaxbtn').first();
            if (titleLink.length === 0) continue;

            const title = titleLink.text().trim();
            const relativeUrl = titleLink.attr('href') || '';
            const url = relativeUrl.startsWith('http') ? relativeUrl : `https://khamsat.com${relativeUrl}`;

            if (title && url) {
              basicGigs.push({ title, url });
            }
          }
        } catch (pageError: any) {
          console.error(`[SCRAPER] Failed to fetch Khamsat page ${p}:`, pageError.message);
          if (p === 1) throw pageError;
          break;
        }

        if (p < pages) {
          await new Promise((r) => setTimeout(r, 1000));
        }
      }

      console.log(`[SCRAPER] Total parsed basic Khamsat entries across pages: ${basicGigs.length}`);
      
      const gigsToFetchDetails = basicGigs.slice(0, 12);
      const gigs: ScrapedGig[] = [];

      const BATCH_SIZE = 3;
      for (let i = 0; i < gigsToFetchDetails.length; i += BATCH_SIZE) {
        const batch = gigsToFetchDetails.slice(i, i + BATCH_SIZE);
        const detailResults = await Promise.allSettled(
          batch.map(async (basic) => {
            const detail = await this.fetchGigDetails(basic.url);
            return {
              title: basic.title,
              description: detail.description,
              budget: 'Microbudget (5$-25$)',
              url: basic.url,
              requiredSkills: detail.skills,
            };
          })
        );

        for (const result of detailResults) {
          if (result.status === 'fulfilled') {
            gigs.push(result.value);
          }
        }

        if (i + BATCH_SIZE < gigsToFetchDetails.length) {
          await new Promise((r) => setTimeout(r, 500));
        }
      }

      console.log(`[SCRAPER] Successfully scraped ${gigs.length} Khamsat gigs with details`);
      return gigs;
    } catch (error: any) {
      console.error('[SCRAPER] Error scraping Khamsat:', error.message || error);
      throw error;
    }
  }

  private static async fetchGigDetails(url: string): Promise<{
    description: string;
    skills: string[];
  }> {
    try {
      const response = await axios.get(url, {
        headers: this.HEADERS,
        timeout: 10000,
      });

      const $ = cheerio.load(response.data);
      const description = $('article.replace_urls').first().text().trim() || '';

      // Auto-extract common skill tags from description content
      const skillsList = [
        'برمجة', 'تصميم', 'كتابة', 'ترجمة', 'فيديو', 'تسويق', 'ووردبريس', 'صوت', 'بيانات', 'موقع', 
        'تطبيق', 'موشن جرافيك', 'تعديل صور', 'تعليق صوتي', 'تصميم شعار', 'كتابة محتوى', 'SEO', 
        'سوشيال ميديا', 'فوتوشوب', 'اليستريتور', 'مونتاج'
      ];
      const matchedSkills = skillsList.filter(skill => 
        description.toLowerCase().includes(skill.toLowerCase())
      );

      return { description, skills: matchedSkills };
    } catch (error) {
      return { description: '', skills: [] };
    }
  }
}
