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
      const res = await fetch("/api/scrape", { method: "POST" });
      if (res.ok) {
        const d = await res.json();
        setStats(d?.stats ?? stats);
        setLastScraped(new Date().toISOString());
        showToast(`Scrape done — ${d?.count ?? 0} gigs added`);
      } else {
        showToast("Scraper unavailable (demo mode)", "error");
      }
    } catch {
      showToast("Scraper unavailable (demo mode)", "error");
    } finally {
      setScraping(false);
    }
  }, [showToast, stats]);

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
