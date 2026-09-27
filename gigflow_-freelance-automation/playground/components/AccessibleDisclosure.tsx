import { useId, useState } from "react";
import type { ReactNode } from "react";

interface AccessibleDisclosureProps {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
}

export function AccessibleDisclosure({ title, children, defaultOpen = false }: AccessibleDisclosureProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const contentId = useId();

  return (
    <div className="playground-disclosure">
      <button
        className="playground-disclosure-trigger"
        type="button"
        aria-expanded={isOpen}
        aria-controls={contentId}
        onClick={() => setIsOpen((open) => !open)}
      >
        <span>{title}</span>
        <span aria-hidden="true" className="playground-disclosure-icon">{isOpen ? "−" : "+"}</span>
      </button>
      <div id={contentId} className="playground-disclosure-content" hidden={!isOpen}>
        {children}
      </div>
    </div>
  );
}
