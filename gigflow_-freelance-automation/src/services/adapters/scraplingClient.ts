import axios from "axios";
import { RawOpportunity, SourceQuery, SourceHealth } from "./types.js";

export class ScraplingClient {
  private static getServiceUrl(): string {
    return process.env.SCRAPLING_SERVICE_URL || "http://127.0.0.1:8000";
  }

  static async isAvailable(): Promise<boolean> {
    try {
      const res = await axios.get(`${this.getServiceUrl()}/health`, { timeout: 2000 });
      return res.status === 200;
    } catch {
      return false;
    }
  }

  static async healthCheck(): Promise<SourceHealth> {
    const start = Date.now();
    try {
      const res = await axios.get(`${this.getServiceUrl()}/health`, { timeout: 3000 });
      return {
        status: res.status === 200 ? "HEALTHY" : "DEGRADED",
        latencyMs: Date.now() - start,
        lastChecked: new Date(),
        message: res.data?.version ? `Scrapling Service v${res.data.version}` : "Running",
      };
    } catch (e: any) {
      return {
        status: "DOWN",
        latencyMs: Date.now() - start,
        lastChecked: new Date(),
        message: "Scrapling service is offline (using native TypeScript fallback adapters)",
      };
    }
  }

  static async scrape(sources: string[], query: SourceQuery): Promise<{
    sourceRuns: { source: string; status: string; count: number }[];
    opportunities: RawOpportunity[];
  } | null> {
    try {
      const response = await axios.post(
        `${this.getServiceUrl()}/scrape`,
        {
          sources,
          query,
          limitPerSource: query.limit || 25,
        },
        { timeout: 45000 }
      );

      if (response.data && Array.isArray(response.data.opportunities)) {
        return response.data;
      }
      return null;
    } catch (error: any) {
      console.warn("[SCRAPLING_CLIENT] Python Scrapling service request failed, falling back to native adapters:", error.message);
      return null;
    }
  }
}
