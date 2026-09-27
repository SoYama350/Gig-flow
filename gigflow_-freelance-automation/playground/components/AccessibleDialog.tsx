import { useEffect, useId, useRef } from "react";
import type { ReactNode, RefObject } from "react";

interface AccessibleDialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description: string;
  children: ReactNode;
  triggerRef: RefObject<HTMLElement | null>;
}

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex=\"-1\"])",
].join(",");

export function AccessibleDialog({
  isOpen,
  onClose,
  title,
  description,
  children,
  triggerRef,
}: AccessibleDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    if (!isOpen) return;

    const focusableElements = dialogRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
    focusableElements?.[0]?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== "Tab" || !dialogRef.current) return;

      const focusable = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
      );
      if (focusable.length === 0) {
        event.preventDefault();
        dialogRef.current.focus();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
      triggerRef.current?.focus();
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="playground-dialog-backdrop" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <div
        ref={dialogRef}
        className="playground-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        tabIndex={-1}
      >
        <div className="playground-dialog-heading">
          <div>
            <p className="playground-eyebrow">Manual implementation</p>
            <h3 id={titleId}>{title}</h3>
          </div>
          <button className="playground-icon-button" type="button" onClick={onClose} aria-label="Close dialog">
            ×
          </button>
        </div>
        <p id={descriptionId} className="playground-dialog-description">{description}</p>
        {children}
      </div>
    </div>
  );
}
