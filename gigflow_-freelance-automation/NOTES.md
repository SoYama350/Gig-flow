# Accessible Component Fundamentals Notes

## 1. What I Built

The `playground/` route contains three manual React + TypeScript components: a modal dialog with focus containment and restoration, an automatic-activation horizontal tabs widget, and a native-button disclosure.

## 2. Manual Modal vs shadcn Dialog

### What my implementation handles
- Uses `role="dialog"`, `aria-modal`, visible `aria-labelledby`, and `aria-describedby`.
- Moves focus into the dialog, wraps Tab and Shift+Tab, closes on Escape, and restores focus to the opening element.
- Uses a visible close button and locks body scrolling while open.

### What shadcn handles that mine does not
 The generated shadcn Dialog delegates modal behavior to `@base-ui/react/dialog` primitives and renders through `DialogPortal`, `DialogOverlay`, and `DialogPrimitive.Popup`; my dialog remains in its render position and implements the keydown trap directly.
 Base UI's modal layer manages outside interaction, focus trapping, scroll locking, and inert background behavior. My implementation relies on the backdrop, `aria-modal`, the keyboard trap, and body scroll lock, but does not apply an `inert` attribute to the rest of the document.
- The generated composition supports controlled and uncontrolled open state through `DialogTrigger` and `Dialog`, while this demo exposes a simple controlled `isOpen`/`onClose` pair.

 Base UI's `Tabs` primitives. My component only implements horizontal, enabled tabs.

The manual component owns focus discovery and restoration with DOM queries and an effect. shadcn composes specialized React Aria primitives, so focus scope, overlay dismissal, portal placement, and state wiring are separated into reusable layers rather than being handled inside one component.
 The generated `Tabs` wrapper passes `orientation` through to Base UI, and the generated trigger styles expose disabled-tab states. My implementation intentionally does not listen for Up/Down because it is horizontal only and has no disabled-tab model.
## 3. Manual Tabs vs shadcn Tabs

 My tabs are a compact single component with a direct `useState` and button refs. shadcn separates collection state and keyboard semantics from rendering through Base UI, which makes features such as orientation and disabled-item navigation available without duplicating widget logic.
- Uses `tablist`, `tab`, and `tabpanel` roles with `aria-selected`, `aria-controls`, and `aria-labelledby` relationships.
- Keeps only the selected tab in the normal tab sequence and wraps Left/Right Arrow navigation.
- Uses automatic activation because the local panels have no loading latency, matching the APG recommendation.

### What shadcn handles that mine does not
- The generated Tabs component delegates keyboard navigation, selection state, orientation, disabled tabs, and focus management to React Aria's `Tabs` primitives. My component only implements horizontal, enabled tabs.
- shadcn supports controlled and uncontrolled selection and exposes composition pieces (`TabsList`, `TabsTrigger`, and `TabsContent`) that can be assembled independently. My API takes an array of items and always owns selection state.
- shadcn's generated source supports vertical orientation and its corresponding Up/Down Arrow behavior. My implementation intentionally does not listen for Up/Down because it is horizontal only.

### Important implementation difference

My tabs are a compact single component with a direct `useState` and button refs. shadcn separates collection state and keyboard semantics from rendering through React Aria, which makes features such as orientation and disabled-item navigation available without duplicating widget logic.

## 4. Disclosure

The trigger is a native button, so Enter and Space keep their browser keyboard behavior without manual key handlers. `aria-expanded` communicates the current state, and `aria-controls` points to the conditionally rendered content container. The stable `useId` value prevents duplicate relationships across instances.

## 5. Lessons Learned

- ARIA relationships are a contract: every tab and panel needs a matching, stable relationship in both directions.
- A modal's visual overlay is not enough; keyboard focus must be contained and returned to the invoking control.
- Native controls provide substantial keyboard behavior for free, while custom composite widgets require deliberate roving-tabindex and arrow-key behavior.
- Manual accessibility code is easy to make incomplete around portals, inert backgrounds, disabled items, orientation, and state composition.
- Reading generated source matters because the useful comparison is the actual primitive architecture and edge-case behavior, not a claim that a library is simply "more accessible."
