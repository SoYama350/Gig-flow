import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import GigsFeed from "./GigsFeed";

const gigs = [
  {
    id: "g1",
    title: "React dashboard",
    description: "Build a responsive dashboard",
    budget: "1200",
    url: "https://example.com/gig",
    platform: "Mostaql",
    requiredSkills: "React,TypeScript,UI Design",
    scrapedAt: new Date().toISOString(),
    status: "NEW",
    proposal: null,
  },
];

describe("GigsFeed", () => {
  it("filters gigs by search query", () => {
    render(
      React.createElement(GigsFeed, {
        gigs,
        onScrape: () => {},
        scraping: false,
        onStatusChange: () => {},
        onGenerateProposal: () => {},
        onSaveProposal: () => {},
        generatingFor: null,
        userSkills: ["React", "TypeScript"],
      })
    );

    const input = screen.getByLabelText(/search gigs/i);
    fireEvent.change(input, { target: { value: "dashboard" } });
    expect(screen.getByText("React dashboard")).toBeInTheDocument();
  });

  it("shows empty state when no matches are found", () => {
    render(
      React.createElement(GigsFeed, {
        gigs,
        onScrape: () => {},
        scraping: false,
        onStatusChange: () => {},
        onGenerateProposal: () => {},
        onSaveProposal: () => {},
        generatingFor: null,
        userSkills: [],
      })
    );

    const input = screen.getByLabelText(/search gigs/i);
    fireEvent.change(input, { target: { value: "no such gig" } });
    expect(screen.getByText(/No gigs found/i)).toBeInTheDocument();
  });

  it("triggers proposal generation when pressing AI button", () => {
    const onGenerateProposal = vi.fn();

    render(
      React.createElement(GigsFeed, {
        gigs,
        onScrape: () => {},
        scraping: false,
        onStatusChange: () => {},
        onGenerateProposal,
        onSaveProposal: () => {},
        generatingFor: null,
        userSkills: ["React"],
      })
    );

    fireEvent.click(screen.getByRole("button", { name: /generate .* ai proposal .*react dashboard/i }));
    expect(onGenerateProposal).toHaveBeenCalledWith("g1", "arabic");
  });
});
