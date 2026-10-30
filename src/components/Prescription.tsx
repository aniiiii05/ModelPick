"use client";

import { useRef, useState, type CSSProperties, type PointerEvent, type ReactNode } from "react";
import type { Features, PickedModel, Recommendation } from "@/lib/types";
import { CheckIcon, CopyIcon } from "./icons";

export type ExamResult = Recommendation & { features: Features; source: "llm" | "classifier"; caveat?: string | null };

const price = (usd: number) => (usd === 0 ? "Free" : `$${usd}/mo`);

function Field({ i, label, children }: { i: number; label: string; children: ReactNode }) {
  return (
    <div className="slip-field grid grid-cols-1 gap-y-1 py-3 sm:grid-cols-[8rem_1fr] sm:gap-x-4" style={{ "--i": i } as CSSProperties}>
      <dt className="font-rx pt-0.5 text-[0.72rem] font-medium uppercase tracking-[0.08em] text-paper-muted">{label}</dt>
      <dd className="min-w-0">{children}</dd>
    </div>
  );
}

/** The prescription sign: an R with its leg crossed, drawn at the display name's cap height and weight. */
function RxMark() {
  return (
    <svg viewBox="0 0 22 26" className="h-[0.72em] w-auto shrink-0 self-center" fill="none" stroke="var(--paper-ink)" strokeWidth="3.2" strokeLinecap="square" aria-hidden="true">
      <path d="M4 25V2.5h7a5.25 5.25 0 0 1 0 10.5H4" />
      <path d="M9 13l11 12M13 25l7-7.5" />
    </svg>
  );
}

/** A biconvex lens in cross-section; `bulge` is how thick it is at the centre. */
function LensProfile({ bulge, filled }: { bulge: number; filled: boolean }) {
  const d = `M12 2 C ${12 + bulge} 14, ${12 + bulge} 30, 12 42 C ${12 - bulge} 30, ${12 - bulge} 14, 12 2 Z`;
  return (
    <svg viewBox="0 0 24 44" width="24" height="44" aria-hidden="true">
      <path
        d={d}
        fill={filled ? "var(--paper-ink)" : "var(--paper-rule)"}
        stroke="var(--paper-ink)"
        strokeOpacity={filled ? 1 : 0.6}
        strokeWidth="2"
      />
    </svg>
  );
}

