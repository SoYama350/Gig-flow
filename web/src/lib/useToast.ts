"use client";

import { useCallback, useState } from "react";

export interface Toast {
  id: number;
  message: string;
  type: "success" | "error";
}

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback(
    (message: string, type: "success" | "error" = "success") => {
      const id = Date.now() + Math.random();
      setToasts((t) => [...t, { id, message, type }]);
      setTimeout(() => {
        setToasts((t) => t.filter((x) => x.id !== id));
      }, 3000);
    },
    []
  );

  return { toasts, showToast };
}
