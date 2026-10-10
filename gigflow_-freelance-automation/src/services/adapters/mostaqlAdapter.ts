import axios from "axios";
import * as cheerio from "cheerio";
import { OpportunitySourceAdapter, SourceQuery, RawOpportunity, SourceHealth } from "./types.js";

export class MostaqlAdapter implements OpportunitySourceAdapter {
  key = "mostaql";
  displayName = "Mostaql (مستقل)";

  private static BASE_URL = "https://mostaql.com/projects";
  private static readonly HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
    "Accept-Language": "ar,en-US;q=0.9,en;q=0.8",
    "Cache-Control": "max-age=0",
  };

  async healthCheck(): Promise<SourceHealth> {
    const start = Date.now();
    try {
      const res = await axios.get(MostaqlAdapter.BASE_URL, {
        headers: MostaqlAdapter.HEADERS,
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
        message: e.message || "Failed to reach Mostaql",
      };
    }
  }

  async collect(query: SourceQuery = {}): Promise<RawOpportunity[]> {
    const pages = query.pages || 2;
    const basicGigs: { title: string; description: string; url: string }[] = [];

    for (let p = 1; p <= pages; p++) {
      const pageUrl = p === 1 ? MostaqlAdapter.BASE_URL : `${MostaqlAdapter.BASE_URL}?page=${p}`;
      try {
        const response = await axios.get(pageUrl, {
          headers: MostaqlAdapter.HEADERS,
          timeout: 15000,
        });

        const $ = cheerio.load(response.data);
        const projectElements = $(".project-row, tr.project-row").toArray();

        for (const element of projectElements) {
          const el = $(element);
          const titleLink = el.find("h2 a, .card--title a, a.details-url").first();
          if (titleLink.length === 0) continue;

          const title = titleLink.text().trim();
          const relativeUrl = titleLink.attr("href") || "";
          const url = relativeUrl.startsWith("http") ? relativeUrl : `https://mostaql.com${relativeUrl}`;
          const description = el.find("p.project__brief, .project-content__body").text().trim();

          if (title && url) {
            basicGigs.push({ title, description, url });
          }
        }
      } catch (pageError: any) {
        console.warn(`[MOSTAQL_ADAPTER] Page ${p} fetch failed:`, pageError.message);
        if (p === 1 && basicGigs.length === 0) throw pageError;
        break;
      }
    }

    // Limit details scraping concurrency
    const gigsToFetchDetails = basicGigs.slice(0, query.limit || 15);
    const results: RawOpportunity[] = [];

    const BATCH_SIZE = 3;
    for (let i = 0; i < gigsToFetchDetails.length; i += BATCH_SIZE) {
      const batch = gigsToFetchDetails.slice(i, i + BATCH_SIZE);
      const detailResults = await Promise.allSettled(
        batch.map(async (basic) => {
          const detail = await this.fetchGigDetails(basic.url);
          const rawOpp: RawOpportunity = {
            platform: "Mostaql",
            canonicalUrl: basic.url,
            title: basic.title,
            description: detail.description || basic.description,
            budgetMin: detail.budgetMin,
            budgetMax: detail.budgetMax,
            currency: "USD",
            requiredSkills: detail.skills,
            location: "Middle East / Remote",
            remote: true,
            publishedAt: new Date(),
            sourceMetadata: {
              rawBudget: detail.rawBudget,
            },
            fingerprint: `mostaql:${basic.url}`,
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
    rawBudget: string;
    budgetMin?: number;
    budgetMax?: number;
    skills: string[];
    description: string;
  }> {
    try {
      const response = await axios.get(url, {
        headers: MostaqlAdapter.HEADERS,
        timeout: 10000,
      });

      const $ = cheerio.load(response.data);

      let rawBudget = "Not specified";
      let budgetMin: number | undefined;
      let budgetMax: number | undefined;

      $(".meta-row").each((_, row) => {
        const label = $(row).find(".meta-label").text().trim();
        if (label.includes("الميزانية")) {
          rawBudget = $(row).find(".meta-value span").text().trim() || $(row).find(".meta-value").text().trim();
        }
      });

      // Parse $50.00 - $100.00
      const matches = rawBudget.match(/\$?(\d+[\d,.]*)/g);
      if (matches && matches.length >= 2) {
        budgetMin = parseFloat(matches[0].replace(/[^0-9.]/g, ""));
        budgetMax = parseFloat(matches[1].replace(/[^0-9.]/g, ""));
      } else if (matches && matches.length === 1) {
        budgetMin = parseFloat(matches[0].replace(/[^0-9.]/g, ""));
      }

      const skillsSet = new Set<string>();
      $(".skills.list-tags .skills__item a.tag, .tag").each((_, skillElem) => {
        const skill = $(skillElem).text().trim();
        if (skill) skillsSet.add(skill);
      });

      const description = $(".project-content__body, .fr-view").first().text().trim();

      return { rawBudget, budgetMin, budgetMax, skills: Array.from(skillsSet), description };
    } catch {
      return { rawBudget: "Not specified", skills: [], description: "" };
    }
  }
}
