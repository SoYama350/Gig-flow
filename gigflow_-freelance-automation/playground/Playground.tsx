import { useRef, useState } from "react";
import { AccessibleDialog } from "./components/AccessibleDialog";
import { AccessibleDisclosure } from "./components/AccessibleDisclosure";
import { AccessibleTabs } from "./components/AccessibleTabs";
import "./playground.css";

export default function Playground() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const dialogTriggerRef = useRef<HTMLButtonElement>(null);

  return (
    <main className="playground-shell">
      <header className="playground-header">
        <div>
          <p className="playground-kicker">FE-05 / Foundations</p>
          <h1>Accessible component fundamentals</h1>
          <p className="playground-lede">Three keyboard-first patterns, built from native React and browser APIs.</p>
        </div>
        <a className="playground-back-link" href="/">Back to GigFlow</a>
      </header>

      <div className="playground-grid">
        <section className="playground-card playground-card-wide" aria-labelledby="dialog-demo-title">
          <div className="playground-card-heading">
            <div>
              <p className="playground-eyebrow">01 / Dialog</p>
              <h2 id="dialog-demo-title">A contained conversation</h2>
            </div>
            <span className="playground-status">Focus trap</span>
          </div>
          <p>Open the dialog, then use Tab and Shift + Tab to cycle through every control without leaving the modal.</p>
          <button ref={dialogTriggerRef} className="playground-primary-button" type="button" onClick={() => setIsDialogOpen(true)}>
            Open project brief
          </button>
          <AccessibleDialog
            isOpen={isDialogOpen}
            onClose={() => setIsDialogOpen(false)}
            title="Project brief"
            description="Review the brief and choose how you want to continue. Escape closes this dialog and restores focus to the trigger."
            triggerRef={dialogTriggerRef}
          >
            <label className="playground-field">
              Project name
              <input type="text" defaultValue="Accessible launch" />
            </label>
            <div className="playground-dialog-actions">
              <button className="playground-secondary-button" type="button" onClick={() => setIsDialogOpen(false)}>Save draft</button>
              <button className="playground-primary-button" type="button" onClick={() => setIsDialogOpen(false)}>Continue</button>
            </div>
          </AccessibleDialog>
        </section>

        <section className="playground-card" aria-labelledby="tabs-demo-title">
          <div className="playground-card-heading">
            <div>
              <p className="playground-eyebrow">02 / Tabs</p>
              <h2 id="tabs-demo-title">Instant workspace views</h2>
            </div>
            <span className="playground-status">Arrow keys</span>
          </div>
          <AccessibleTabs items={[
            { id: "overview", label: "Overview", content: <><h3>Overview</h3><p>Three proposals are ready for review. The active tab follows focus immediately because all panel content is local.</p></> },
            { id: "analytics", label: "Analytics", content: <><h3>Analytics</h3><p>Response rate is up 18% this week, with the strongest results coming from product design briefs.</p></> },
            { id: "settings", label: "Settings", content: <><h3>Settings</h3><p>Notifications are enabled and the workspace is set to automatic proposal drafts.</p></> },
          ]} />
        </section>

        <section className="playground-card" aria-labelledby="disclosure-demo-title">
          <div className="playground-card-heading">
            <div>
              <p className="playground-eyebrow">03 / Disclosure</p>
              <h2 id="disclosure-demo-title">Answers on demand</h2>
            </div>
            <span className="playground-status">Native button</span>
          </div>
          <AccessibleDisclosure title="Why use a real button?">
            <p>A native button already supports Enter, Space, focus, and predictable browser semantics. The ARIA state tells assistive technology whether the controlled content is available.</p>
          </AccessibleDisclosure>
          <AccessibleDisclosure title="What should keyboard users hear?" defaultOpen>
            <p>The trigger exposes its expanded state, and the controlled content appears directly after it in the document order.</p>
          </AccessibleDisclosure>
        </section>
      </div>
    </main>
  );
}
