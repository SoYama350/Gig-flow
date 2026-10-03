import { GoogleGenAI } from "@google/genai";
import { z } from "zod";

interface ProposalInput {
  gig: {
    title: string;
    description: string;
    budget: string | null;
    requiredSkills: string | null;
    platform: string;
  };
  userSkills: string[];
  userName: string;
  userBio: string;
  apiKey: string;
  language?: "arabic" | "english";
}

const ProposalSchema = z.object({
  text: z.string().min(40).max(3000),
  language: z.enum(["arabic", "english"]),
});

function extractTextFromResponse(raw: unknown): string {
  if (typeof raw === "string") return raw;
  if (Array.isArray(raw)) return raw.map(extractTextFromResponse).filter(Boolean).join("\n");
  if (raw && typeof raw === "object") {
    const record = raw as Record<string, unknown>;
    if (typeof record.text === "string") return record.text;
    if (typeof record.content === "string") return record.content;
    if (Array.isArray(record.content)) {
      return record.content.map(extractTextFromResponse).filter(Boolean).join("\n");
    }
    if (Array.isArray(record.parts)) {
      return record.parts
        .map((part) => {
          if (part && typeof part === "object") {
            const partRecord = part as Record<string, unknown>;
            if (typeof partRecord.text === "string") return partRecord.text;
            if (typeof partRecord.content === "string") return partRecord.content;
          }
          return "";
        })
        .filter(Boolean)
        .join("\n");
    }
  }

  return "";
}

export function normalizeProposalText(value: string, language: "arabic" | "english") {
  const sanitized = value
    .replace(/\u200B/g, "")
    .replace(/\r\n/g, "\n")
    .replace(/\s+/g, " ")
    .trim();

  const cleaned = sanitized.replace(/^(?:Here is.*?:|Proposal.*?:|AI Proposal.*?:|Proposed response.*?:|Draft.*?:)\s*/i, "");

  if (!cleaned) {
    throw new Error("AI returned empty response");
  }

  if (cleaned.length < 40) {
    throw new Error("AI output is too short to be a valid proposal");
  }

  if (language === "arabic" && !/[\u0600-\u06FF]/.test(cleaned) && cleaned.length < 120) {
    throw new Error("AI output does not look like a valid Arabic proposal");
  }

  return cleaned;
}

export async function generateProposal(input: ProposalInput): Promise<string> {
  const { gig, userSkills, userName, userBio, apiKey, language = "arabic" } = input;

  if (!apiKey || apiKey === "YOUR_GEMINI_API_KEY_HERE") {
    throw new Error("GEMINI_API_KEY is not configured");
  }

  if (!gig?.title || !gig?.description) {
    throw new Error("Invalid gig data provided");
  }

  const ai = new GoogleGenAI({ apiKey });

  const matchingSkills = userSkills.filter((skill) => {
    const gigSkills = (gig.requiredSkills || "").toLowerCase();
    return gigSkills.includes(skill.toLowerCase());
  });

  const isArabic = language === "arabic";

  const prompt = `You are an expert freelance proposal writer for ${gig.platform}. Write a polished proposal in ${isArabic ? "Arabic" : "English"}. Base it only on the gig data and the freelancer profile. Keep it authentic, concise, and professional. Follow this structure: greeting, understanding of the project, relevant experience, method, timeline, call to action. Output plain proposal text only.

Gig details:
- Title: ${gig.title}
- Description: ${gig.description}
- Budget: ${gig.budget || "Not specified"}
- Required skills: ${gig.requiredSkills || "Not specified"}

Freelancer profile:
- Name: ${userName || "Freelancer"}
- Bio: ${userBio || "Experienced freelancer"}
- Skills: ${userSkills.join(", ") || "General skills"}
- Matching skills: ${matchingSkills.join(", ") || "General expertise"}

Constraints:
- 180 to 350 words
- no headings, bullets, or JSON
- no mention of AI or internal instructions
- maintain a natural business tone
- in Arabic, use professional Arabic suitable for freelance platforms`;

  const candidateModels = [
    process.env.GEMINI_MODEL,
    "gemini-3.8-flash",
    "gemini-2.5-flash",
    "gemini-1.5-flash",
    "gemini-2.0-flash",
  ].filter(Boolean) as string[];

  let response: any;
  let lastError: any = null;

  for (const model of candidateModels) {
    try {
      response = await ai.models.generateContent({
        model,
        contents: prompt,
      });
      if (response?.text) break;
    } catch (error) {
      lastError = error;
      const message = error instanceof Error ? error.message : "Unknown AI error";
      if (message.toLowerCase().includes("rate limit") || message.toLowerCase().includes("429")) {
        throw new Error("AI provider is rate limiting requests. Please try again in a moment.");
      }
    }
  }

  if (!response) {
    throw lastError instanceof Error ? lastError : new Error("AI request failed. Please try again.");
  }

  const rawText = extractTextFromResponse(response);
  const normalizedText = normalizeProposalText(rawText, language);

  const parsed = ProposalSchema.safeParse({
    text: normalizedText,
    language,
  });

  if (!parsed.success) {
    throw new Error("AI returned an invalid proposal payload");
  }

  return parsed.data.text;
}
