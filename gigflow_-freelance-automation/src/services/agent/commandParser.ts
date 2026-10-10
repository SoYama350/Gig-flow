export interface ParsedAgentPlan {
  targetCount: number;
  sources: string[];
  skills: string[];
  remoteOnly: boolean;
  minBudget?: number;
  language: "arabic" | "english" | "auto";
  notes: string;
}

export function parseAgentInstruction(instruction: string, defaultSkills: string[] = []): ParsedAgentPlan {
  const text = instruction.toLowerCase();

  // 1. Target count (e.g., "apply to 10 gigs", "find 5 opportunities", "15 jobs")
  let targetCount = 10;
  const countMatch = instruction.match(/(?:apply\s+to|find|get|scrape|prepare|select)?\s*(\d+)\s*(?:gigs|jobs|opportunities|projects|offers|عروض|مشاريع|وظائف)/i)
    || instruction.match(/(\d+)\s*(?:gigs|jobs|opportunities|projects|عروض|مشاريع|وظائف)/i);
  if (countMatch && parseInt(countMatch[1], 10) > 0) {
    targetCount = Math.min(Math.max(parseInt(countMatch[1], 10), 1), 30);
  }

  // 2. Source extraction
  const sources: string[] = [];
  if (text.includes("mostaql") || text.includes("مستقل")) sources.push("mostaql");
  if (text.includes("khamsat") || text.includes("خمسات")) sources.push("khamsat");
  if (text.includes("weworkremotely") || text.includes("wwr") || text.includes("remote jobs")) sources.push("weworkremotely");
  if (text.includes("remoteok") || text.includes("remote ok")) sources.push("remoteok");

  // Default to all active sources if none specifically mentioned
  const finalSources = sources.length > 0 ? sources : ["mostaql", "khamsat", "weworkremotely"];

  // 3. Skills extraction
  const commonTech = [
    "react", "node", "python", "javascript", "typescript", "vue", "angular", "next.js",
    "wordpress", "flutter", "django", "laravel", "php", "figma", "ui/ux", "seo",
    "تصميم", "برمجة", "ترجمة", "كتابة", "تسويق", "مونتاج", "ووردبريس"
  ];
  const detectedSkills = commonTech.filter((tech) => text.includes(tech));
  const finalSkills = detectedSkills.length > 0 ? detectedSkills : defaultSkills;

  // 4. Remote filter
  const remoteOnly = !text.includes("onsite") && !text.includes("in-person") && !text.includes("حضوري");

  // 5. Language preference
  let language: "arabic" | "english" | "auto" = "auto";
  if (text.includes("arabic") || text.includes("عربي") || text.includes("بالعربي")) {
    language = "arabic";
  } else if (text.includes("english") || text.includes("انجليزي") || text.includes("بالانجليزي")) {
    language = "english";
  }

  // 6. Minimum budget
  let minBudget: number | undefined;
  const budgetMatch = instruction.match(/(?:budget|min|at least|above|\$|ميزانية)\s*(?:>=|>|:)?\s*\$?(\d+)/i);
  if (budgetMatch) {
    minBudget = parseFloat(budgetMatch[1]);
  }

  return {
    targetCount,
    sources: finalSources,
    skills: finalSkills,
    remoteOnly,
    minBudget,
    language,
    notes: `Agent configured to discover ${targetCount} opportunities across ${finalSources.join(", ")} matching ${finalSkills.join(", ") || "user profile"}.`,
  };
}
