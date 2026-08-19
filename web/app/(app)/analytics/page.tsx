"use client";

import { useEffect, useState } from "react";
import Analytics from "@/src/components/Analytics";
import { DEMO_GIGS, DEMO_SKILLS, type Gig } from "@/src/lib/demo-data";

export default function AnalyticsPage() {
  const [gigs, setGigs] = useState<Gig[]>(DEMO_GIGS);
  const [userSkills] = useState<string[]>(DEMO_SKILLS);

  useEffect(() => {
    fetch("/api/gigs")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => {
        if (Array.isArray(d) && d.length) setGigs(d);
      })
      .catch(() => {});
  }, []);

  return <Analytics gigs={gigs} userSkills={userSkills} />;
}
