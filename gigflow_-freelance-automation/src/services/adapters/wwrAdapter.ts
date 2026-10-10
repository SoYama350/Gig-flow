import axios from "axios";
import * as cheerio from "cheerio";
import { OpportunitySourceAdapter, SourceQuery, RawOpportunity, SourceHealth } from "./types.js";

export class WeWorkRemotelyAdapter implements OpportunitySourceAdapter {
  key = "weworkremotely";
  displayName = "We Work Remotely";

  private static FEED_URL = "https://weworkremotely.com/categories/remote-programming-jobs.rss";

  async healthCheck(): Promise<SourceHealth> {
    const start = Date.now();
    try {
      const res = await axios.get(WeWorkRemotelyAdapter.FEED_URL, {
        headers: { "User-Agent": "GigFlow-OpportunityEngine/1.0" },
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
        message: e.message || "Failed to reach We Work Remotely",
      };
    }
  }

  async collect(query: SourceQuery = {}): Promise<RawOpportunity[]> {
    try {
      const response = await axios.get(WeWorkRemotelyAdapter.FEED_URL, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
          "Accept": "application/rss+xml, application/xml, text/xml",
        },
        timeout: 15000,
      });

      const $ = cheerio.load(response.data, { xmlMode: true });
      const items = $("item").toArray();
      const results: RawOpportunity[] = [];

      for (const item of items) {
        const el = $(item);
        const title = el.find("title").text().trim();
        const link = el.find("link").text().trim() || el.find("guid").text().trim();
        const descriptionHtml = el.find("description").text().trim();
        const pubDateStr = el.find("pubDate").text().trim();

        if (!title || !link) continue;

        // Clean HTML tags from description
        const cleanDesc = cheerio.load(descriptionHtml).text().replace(/\s+/g, " ").trim();

        // Extract skills
        const candidateSkills = [
          "React", "Node", "TypeScript", "JavaScript", "Python", "Go", "Rust", "Ruby",
          "Rails", "PostgreSQL", "AWS", "Docker", "Kubernetes", "Next.js", "Vue", "Tailwind",
          "DevOps", "Fullstack", "Frontend", "Backend", "AI", "Machine Learning"
        ];
        const matchedSkills = candidateSkills.filter((s) =>
          (title + " " + cleanDesc).toLowerCase().includes(s.toLowerCase())
        );

        const rawOpp: RawOpportunity = {
          platform: "WeWorkRemotely",
          canonicalUrl: link,
          title,
          description: cleanDesc.slice(0, 1500),
          budgetMin: 3000,
          budgetMax: 10000,
          currency: "USD",
          requiredSkills: matchedSkills,
          location: "Worldwide / Remote",
          remote: true,
          publishedAt: pubDateStr ? new Date(pubDateStr) : new Date(),
          sourceMetadata: {
            feedSource: "programming-jobs",
          },
          fingerprint: `weworkremotely:${link}`,
        };

        results.push(rawOpp);
        if (results.length >= (query.limit || 25)) break;
      }

      return results;
    } catch (error: any) {
      console.error("[WWR_ADAPTER] Error fetching WWR feed:", error.message || error);
      return [];
    }
  }
}
