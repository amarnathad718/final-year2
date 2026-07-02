"use client";

import { useEffect } from "react";

const NEXT_DEVTOOLS_SELECTORS = [
  "[data-nextjs-toast]",
  "button[data-nextjs-dev-tools-button='true']",
  "button[data-next-mark='true']",
  "button[aria-label='Open Next.js Dev Tools']",
  ".dev-tools-indicator",
  ".dev-tools-indicator-menu",
];

function hideDevToolsNodes() {
  for (const selector of NEXT_DEVTOOLS_SELECTORS) {
    document.querySelectorAll<HTMLElement>(selector).forEach((element) => {
      element.remove();
    });
  }
}

export function HideNextDevTools() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "development") {
      return;
    }

    hideDevToolsNodes();

    const observer = new MutationObserver(() => {
      hideDevToolsNodes();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    return () => observer.disconnect();
  }, []);

  return null;
}