/** The effort setting drawn as lenses of increasing strength, the prescribed one marked. */
function Strength({ m }: { m: PickedModel }) {
  if (m.effortLevels.length === 0) {
    return <p className="text-[0.95rem] text-paper-muted">No effort setting in {m.app}; use it as is.</p>;
  }
  const at = m.effortLevels.indexOf(m.effort);
  const steps = m.effortLevels.length;
  return (
    <div>
      <p className="text-[0.95rem]">
        {m.effortLabel}: <strong className="font-semibold">{m.effort}</strong>
      </p>
      <ol className="mt-2 flex items-end gap-3" aria-label={`${m.effortLabel} scale`}>
        {m.effortLevels.map((level, i) => (
          <li key={level} className="flex flex-col items-center gap-1">
            <LensProfile bulge={4 + (steps === 1 ? 0 : (i / (steps - 1)) * 6)} filled={i === at} />
            <span className={`font-rx text-[0.65rem] ${i === at ? "font-semibold text-paper-ink" : "text-paper-muted"}`}>{level}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

export function prescriptionText(r: ExamResult, no: number): string {
  const lines = [
    `ModelPick prescription No. ${no}`,
    `Rx: ${r.best.name} (${r.best.app})`,
    r.best.effort !== "n/a" ? `${r.best.effortLabel}: ${r.best.effort}` : "",
    r.plan.forThisTask ? `Plan for this task: ${r.plan.forThisTask.name} (${price(r.plan.forThisTask.priceUSD)})` : "",
    r.plan.forRegularUse ? `Plan for regular use: ${r.plan.forRegularUse.name} (${price(r.plan.forRegularUse.priceUSD)})` : "",
    r.budget ? `Spare pair: ${r.budget.name}${r.budget.effort !== "n/a" ? `, ${r.budget.effort}` : ""}` : "",
    `Why: ${r.reason}`,
  ];
  return lines.filter(Boolean).join("\n");
}

export function Prescription({ result, no, date, onNew }: { result: ExamResult; no: number; date: string; onNew: () => void }) {
  const [copied, setCopied] = useState(false);
  const sheet = useRef<HTMLDivElement>(null);
  const { best, budget, plan, runnerUp, features } = result;

  async function copy() {
    try {
      await navigator.clipboard.writeText(prescriptionText(result, no));
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  // The slip tips toward the pointer like a sheet held up to the light.
  function tilt(e: PointerEvent<HTMLDivElement>) {
    const el = sheet.current;
    if (!el || e.pointerType !== "mouse" || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const r = el.getBoundingClientRect();
    const dx = (e.clientX - r.left) / r.width - 0.5;
    const dy = (e.clientY - r.top) / r.height - 0.5;
    el.style.transform = `perspective(1400px) rotateX(${(-dy * 5).toFixed(2)}deg) rotateY(${(dx * 7).toFixed(2)}deg)`;
  }

  return (
    <div
      ref={sheet}
      onPointerMove={tilt}
      onPointerLeave={() => sheet.current && (sheet.current.style.transform = "")}
      className="drop-shadow-[0_22px_28px_rgb(8_18_22/0.28)] transition-transform duration-500 [transition-timing-function:var(--ease-out)]"
    >
      <article className="slip bg-paper px-5 pb-6 pt-8 text-paper-ink sm:px-8" aria-live="polite" aria-label="Your prescription">
        <header className="slip-field flex flex-wrap items-baseline justify-between gap-2 border-b-2 border-paper-ink pb-3" style={{ "--i": 0 } as CSSProperties}>
          <p className="display text-[1.35rem]">Prescription</p>
          <p className="font-rx tabular text-[0.75rem] text-paper-muted">
            No. {String(no).padStart(4, "0")} · {date}
          </p>
        </header>

        <dl className="divide-y divide-paper-rule">
          <Field i={1} label="Task">
            <p className="text-[0.95rem]">
              {features.summary} · difficulty {features.complexity}/5
              {features.needsLiveWeb && " · needs live web"}
              {features.needsVision && " · has images"}
            </p>
            {result.caveat && <p className="mt-1 text-[0.85rem] text-paper-muted">{result.caveat}</p>}
          </Field>

          <Field i={2} label="Rx">
            <p className="display flex items-baseline gap-2.5 text-[clamp(1.6rem,5vw,2.25rem)]">
              <RxMark />
              {best.name}
            </p>
            <p className="text-[0.95rem] text-paper-muted">Open it in {best.app}</p>
          </Field>

          <Field i={3} label="Strength">
            <Strength m={best} />
          </Field>

          <Field i={4} label="Frames">
            {plan.forThisTask ? (
              <ul className="space-y-1 text-[0.95rem]">
                <li>
                  This task: <strong className="font-semibold">{plan.forThisTask.name}</strong>{" "}
                  <span className="font-rx tabular text-[0.85rem]">{price(plan.forThisTask.priceUSD)}</span>
                </li>
                {plan.forRegularUse && plan.forRegularUse.name !== plan.forThisTask.name && (
                  <li>
                    Daily use: <strong className="font-semibold">{plan.forRegularUse.name}</strong>{" "}
                    <span className="font-rx tabular text-[0.85rem]">{price(plan.forRegularUse.priceUSD)}</span>
                  </li>
                )}
              </ul>
            ) : null}
            <p className="mt-1.5 max-w-[60ch] text-[0.9rem] text-paper-muted">{plan.note}</p>
          </Field>

          {budget && (
            <Field i={5} label="Spare pair">
              <p className="text-[0.95rem]">
                <strong className="font-semibold">{budget.name}</strong> in {budget.app}
                {budget.effort !== "n/a" && `, ${budget.effortLabel.toLowerCase()} ${budget.effort}`}
              </p>
              <p className="text-[0.85rem] text-paper-muted">Cheaper, still strong at this task.</p>
            </Field>
          )}

          <Field i={6} label="Notes">
            {/* The first part of the reason restates the task line above. */}
            <p className="text-[0.95rem] first-letter:uppercase">{result.reason.split(" · ").slice(1).join(" · ") || "Best overall fit for this task."}</p>
            <p className="text-[0.85rem] text-paper-muted">
              Second opinion: {runnerUp.name}
              {runnerUp.effort !== "n/a" && ` (${runnerUp.effort})`}
            </p>
          </Field>
        </dl>

        <footer className="slip-field mt-4 flex flex-wrap items-center justify-between gap-3 border-t-2 border-dashed border-paper-rule pt-4" style={{ "--i": 7 } as CSSProperties}>
          <div className="min-w-[12rem]">
            <p className="display border-b border-paper-ink/60 pb-0.5 text-[0.95rem]">ModelPick</p>
            <p className="mt-1 text-[0.75rem] text-paper-muted">
              Prescriber · {result.source === "llm" ? "read by Claude Haiku 5.5" : "read by the offline classifier"} · scores are estimates
            </p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={copy}
              className="inline-flex items-center gap-1.5 rounded-lg border border-paper-ink/25 px-3 py-1.5 text-sm font-medium transition-colors hover:border-paper-ink hover:bg-paper-ink hover:text-paper"
            >
              {copied ? <CheckIcon size={16} /> : <CopyIcon size={16} />}
              {copied ? "Copied" : "Copy"}
            </button>
            <button
              type="button"
              onClick={onNew}
              className="rounded-lg px-3 py-1.5 text-sm font-medium underline decoration-paper-ink/30 underline-offset-4 hover:decoration-paper-ink"
            >
              New exam
            </button>
          </div>
        </footer>
      </article>
    </div>
  );
}
