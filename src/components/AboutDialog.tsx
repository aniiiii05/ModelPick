"use client";

import { X } from "lucide-react";
import { useEffect, useRef } from "react";
import LLM_EVAL from "@/data/training/llm-eval.json";
import METRICS from "@/data/training/metrics.json";

const pct = (x: number) => `${Math.round(x * 100)}%`;

/** The method and its measured accuracy, in a few lines. */
export function AboutDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
      aria-labelledby="about-title"
      className="m-auto w-[min(520px,calc(100vw-32px))] rounded-2xl border border-line bg-bg p-0 text-fg shadow-card"
    >
      <div className="p-6">
        <div className="flex items-start justify-between gap-4">
          <h2 id="about-title" className="text-[18px] font-semibold">
            How it works
          </h2>
          <button type="button" onClick={onClose} aria-label="Close" className="-mt-1 -mr-2 grid size-8 place-items-center rounded-lg text-fg-2 hover:bg-hover hover:text-fg">
            <X size={18} aria-hidden />
          </button>
        </div>
        <ol className="mt-4 list-decimal space-y-2 pl-5 text-[14px] text-fg-2 marker:text-fg-3">
          <li>Your prompt is read for its task, difficulty and needs (live web, images, long input). It is never answered.</li>
          <li>Each model is scored for that task from public benchmarks (Artificial Analysis, LMArena) and its price.</li>
          <li>You get the best fit, its effort setting, the plan that covers it, and a cheaper option.</li>
        </ol>
        <p className="mt-4 text-[14px] text-fg-2">
          Measured on real user prompts: an AI reader (Claude Haiku) picked the right task type {pct(LLM_EVAL.haikuTaskAgreement)} of the
          time; the offline classifier used without an API key, {pct(METRICS.taskAccuracyRealWorld)}.
        </p>
        <p className="mt-3 text-[13px] text-fg-3">Scores and prices were checked in October 2026 and are estimates.</p>
        <a
          href="https://github.com/aniiiii05/ModelPick"
          target="_blank"
          rel="noreferrer"
          className="mt-4 inline-block text-[14px] font-medium text-accent underline decoration-accent/40 hover:decoration-accent"
        >
          Source and method on GitHub
        </a>
      </div>
    </dialog>
  );
}
