import { OpportunitySourceAdapter, RawOpportunity, SourceHealth, SourceQuery } from "./types.js";
import { MostaqlAdapter } from "./mostaqlAdapter.js";
import { KhamsatAdapter } from "./khamsatAdapter.js";
import { WeWorkRemotelyAdapter } from "./wwrAdapter.js";
import { RemoteOkAdapter } from "./remoteOkAdapter.js";
import { FreelancerAdapter } from "./freelancerAdapter.js";
import { ScraplingClient } from "./scraplingClient.js";

export interface SourceExecutionResult {
  sourceKey: string;
  status: "SUCCESS" | "PARTIAL_FAILURE" | "FAILED";
  count: number;
  durationMs: number;
  error?: string;
}

export interface CollectionResult {
  sourceRuns: SourceExecutionResult[];
  opportunities: RawOpportunity[];
}

export class SourceRegistry {
  private adapters = new Map<string, OpportunitySourceAdapter>();

  constructor() {
    this.register(new MostaqlAdapter());
    this.register(new KhamsatAdapter());
    this.register(new FreelancerAdapter());
    this.register(new WeWorkRemotelyAdapter());
    this.register(new RemoteOkAdapter());
  }

  register(adapter: OpportunitySourceAdapter) {
    this.adapters.set(adapter.key.toLowerCase(), adapter);
  }

  getAdapter(key: string): OpportunitySourceAdapter | undefined {
    return this.adapters.get(key.toLowerCase());
  }

  getAllAdapters(): OpportunitySourceAdapter[] {
    return Array.from(this.adapters.values());
  }

  async checkAllHealth(): Promise<Record<string, SourceHealth>> {
    const healthMap: Record<string, SourceHealth> = {};

    // Check Python Scrapling Service
    healthMap["scrapling_service"] = await ScraplingClient.healthCheck();

    const checkPromises = Array.from(this.adapters.entries()).map(async ([key, adapter]) => {
      if (adapter.healthCheck) {
        healthMap[key] = await adapter.healthCheck();
      } else {
        healthMap[key] = {
          status: "HEALTHY",
          lastChecked: new Date(),
        };
      }
    });

    await Promise.allSettled(checkPromises);
    return healthMap;
  }

  async collectFromSources(sourceKeys: string[], query: SourceQuery = {}): Promise<CollectionResult> {
    const rawOpps: RawOpportunity[] = [];
    const sourceRuns: SourceExecutionResult[] = [];
    const seenFingerprints = new Set<string>();

    const targetKeys = sourceKeys.length > 0
      ? sourceKeys.map((k) => k.toLowerCase())
      : ["mostaql", "khamsat", "freelancer", "weworkremotely"];

    // 1. Try Scrapling service first if available
    const scraplingAvailable = await ScraplingClient.isAvailable();
    let pendingKeys = [...targetKeys];

    if (scraplingAvailable) {
      console.log("[SOURCE_REGISTRY] Delegating collection to Python Scrapling microservice...");
      const scraplingResult = await ScraplingClient.scrape(targetKeys, query);
      if (scraplingResult) {
        for (const opp of scraplingResult.opportunities) {
          const fp = opp.fingerprint || `${opp.platform.toLowerCase()}:${opp.canonicalUrl}`;
          if (!seenFingerprints.has(fp)) {
            seenFingerprints.add(fp);
            rawOpps.push(opp);
          }
        }
        for (const run of scraplingResult.sourceRuns) {
          sourceRuns.push({
            sourceKey: run.source,
            status: run.status as any,
            count: run.count,
            durationMs: 0,
            error: run.error,
          });
        }
        // Remove successfully scraped sources
        pendingKeys = targetKeys.filter((k) => !scraplingResult.sourceRuns.some((r) => r.source === k && r.status === "SUCCESS"));
      }
    }

    // 2. Run native TypeScript adapters for remaining/fallback sources
    const adapterPromises = pendingKeys.map(async (key) => {
      const adapter = this.adapters.get(key);
      const start = Date.now();

      if (!adapter) {
        sourceRuns.push({
          sourceKey: key,
          status: "FAILED",
          count: 0,
          durationMs: Date.now() - start,
          error: `No adapter registered for source: ${key}`,
        });
        return [];
      }

      try {
        console.log(`[SOURCE_REGISTRY] Collecting from native adapter: ${adapter.displayName}...`);
        const items = await adapter.collect(query);

        sourceRuns.push({
          sourceKey: key,
          status: "SUCCESS",
          count: items.length,
          durationMs: Date.now() - start,
        });

        return items;
      } catch (err: any) {
        console.error(`[SOURCE_REGISTRY] Source ${key} collection failed:`, err.message || err);
        sourceRuns.push({
          sourceKey: key,
          status: "PARTIAL_FAILURE",
          count: 0,
          durationMs: Date.now() - start,
          error: err.message || "Collection failed",
        });
        return [];
      }
    });

    const results = await Promise.allSettled(adapterPromises);

    for (const res of results) {
      if (res.status === "fulfilled") {
        for (const opp of res.value) {
          const fp = opp.fingerprint || `${opp.platform.toLowerCase()}:${opp.canonicalUrl}`;
          if (!seenFingerprints.has(fp)) {
            seenFingerprints.add(fp);
            rawOpps.push(opp);
          }
        }
      }
    }

    return {
      sourceRuns,
      opportunities: rawOpps,
    };
  }
}

export const sourceRegistry = new SourceRegistry();
