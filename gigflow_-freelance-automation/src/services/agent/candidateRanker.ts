import { GoogleGenAI } from "@google/genai";
import { RawOpportunity } from "../adapters/types.js";

export interface CandidateEvaluation {
  opportunity: RawOpportunity;
  score: number; // 0 - 100
  fit: "high" | "medium" | "low";
  recommendation: "APPLY" | "REVIEW" | "SKIP";
  reasons: string[];
  risks: string[];
  matchedSkills: string[];
  missingSkills: string[];
}

export interface UserContext {
  name: string;
  bio: string;
  skills: string[];
  documents: { name: string; type: string; text: string }[];
}

export class CandidateRanker {
  /**
   * Deterministic pre-filter: strips invalid entries, computes fast token overlap.
   */
  static preFilterAndScore(
    opportunities: RawOpportunity[],
    userContext: UserContext,
    options: { minBudget?: number; remoteOnly?: boolean } = {}
  ): { opp: RawOpportunity; deterministicScore: number }[] {
    const userSkillsLower = userContext.skills.map((s) => s.toLowerCase());

    return opportunities
      .filter((opp) => {
        if (!opp.title || !opp.canonicalUrl) return false;
        if (options.remoteOnly && opp.remote === false) return false;
        if (options.minBudget && opp.budgetMax && opp.budgetMax < options.minBudget) return false;
        return true;
      })
      .map((opp) => {
        const fullText = (opp.title + " " + opp.description + " " + (opp.requiredSkills || []).join(" ")).toLowerCase();
        let matchCount = 0;

        for (const skill of userSkillsLower) {
          if (fullText.includes(skill)) {
            matchCount++;
          }
        }

        const skillScore = userSkillsLower.length > 0 ? (matchCount / userSkillsLower.length) * 100 : 50;
        return {
          opp,
          deterministicScore: Math.min(Math.round(skillScore), 100),
        };
      })
      .sort((a, b) => b.deterministicScore - a.deterministicScore);
  }

  /**
   * AI-powered ranker and evaluator with structured output.
   */
  static async evaluateCandidates(
    candidates: RawOpportunity[],
    userContext: UserContext,
    apiKey: string,
    targetCount: number = 10
  ): Promise<CandidateEvaluation[]> {
    if (candidates.length === 0) return [];

    const topCandidates = candidates.slice(0, Math.min(candidates.length, targetCount * 2));

    const prompt = `You are a strict, objective freelance opportunity evaluator.
Evaluate the following ${topCandidates.length} job opportunities for this freelancer profile.

Freelancer Profile:
- Name: ${userContext.name}
- Bio: ${userContext.bio || "Experienced specialist"}
- Skills: ${userContext.skills.join(", ") || "General skills"}
${userContext.documents.length > 0 ? "- Guidelines/Portfolio: " + userContext.documents.map((d) => `[${d.name}]: ${d.text.slice(0, 300)}`).join("\n") : ""}

Opportunities to Evaluate:
${topCandidates
  .map(
    (c, idx) => `
ID: ${idx + 1}
Title: ${c.title}
Platform: ${c.platform}
Budget: ${c.budgetMin ? "$" + c.budgetMin : ""}${c.budgetMax ? " - $" + c.budgetMax : c.sourceMetadata?.rawBudget || "Not specified"}
Skills: ${(c.requiredSkills || []).join(", ") || "None listed"}
Description: ${c.description.slice(0, 450)}
`
  )
  .join("\n---")}

Instructions:
Evaluate fit, score (0 to 100), recommendation ("APPLY", "REVIEW", or "SKIP"), specific concrete reasons, risks/drawbacks, matched skills, and missing skills for each item.

Respond ONLY with a valid JSON array of objects with the exact schema:
[
  {
    "id": 1,
    "score": 90,
    "fit": "high",
    "recommendation": "APPLY",
    "reasons": ["Direct skill alignment with React", "Budget matches expectation"],
    "risks": ["Vague milestone definitions"],
    "matchedSkills": ["React"],
    "missingSkills": []
  }
]`;

    try {
      const ai = new GoogleGenAI({ apiKey });
      const candidateModels = [
        process.env.GEMINI_MODEL,
        "gemini-3.8-flash",
        "gemini-2.5-flash",
        "gemini-1.5-flash",
        "gemini-2.0-flash",
      ].filter(Boolean) as string[];

      let responseText = "";

      for (const model of candidateModels) {
        try {
          const res = await ai.models.generateContent({
            model,
            contents: prompt,
          });
          if (res.text) {
            responseText = res.text;
            break;
          }
        } catch (e) {
          console.warn(`[CANDIDATE_RANKER] Model ${model} failed, trying next:`, (e as any)?.message);
        }
      }

      if (responseText) {
        // Strip markdown code fences if present
        const cleanJson = responseText.replace(/```json/gi, "").replace(/```/g, "").trim();
        const parsed = JSON.parse(cleanJson);

        if (Array.isArray(parsed)) {
          const evaluations: CandidateEvaluation[] = [];

          for (let i = 0; i < topCandidates.length; i++) {
            const opp = topCandidates[i];
            const evalData = parsed.find((p: any) => p.id === i + 1) || parsed[i];

            if (evalData) {
              evaluations.push({
                opportunity: opp,
                score: typeof evalData.score === "number" ? Math.min(Math.max(evalData.score, 0), 100) : 75,
                fit: ["high", "medium", "low"].includes(evalData.fit) ? evalData.fit : "medium",
                recommendation: ["APPLY", "REVIEW", "SKIP"].includes(evalData.recommendation) ? evalData.recommendation : "REVIEW",
                reasons: Array.isArray(evalData.reasons) ? evalData.reasons : ["Matches user skill profile"],
                risks: Array.isArray(evalData.risks) ? evalData.risks : [],
                matchedSkills: Array.isArray(evalData.matchedSkills) ? evalData.matchedSkills : opp.requiredSkills || [],
                missingSkills: Array.isArray(evalData.missingSkills) ? evalData.missingSkills : [],
              });
            } else {
              evaluations.push({
                opportunity: opp,
                score: 70,
                fit: "medium",
                recommendation: "REVIEW",
                reasons: ["Relevant opportunity from source"],
                risks: [],
                matchedSkills: opp.requiredSkills || [],
                missingSkills: [],
              });
            }
          }

          return evaluations.sort((a, b) => b.score - a.score);
        }
      }
    } catch (error: any) {
      console.warn("[CANDIDATE_RANKER] AI evaluation failed, falling back to deterministic scoring:", error.message || error);
    }

    // Fallback if AI call fails
    return topCandidates.map((opp) => {
      const matched = (opp.requiredSkills || []).filter((s) =>
        userContext.skills.some((us) => us.toLowerCase() === s.toLowerCase())
      );
      const score = matched.length > 0 ? 80 : 60;
      return {
        opportunity: opp,
        score,
        fit: score >= 80 ? "high" : "medium",
        recommendation: score >= 80 ? "APPLY" : "REVIEW",
        reasons: [`Relevant opportunity from ${opp.platform}`],
        risks: [],
        matchedSkills: matched,
        missingSkills: [],
      };
    });
  }
}
