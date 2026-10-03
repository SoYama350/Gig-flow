"use client";

import Settings from "@/src/components/Settings";
import { ToastContainer, useToast } from "@/src/lib/toast";

export default function SettingsPage() {
  const { toasts, showToast } = useToast();
  return (
    <>
      <Settings onShowToast={showToast} />
      <ToastContainer toasts={toasts} />
    </>
  );
}
