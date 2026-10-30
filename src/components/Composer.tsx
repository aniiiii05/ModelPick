"use client";

import { ArrowUp, LoaderCircle } from "lucide-react";
import { useEffect, useRef } from "react";

export const PROMPT_LIMIT = 20_000;

/** The prompt box: grows with its text, Enter sends, Shift+Enter adds a line. */
export function Composer({
  value,
  onChange,
  onSubmit,
  busy,
  autoFocus,
  placeholder = "Paste the prompt you want to send to an AI",
}: {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  busy: boolean;
  autoFocus?: boolean;
  placeholder?: string;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);

  // Grow to fit, up to about ten lines, then scroll.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 240)}px`;
  }, [value]);

  useEffect(() => {
    if (autoFocus) ref.current?.focus({ preventScroll: true });
  }, [autoFocus]);

  const empty = value.trim().length === 0;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!busy && !empty) onSubmit();
      }}
      className="rounded-[26px] border border-line bg-bg shadow-card transition-[border-color,box-shadow] focus-within:border-line-strong has-[textarea:focus-visible]:ring-1 has-[textarea:focus-visible]:ring-accent"
    >
      <label htmlFor="prompt" className="sr-only">
        Your prompt
      </label>
      <textarea
        id="prompt"
        ref={ref}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
            e.preventDefault();
            if (!busy && !empty) onSubmit();
          }
        }}
        rows={1}
        maxLength={PROMPT_LIMIT}
        placeholder={placeholder}
        className="block max-h-60 min-h-[52px] w-full resize-none bg-transparent px-5 pt-4 pb-1 text-[15px] leading-6 text-fg outline-none placeholder:text-fg-3 focus-visible:outline-none"
      />
      <div className="flex items-center justify-between gap-3 px-3 pb-3 pl-5">
        <span className="text-[12px] text-fg-3">
          {value.length > PROMPT_LIMIT * 0.9 ? `${value.length.toLocaleString("en-US")} / ${PROMPT_LIMIT.toLocaleString("en-US")}` : "Shift + Enter for a new line"}
        </span>
        <button
          type="submit"
          disabled={busy || empty}
          aria-label={busy ? "Finding the right model" : "Get recommendation"}
          className="grid size-9 place-items-center rounded-full bg-primary text-on-primary transition-opacity hover:opacity-85 disabled:cursor-not-allowed disabled:opacity-30"
        >
          {busy ? <LoaderCircle size={18} className="animate-spin" aria-hidden /> : <ArrowUp size={18} strokeWidth={2.25} aria-hidden />}
        </button>
      </div>
    </form>
  );
}
