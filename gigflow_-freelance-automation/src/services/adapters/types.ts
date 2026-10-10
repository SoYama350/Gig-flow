export interface SourceQuery {
  skills?: string[];
  remoteOnly?: boolean;
  limit?: number;
  pages?: number;
  keyword?: string;
  minBudget?: number;
}

export interface RawOpportunity {
  platform: string;
  externalId?: string;
  canonicalUrl: string;
  title: string;
  description: string;
  budgetMin?: number;
  budgetMax?: number;
  currency?: string;
  requiredSkills: string[];
  location?: string;
  remote?: boolean;
  publishedAt?: string | Date;
  sourceMetadata?: Record<string, unknown>;
  fingerprint?: string;
}

export interface SourceHealth {
  status: "HEALTHY" | "DEGRADED" | "DOWN";
  latencyMs?: number;
  lastChecked: Date;
  message?: string;
}

export interface OpportunitySourceAdapter {
  key: string;
  displayName: string;
  collect(query: SourceQuery): Promise<RawOpportunity[]>;
  healthCheck?(): Promise<SourceHealth>;
}
