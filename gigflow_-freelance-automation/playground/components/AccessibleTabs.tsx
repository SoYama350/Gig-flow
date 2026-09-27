import { useId, useRef, useState } from "react";
import type { ReactNode, KeyboardEvent } from "react";

export interface TabItem {
  id: string;
  label: string;
  content: ReactNode;
}

interface AccessibleTabsProps {
  items: TabItem[];
  defaultTabId?: string;
}

export function AccessibleTabs({ items, defaultTabId }: AccessibleTabsProps) {
  const generatedId = useId();
  const [activeTabId, setActiveTabId] = useState(defaultTabId ?? items[0]?.id ?? "");
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const activeIndex = Math.max(items.findIndex((item) => item.id === activeTabId), 0);
  const activeItem = items[activeIndex];

  if (!activeItem) return null;

  const moveTab = (index: number) => {
    const nextIndex = (index + items.length) % items.length;
    const nextItem = items[nextIndex];
    setActiveTabId(nextItem.id);
    tabRefs.current[nextIndex]?.focus();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === "ArrowRight") {
      event.preventDefault();
      moveTab(activeIndex + 1);
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      moveTab(activeIndex - 1);
    }
  };

  return (
    <section className="playground-tabs" aria-labelledby={`${generatedId}-label`}>
      <p id={`${generatedId}-label`} className="playground-eyebrow">Automatic activation</p>
      <div className="playground-tab-list" role="tablist" aria-label="Workspace views">
        {items.map((item, index) => {
          const tabId = `${generatedId}-tab-${item.id}`;
          const panelId = `${generatedId}-panel-${item.id}`;
          const isSelected = item.id === activeItem.id;
          return (
            <button
              key={item.id}
              ref={(element) => { tabRefs.current[index] = element; }}
              id={tabId}
              type="button"
              role="tab"
              aria-selected={isSelected}
              aria-controls={panelId}
              tabIndex={isSelected ? 0 : -1}
              className={`playground-tab${isSelected ? " is-selected" : ""}`}
              onClick={() => setActiveTabId(item.id)}
              onKeyDown={handleKeyDown}
            >
              {item.label}
            </button>
          );
        })}
      </div>
      <div
        id={`${generatedId}-panel-${activeItem.id}`}
        className="playground-tab-panel"
        role="tabpanel"
        aria-labelledby={`${generatedId}-tab-${activeItem.id}`}
        tabIndex={0}
      >
        {activeItem.content}
      </div>
    </section>
  );
}
