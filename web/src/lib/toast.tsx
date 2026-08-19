"use client";

import { AnimatePresence, motion } from "motion/react";
import { CheckCircle2, XCircle } from "lucide-react";
import { useToast } from "./useToast";

export { useToast } from "./useToast";

export function ToastContainer({ toasts }: { toasts: ReturnType<typeof useToast>["toasts"] }) {
  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 pointer-events-none">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, x: 40, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 40, scale: 0.9 }}
            className={`glass-card rounded-xl px-4 py-3 flex items-center gap-2 text-sm ${
              t.type === "success" ? "text-emerald-300" : "text-red-300"
            }`}
          >
            {t.type === "success" ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
            {t.message}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
