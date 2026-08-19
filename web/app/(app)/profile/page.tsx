"use client";

import { useCallback, useEffect, useState } from "react";
import Profile from "@/src/components/Profile";
import { ToastContainer, useToast } from "@/src/lib/toast";
import { DEMO_USER } from "@/src/lib/demo-data";

const LS_KEY = "gigflow_profile";

export default function ProfilePage() {
  const { toasts, showToast } = useToast();
  const [email, setEmail] = useState(DEMO_USER.email);
  const [name, setName] = useState(DEMO_USER.name);
  const [bio, setBio] = useState(DEMO_USER.bio);
  const [skills, setSkills] = useState(DEMO_USER.skills);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const stored = localStorage.getItem(LS_KEY);
    if (stored) {
      try {
        const p = JSON.parse(stored);
        if (p.email) setEmail(p.email);
        if (p.name) setName(p.name);
        if (p.bio) setBio(p.bio);
        if (p.skills) setSkills(p.skills);
        return;
      } catch {}
    }
    // Try live API profile by email
    fetch(`/api/user/${encodeURIComponent(DEMO_USER.email)}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => {
        if (!d) return;
        if (d.email) setEmail(d.email);
        if (d.name) setName(d.name);
        if (d.bio) setBio(d.bio);
        if (d.skills) setSkills(Array.isArray(d.skills) ? d.skills.join(",") : d.skills);
      })
      .catch(() => {});
  }, []);

  const onSave = useCallback(async () => {
    setLoading(true);
    setMessage("");
    // Always persist locally so the static demo retains edits.
    localStorage.setItem(LS_KEY, JSON.stringify({ email, name, bio, skills }));
    try {
      const res = await fetch("/api/user/skills", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, name, bio, skills }),
      });
      if (res.ok) {
        setMessage("Profile saved ✓");
        showToast("Profile saved ✓");
      } else {
        setMessage("Saved locally (demo mode)");
        showToast("Saved locally (demo mode)");
      }
    } catch {
      setMessage("Saved locally (demo mode)");
      showToast("Saved locally (demo mode)");
    } finally {
      setLoading(false);
    }
  }, [email, name, bio, skills, showToast]);

  return (
    <>
      <Profile
        email={email}
        setEmail={setEmail}
        name={name}
        setName={setName}
        bio={bio}
        setBio={setBio}
        skills={skills}
        setSkills={setSkills}
        onSave={onSave}
        loading={loading}
        message={message}
      />
      <ToastContainer toasts={toasts} />
    </>
  );
}
