"use client";

import { Moon, Sun } from "lucide-react";
import { useSyncExternalStore } from "react";

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

/** Follows the system theme until the visitor picks one. */
export function ThemeToggle({ withLabel = false }: { withLabel?: boolean }) {
  const dark = useSyncExternalStore(subscribe, isDark, () => false);

  function toggle() {
    const next = dark ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem("mp-theme", next);
    } catch {
      // The choice just won't persist.
    }
  }

  const label = dark ? "Light theme" : "Dark theme";
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={withLabel ? undefined : label}
      className={`inline-flex h-9 items-center gap-2.5 rounded-lg text-[14px] text-fg transition-colors hover:bg-hover ${
        withLabel ? "w-full px-2.5" : "w-9 justify-center"
      }`}
    >
      {dark ? <Sun size={17} aria-hidden /> : <Moon size={17} aria-hidden />}
      {withLabel && label}
    </button>
  );
}
