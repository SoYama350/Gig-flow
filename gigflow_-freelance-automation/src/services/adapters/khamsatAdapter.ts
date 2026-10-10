import axios from "axios";
import * as cheerio from "cheerio";
import { OpportunitySourceAdapter, SourceQuery, RawOpportunity, SourceHealth } from "./types.js";

export class KhamsatAdapter implements OpportunitySourceAdapter {
  key = "khamsat";
  displayName = "Khamsat (خمسات)";

  private static BASE_URL = "https://khamsat.com/community/requests";
  private static readonly HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
    "Accept-Language": "ar,en-US;q=0.9,en;q=0.8",
  };

  async healthCheck(): Promise<SourceHealth> {
    const start = Date.now();
    try {
      const res = await axios.get(KhamsatAdapter.BASE_URL, {
        headers: KhamsatAdapter.HEADERS,
        timeout: 8000,
      });
      return {
        status: res.status === 200 ? "HEALTHY" : "DEGRADED",
        latencyMs: Date.now() - start,
        lastChecked: new Date(),
      };
    } catch (e: any) {
      return {
        status: "DOWN",
        latencyMs: Date.now() - start,
        lastChecked: new Date(),
        message: e.message || "Failed to reach Khamsat",
      };
    }
  }

  async collect(query: SourceQuery = {}): Promise<RawOpportunity[]> {
    const pages = query.pages || 2;
    const basicGigs: { title: string; url: string }[] = [];

    for (let p = 1; p <= pages; p++) {
      const pageUrl = p === 1 ? KhamsatAdapter.BASE_URL : `${KhamsatAdapter.BASE_URL}?page=${p}`;
      try {
        const response = await axios.get(pageUrl, {
          headers: KhamsatAdapter.HEADERS,
          timeout: 15000,
        });

        const $ = cheerio.load(response.data);
        const postElements = $("tr.forum_post, .forum_post").toArray();

        for (const element of postElements) {
          const el = $(element);
          const titleLink = el.find("td.details-td h3.details-head a.ajaxbtn, a.ajaxbtn").first();
          if (titleLink.length === 0) continue;

          const title = titleLink.text().trim();
          const relativeUrl = titleLink.attr("href") || "";
          const url = relativeUrl.startsWith("http") ? relativeUrl : `https://khamsat.com${relativeUrl}`;

          if (title && url) {
            basicGigs.push({ title, url });
          }
        }
      } catch (pageError: any) {
        console.warn(`[KHAMSAT_ADAPTER] Page ${p} fetch failed:`, pageError.message);
        if (p === 1 && basicGigs.length === 0) throw pageError;
        break;
      }
    }

    const gigsToFetchDetails = basicGigs.slice(0, query.limit || 15);
    const results: RawOpportunity[] = [];

    const BATCH_SIZE = 3;
    for (let i = 0; i < gigsToFetchDetails.length; i += BATCH_SIZE) {
      const batch = gigsToFetchDetails.slice(i, i + BATCH_SIZE);
      const detailResults = await Promise.allSettled(
        batch.map(async (basic) => {
          const detail = await this.fetchGigDetails(basic.url);
          const rawOpp: RawOpportunity = {
            platform: "Khamsat",
            canonicalUrl: basic.url,
            title: basic.title,
            description: detail.description,
            budgetMin: 5,
            budgetMax: 25,
            currency: "USD",
            requiredSkills: detail.skills,
            location: "Middle East / Remote",
            remote: true,
            publishedAt: new Date(),
            sourceMetadata: {
              rawBudget: "Microbudget ($5-$25)",
            },
            fingerprint: `khamsat:${basic.url}`,
          };
          return rawOpp;
        })
      );

      for (const result of detailResults) {
        if (result.status === "fulfilled") {
          results.push(result.value);
        }
      }
    }

    return results;
  }

  private async fetchGigDetails(url: string): Promise<{
    description: string;
    skills: string[];
  }> {
    try {
      const response = await axios.get(url, {
        headers: KhamsatAdapter.HEADERS,
        timeout: 10000,
      });

      const $ = cheerio.load(response.data);
      const description = $("article.replace_urls, .forum_post_content").first().text().trim() || "";

      const skillsList = [
        "برمجة", "تصميم", "كتابة", "ترجمة", "فيديو", "تسويق", "ووردبريس", "صوت", "بيانات", "موقع",
        "تطبيق", "موشن جرافيك", "تعديل صور", "تعليق صوتي", "تصميم شعار", "كتابة محتوى", "SEO",
        "سوشيال ميديا", "فوتوشوب", "اليستريتور", "مونتاج", "React", "Node", "Python"
      ];
      const matchedSkills = skillsList.filter((skill) =>
        description.toLowerCase().includes(skill.toLowerCase())
      );

      return { description, skills: matchedSkills };
    } catch {
      return { description: "", skills: [] };
    }
  }
}
