import { useEffect, useId, useRef } from 'react';
import type { ReactNode, RefObject } from 'react';

interface AccessibleDialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description: string;
  triggerRef: RefObject<HTMLElement | null>;
  children: ReactNode;
}

const FOCUSABLE_SELECTOR = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export default function AccessibleDialog({ isOpen, onClose, title, description, triggerRef, children }: AccessibleDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    if (!isOpen) return;
    dialogRef.current?.querySelector<HTMLElement>(FOCUSABLE_SELECTOR)?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); onClose(); return; }
      if (event.key !== 'Tab' || !dialogRef.current) return;
      const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
      if (focusable.length === 0) { event.preventDefault(); dialogRef.current.focus(); return; }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', handleKeyDown); document.body.style.overflow = ''; triggerRef.current?.focus(); };
  }, [isOpen, onClose, triggerRef]);

  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/75 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div ref={dialogRef} className="w-full max-w-2xl rounded-2xl border border-white/10 bg-dark-900 p-5 shadow-2xl md:p-7" role="dialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={descriptionId} tabIndex={-1}>
        <div className="flex items-start justify-between gap-4">
          <div><p className="text-xs font-semibold uppercase tracking-widest text-accent-400">Proposal review</p><h2 id={titleId} className="mt-1 text-xl font-bold text-white">{title}</h2></div>
          <button type="button" onClick={onClose} aria-label="Close proposal review" className="rounded-lg p-2 text-slate-400 hover:bg-white/5 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent-400">×</button>
        </div>
        <p id={descriptionId} className="mt-3 text-sm leading-relaxed text-slate-400">{description}</p>
        <div className="mt-5">{children}</div>
      </div>
    </div>
  );
}
