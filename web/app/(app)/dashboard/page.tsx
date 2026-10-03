"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Dashboard from "@/src/components/Dashboard";
import { ToastContainer, useToast } from "@/src/lib/toast";
import { DEMO_STATS } from "@/src/lib/demo-data";

export default function DashboardPage() {
  const router = useRouter();
  const { toasts, showToast } = useToast();
  const [stats, setStats] = useState(DEMO_STATS);
  const [scraping, setScraping] = useState(false);
  const [lastScraped, setLastScraped] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/stats")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => {
        if (d && typeof d.totalGigs === "number") setStats(d);
        if (d?.lastScraped) setLastScraped(d.lastScraped);
      })
      .catch(() => {});
  }, []);

  const onNavigate = useCallback(
    (tab: string) => router.push(`/${tab}`),
    [router]
  );

  const onScrape = useCallback(async () => {
    setScraping(true);
    showToast("Scraping Mostaql…");
    try {
      const res = await fetch("/api/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platform: "mostaql" }),
      });
      if (res.ok) {
        const d = await res.json();
        const freshStats = await fetch("/api/stats")
          .then((r) => (r.ok ? r.json() : null))
          .catch(() => null);
        if (freshStats && typeof freshStats.totalGigs === "number") {
          setStats(freshStats);
        } else if (d?.stats) {
          setStats(d.stats);
        }
        setLastScraped(new Date().toISOString());
        showToast(`Scrape done — ${d?.processed ?? d?.count ?? 0} gigs added`);
      } else {
        const err = await res.json().catch(() => null);
        showToast(err?.error || err?.message || "Scraping failed", "error");
      }
    } catch (e: any) {
      showToast(e?.message || "Scraping failed", "error");
    } finally {
      setScraping(false);
    }
  }, [showToast]);

  return (
    <>
      <Dashboard
        stats={stats}
        onNavigate={onNavigate}
        onScrape={onScrape}
        scraping={scraping}
        lastScraped={lastScraped}
      />
      <ToastContainer toasts={toasts} />
    </>
  );
}
