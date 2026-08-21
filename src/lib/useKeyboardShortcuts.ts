import { useEffect } from "react";

interface ShortcutHandlers {
  onFocusSearch: () => void;
  onSelectAll: () => void;
  onDeleteSelection: () => void;
  onEscape: () => void;
}

function isTypingTarget(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false;
  const tag = el.tagName.toLowerCase();
  return tag === "input" || tag === "textarea" || el.isContentEditable;
}

export function useKeyboardShortcuts(handlers: ShortcutHandlers) {
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        handlers.onEscape();
        return;
      }

      const typing = isTypingTarget(e.target);

      if (e.key === "/" && !typing) {
        e.preventDefault();
        handlers.onFocusSearch();
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "a" && !typing) {
        e.preventDefault();
        handlers.onSelectAll();
        return;
      }

      if ((e.key === "Delete" || e.key === "Backspace") && !typing) {
        e.preventDefault();
        handlers.onDeleteSelection();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handlers]);
}
