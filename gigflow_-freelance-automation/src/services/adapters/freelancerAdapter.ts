import axios from "axios";
import { OpportunitySourceAdapter, SourceQuery, RawOpportunity, SourceHealth } from "./types.js";

export class FreelancerAdapter implements OpportunitySourceAdapter {
  key = "freelancer";
  displayName = "Freelancer.com";

  private static BASE_URL = "https://www.freelancer.com/api/projects/0.1/projects/active/";
  private static readonly HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    "Accept": "application/json",
  };

  async healthCheck(): Promise<SourceHealth> {
    const start = Date.now();
    try {
      const res = await axios.get(`${FreelancerAdapter.BASE_URL}?compact=true&limit=1`, {
        headers: FreelancerAdapter.HEADERS,
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
        message: e.message || "Failed to reach Freelancer.com API",
      };
    }
  }

  async collect(query: SourceQuery = {}): Promise<RawOpportunity[]> {
    const limit = Math.min(query.limit || 20, 50);
    const params: Record<string, any> = {
      compact: "false",
      limit,
      job_details: "true",
      full_description: "true",
    };

    if (query.keyword) {
      params.query = query.keyword;
    } else if (query.skills && query.skills.length > 0) {
      params.query = query.skills.slice(0, 3).join(" ");
    }

    try {
      const response = await axios.get(FreelancerAdapter.BASE_URL, {
        headers: FreelancerAdapter.HEADERS,
        params,
        timeout: 15000,
      });

      const projects = response.data?.result?.projects || [];
      const results: RawOpportunity[] = [];

      for (const p of projects) {
        if (!p.title) continue;

        const skills: string[] = Array.isArray(p.jobs)
          ? p.jobs.map((j: any) => j.name).filter(Boolean)
          : [];

        const canonicalUrl = p.seo_url
          ? `https://www.freelancer.com/projects/${p.seo_url}`
          : `https://www.freelancer.com/projects/${p.id}`;

        const rawOpp: RawOpportunity = {
          platform: "Freelancer.com",
          externalId: String(p.id),
          canonicalUrl,
          title: p.title.trim(),
          description: p.description?.trim() || p.preview_description?.trim() || "",
          budgetMin: p.budget?.minimum ? Number(p.budget.minimum) : undefined,
          budgetMax: p.budget?.maximum ? Number(p.budget.maximum) : undefined,
          currency: p.currency?.code || "USD",
          requiredSkills: skills,
          location: p.location?.country?.name || "Global / Remote",
          remote: true,
          publishedAt: p.submitdate ? new Date(p.submitdate * 1000) : new Date(),
          sourceMetadata: {
            bidCount: p.bid_stats?.bid_count || 0,
            projectType: p.type || "fixed",
            currencySign: p.currency?.sign || "$",
            featured: !!p.featured,
            urgent: !!p.urgent,
          },
          fingerprint: `freelancer:${p.id}`,
        };

        results.push(rawOpp);
      }

      return results;
    } catch (err: any) {
      console.error("[FREELANCER_ADAPTER] Collection error:", err.message);
      return [];
    }
  }
}
