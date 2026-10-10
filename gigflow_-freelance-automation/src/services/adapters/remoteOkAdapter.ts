import axios from "axios";
import { OpportunitySourceAdapter, SourceQuery, RawOpportunity, SourceHealth } from "./types.js";

export class RemoteOkAdapter implements OpportunitySourceAdapter {
  key = "remoteok";
  displayName = "RemoteOK";

  private static API_URL = "https://remoteok.com/api";

  async healthCheck(): Promise<SourceHealth> {
    const start = Date.now();
    try {
      const res = await axios.get(RemoteOkAdapter.API_URL, {
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
        message: e.message || "Failed to reach RemoteOK",
      };
    }
  }

  async collect(query: SourceQuery = {}): Promise<RawOpportunity[]> {
    try {
      const response = await axios.get(RemoteOkAdapter.API_URL, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
          "Accept": "application/json",
        },
        timeout: 15000,
      });

      if (!Array.isArray(response.data)) return [];

      // First entry in remoteOK API is usually a legal/meta object
      const jobs = response.data.slice(1);
      const results: RawOpportunity[] = [];

      for (const job of jobs) {
        if (!job.position || !job.url) continue;

        const skills = Array.isArray(job.tags) ? job.tags : [];
        const cleanDesc = (job.description || "").replace(/<[^>]*>?/gm, " ").replace(/\s+/g, " ").trim();

        const rawOpp: RawOpportunity = {
          platform: "RemoteOK",
          externalId: job.id ? String(job.id) : undefined,
          canonicalUrl: job.url.startsWith("http") ? job.url : `https://remoteok.com${job.url}`,
          title: `${job.company ? job.company + ": " : ""}${job.position}`,
          description: cleanDesc.slice(0, 1500),
          budgetMin: job.salary_min || undefined,
          budgetMax: job.salary_max || undefined,
          currency: "USD",
          requiredSkills: skills,
          location: job.location || "Remote",
          remote: true,
          publishedAt: job.date ? new Date(job.date) : new Date(),
          sourceMetadata: {
            company: job.company,
            applyUrl: job.apply_url || job.url,
          },
          fingerprint: `remoteok:${job.id || job.url}`,
        };

        results.push(rawOpp);
        if (results.length >= (query.limit || 25)) break;
      }

      return results;
    } catch (error: any) {
      console.error("[REMOTEOK_ADAPTER] Error fetching RemoteOK:", error.message || error);
      return [];
    }
  }
}
