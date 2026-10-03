"use client";

import { useCallback, useEffect, useState } from "react";
import GigsFeed from "@/src/components/GigsFeed";
import { ToastContainer, useToast } from "@/src/lib/toast";
import { DEMO_GIGS, DEMO_SKILLS, type Gig } from "@/src/lib/demo-data";

export default function GigsPage() {
  const { toasts, showToast } = useToast();
  const [gigs, setGigs] = useState<Gig[]>(DEMO_GIGS);
  const [scraping, setScraping] = useState(false);
  const [generatingFor, setGeneratingFor] = useState<string | null>(null);
  const [userSkills] = useState<string[]>(DEMO_SKILLS);

  useEffect(() => {
    fetch("/api/gigs")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => {
        if (Array.isArray(d) && d.length) setGigs(d);
      })
      .catch(() => {});
  }, []);

  const onScrape = useCallback(async () => {
    setScraping(true);
    showToast("Scraping Mostaql…");
    try {
      const res = await fetch("/api/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platform: "mostaql", skills: userSkills }),
      });
      if (res.ok) {
        const d = await res.json();
        showToast(`Scrape done — ${d?.processed ?? d?.count ?? 0} gigs added`);
        const fresh = await fetch("/api/gigs");
        if (fresh.ok) setGigs(await fresh.json());
      } else {
        const err = await res.json().catch(() => null);
        showToast(err?.error || err?.message || "Scraping failed", "error");
      }
    } catch (e: any) {
      showToast(e?.message || "Scraping failed", "error");
    } finally {
      setScraping(false);
    }
  }, [showToast, userSkills]);

  const onStatusChange = useCallback(async (id: string, status: string) => {
    setGigs((prev) => prev.map((g) => (g.id === id ? { ...g, status } : g)));
    try {
      await fetch(`/api/gigs/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
    } catch {}
  }, []);

  const onGenerateProposal = useCallback(
    async (gigId: string, language: "arabic" | "english") => {
      setGeneratingFor(gigId);
      showToast(`Generating ${language} proposal…`);
      try {
        const res = await fetch("/api/generate-proposal", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ gigId, language, userSkills }),
        });
        if (res.ok) {
          const d = await res.json();
          setGigs((prev) =>
            prev.map((g) => (g.id === gigId ? { ...g, proposal: d.proposal } : g))
          );
          showToast("Proposal generated ✓");
        } else {
          const err = await res.json().catch(() => null);
          showToast(err?.error || err?.message || "Proposal generation failed", "error");
        }
      } catch (e: any) {
        showToast(e?.message || "Proposal generation failed", "error");
      } finally {
        setGeneratingFor(null);
      }
    },
    [showToast, userSkills]
  );

  const onSaveProposal = useCallback(
    async (gigId: string, proposal: string) => {
      setGigs((prev) =>
        prev.map((g) => (g.id === gigId ? { ...g, proposal } : g))
      );
      try {
        await fetch(`/api/gigs/${gigId}/proposal`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ proposal }),
        });
      } catch {}
      showToast("Proposal saved ✓");
    },
    [showToast]
  );

  return (
    <>
      <GigsFeed
        gigs={gigs}
        onScrape={onScrape}
        scraping={scraping}
        onStatusChange={onStatusChange}
        onGenerateProposal={onGenerateProposal}
        onSaveProposal={onSaveProposal}
        generatingFor={generatingFor}
        userSkills={userSkills}
      />
      <ToastContainer toasts={toasts} />
    </>
  );
}
