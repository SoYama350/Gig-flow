import { describe, expect, it } from "vitest";
import { generateProposal, normalizeProposalText } from "./ai";

describe("normalizeProposalText", () => {
  it("strips wrapper text and trims whitespace", () => {
    const result = normalizeProposalText("Here is a draft: Hello world from a freelancer and product designer for this SaaS project.", "english");
    expect(result).toBe("Hello world from a freelancer and product designer for this SaaS project.");
  });

  it("rejects empty output", () => {
    expect(() => normalizeProposalText("   ", "english")).toThrow("empty response");
  });

  it("rejects short output that is not a real proposal", () => {
    expect(() => normalizeProposalText("Too short", "english")).toThrow("too short");
  });
});

describe("generateProposal", () => {
  it("throws a clear error when the API key is missing", async () => {
    await expect(
      generateProposal({
        gig: {
          title: "Landing page design",
          description: "Need a polished landing page for a SaaS product.",
          budget: "1200",
          requiredSkills: "React,UI Design",
          platform: "Mostaql",
        },
        userSkills: ["React", "UI Design"],
        userName: "Ahmed",
        userBio: "Frontend developer",
        apiKey: "",
      })
    ).rejects.toThrow("not configured");
  });

  it("rejects malformed AI responses", async () => {
    const invalid = { text: "" } as { text: string };

    expect(() => normalizeProposalText(invalid.text, "english")).toThrow();
  });
});
