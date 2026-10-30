"use client";

import { useSyncExternalStore } from "react";
import { BulbIcon } from "./icons";

function isDark() {
  const set = document.documentElement.dataset.theme;
  if (set) return set === "dark";
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function subscribe(cb: () => void) {
  const mq = window.matchMedia("(prefers-color-scheme: dark)");
  const obs = new MutationObserver(cb);
  obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  mq.addEventListener("change", cb);
  return () => {
    obs.disconnect();
    mq.removeEventListener("change", cb);
  };
}

/** "Dim the lights": the exam room's dark mode. */
export function LightsSwitch() {
  const dark = useSyncExternalStore(subscribe, isDark, () => false);

  function toggle() {
    const next = dark ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem("mp-theme", next);
    } catch {
      // Preference just won't persist.
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={dark}
      aria-label={dark ? "Turn the lights on" : "Dim the lights"}
      className="inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-full border border-rule px-2.5 py-1.5 text-sm text-ink-2 transition-colors hover:border-ink-3 hover:text-ink sm:px-3"
    >
      <BulbIcon on={!dark} size={18} />
      <span className="hidden sm:inline">{dark ? "Lights on" : "Dim lights"}</span>
    </button>
  );
}
