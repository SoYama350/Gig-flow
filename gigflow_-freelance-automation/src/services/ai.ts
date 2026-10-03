import { GoogleGenAI } from "@google/genai";

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

export async function generateProposal(input: ProposalInput): Promise<string> {
  const { gig, userSkills, userName, userBio, apiKey, language = "arabic" } = input;

  const ai = new GoogleGenAI({ apiKey });

  const matchingSkills = userSkills.filter((skill) => {
    const gigSkills = (gig.requiredSkills || "").toLowerCase();
    return gigSkills.includes(skill.toLowerCase());
  });

  const isArabic = language === "arabic";

  const prompt = `You are an expert freelance proposal writer specializing in ${gig.platform} (an Arabic freelance platform).

**Gig Details:**
- Title: ${gig.title}
- Description: ${gig.description}
- Budget: ${gig.budget || "Not specified"}
- Required Skills: ${gig.requiredSkills || "Not specified"}

**Freelancer Profile:**
- Name: ${userName}
- Bio: ${userBio || "Experienced freelancer"}
- Skills: ${userSkills.join(", ") || "Various technical skills"}
- Matching Skills: ${matchingSkills.join(", ") || "General expertise"}

**Instructions:**
1. Write the proposal in ${isArabic ? "Arabic (العربية)" : "English"}
2. Start with a professional greeting
3. Show clear understanding of the project requirements
4. Highlight relevant experience and matching skills
5. Propose a clear approach/methodology
6. Include a realistic timeline estimate
7. End with a confident call to action
8. Keep it concise but thorough (200-350 words)
9. Be authentic — avoid generic templates
10. Match the tone to the gig type (technical vs creative)
${isArabic ? "11. Use professional Arabic business language suitable for Mostaql platform" : "11. Use clear, professional English"}

Write ONLY the proposal text, no headers or meta-commentary.`;

  const candidateModels = [
    process.env.GEMINI_MODEL,
    "gemini-3.8-flash",
    "gemini-2.5-flash",
    "gemini-1.5-flash",
    "gemini-2.0-flash",
  ].filter(Boolean) as string[];

  let lastError: any = null;

  for (const model of candidateModels) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: prompt,
      });

      const text = response.text;
      if (text) {
        return text;
      }
    } catch (error: any) {
      lastError = error;
      console.warn(`[AI] Model ${model} failed, trying fallback:`, error?.message || error);
    }
  }

  throw lastError || new Error("AI returned empty response");
}
