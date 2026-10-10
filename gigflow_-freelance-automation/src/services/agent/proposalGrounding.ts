import { GoogleGenAI } from "@google/genai";
import { RawOpportunity } from "../adapters/types.js";
import { UserContext } from "./candidateRanker.js";

export interface GroundedProposalResult {
  proposal: string;
  groundedIn: {
    profileSkillsUsed: string[];
    documentsReferenced: string[];
    platformGuidelinesApplied: string;
  };
}

export class ProposalGroundingEngine {
  static async generateGroundedProposal(
    opportunity: RawOpportunity,
    userContext: UserContext,
    apiKey: string,
    options: { language?: "arabic" | "english" | "auto" } = {}
  ): Promise<GroundedProposalResult> {
    const isArabicOpportunity =
      opportunity.platform.toLowerCase() === "mostaql" ||
      opportunity.platform.toLowerCase() === "khamsat" ||
      /[\u0600-\u06FF]/.test(opportunity.title + " " + opportunity.description);

    const targetLang =
      options.language && options.language !== "auto"
        ? options.language
        : isArabicOpportunity
        ? "arabic"
        : "english";

    const matchedSkills = userContext.skills.filter((skill) => {
      const text = (opportunity.title + " " + opportunity.description + " " + (opportunity.requiredSkills || []).join(" ")).toLowerCase();
      return text.includes(skill.toLowerCase());
    });

    const proposalGuideDoc = userContext.documents.find((d) => d.type === "PROPOSAL_GUIDE");
    const portfolioDoc = userContext.documents.find((d) => d.type === "PORTFOLIO");

    const prompt = `You are a high-conversion professional proposal writer for freelance and remote opportunities on ${opportunity.platform}.

### STRICT GROUNDING RULES:
1. ONLY reference skills, facts, and experiences explicitly listed in the Freelancer Profile.
2. DO NOT invent fake past clients, unverified metrics, or non-existent degrees/credentials.
3. If an uploaded Proposal Guide is provided, adhere strictly to its tone, structure, and communication rules.
4. Tone must be professional, direct, consultative, and authentic.
5. Write the proposal in ${targetLang === "arabic" ? "Arabic (العربية)" : "English"}.

### Opportunity Details:
- Title: ${opportunity.title}
- Platform: ${opportunity.platform}
- Budget: ${opportunity.budgetMin ? "$" + opportunity.budgetMin : ""}${opportunity.budgetMax ? " - $" + opportunity.budgetMax : opportunity.sourceMetadata?.rawBudget || "Not specified"}
- Requirements: ${opportunity.description}
- Required Skills: ${(opportunity.requiredSkills || []).join(", ") || "General requirements"}

### Freelancer Facts & Grounding Context:
- Name: ${userContext.name}
- Bio/Role: ${userContext.bio || "Freelance Specialist"}
- Profile Skills: ${userContext.skills.join(", ")}
- Matched Skills for this Opportunity: ${matchedSkills.join(", ") || userContext.skills.slice(0, 4).join(", ")}
${proposalGuideDoc ? `\n### User's Uploaded Proposal Guide:\n${proposalGuideDoc.text.slice(0, 1000)}` : ""}
${portfolioDoc ? `\n### User's Portfolio Evidence:\n${portfolioDoc.text.slice(0, 1000)}` : ""}

### Structure Instructions:
1. Concise opening acknowledging the client's core problem.
2. 2-3 specific technical or strategic bullet points outlining the execution approach.
3. Relevant evidence from the freelancer's actual skills.
4. Realistic timeline/delivery approach.
5. Action-oriented closing with a question to begin collaboration.
6. Length: 180 - 320 words. No meta-commentary, markdown backticks, or greetings like "Here is your proposal". Output proposal text directly.`;

    const ai = new GoogleGenAI({ apiKey });
    const candidateModels = [
      process.env.GEMINI_MODEL,
      "gemini-3.8-flash",
      "gemini-2.5-flash",
      "gemini-1.5-flash",
      "gemini-2.0-flash",
    ].filter(Boolean) as string[];

    let proposalText = "";
    let lastError: any = null;

    for (const model of candidateModels) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: prompt,
        });

        if (response.text) {
          proposalText = response.text.trim();
          break;
        }
      } catch (err: any) {
        lastError = err;
        console.warn(`[PROPOSAL_GROUNDING] Model ${model} failed:`, err?.message || err);
      }
    }

    if (!proposalText) {
      throw lastError || new Error("Failed to generate proposal text from AI provider.");
    }

    const docsUsed: string[] = [];
    if (proposalGuideDoc) docsUsed.push(proposalGuideDoc.name);
    if (portfolioDoc) docsUsed.push(portfolioDoc.name);

    return {
      proposal: proposalText,
      groundedIn: {
        profileSkillsUsed: matchedSkills.length > 0 ? matchedSkills : userContext.skills,
        documentsReferenced: docsUsed,
        platformGuidelinesApplied: `${opportunity.platform} Standard Grounding`,
      },
    };
  }
}
