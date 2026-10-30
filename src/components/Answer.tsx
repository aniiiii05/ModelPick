"use client";

import { Check, Copy } from "lucide-react";
import { useState, type ReactNode } from "react";
import type { PickedModel } from "@/lib/types";
import type { Result } from "@/lib/visit";

const price = (usd: number) => (usd === 0 ? "Free" : `$${usd}/mo`);
const TASK_NAMES: Record<string, string> = {
  coding: "Coding",
  math: "Maths",
  reasoning: "Reasoning",
  writing: "Writing",
  research: "Research",
  vision: "Image understanding",
  chat: "General chat",
};

/** The recommendation as plain text, for the Copy button. */
export function answerText(r: Result): string {
  return [
    `Model: ${r.best.name} (${r.best.app})`,
    r.best.effort !== "n/a" ? `${r.best.effortLabel}: ${r.best.effort}` : "",
    r.plan.forThisTask ? `Plan: ${r.plan.forThisTask.name} (${price(r.plan.forThisTask.priceUSD)})` : "",
    r.plan.forRegularUse && r.plan.forRegularUse.name !== r.plan.forThisTask?.name
      ? `For daily use: ${r.plan.forRegularUse.name} (${price(r.plan.forRegularUse.priceUSD)})`
      : "",
    r.budget ? `Cheaper option: ${r.budget.name}${r.budget.effort !== "n/a" ? `, ${r.budget.effort}` : ""}` : "",
    `Alternative: ${r.runnerUp.name}`,
    "ModelPick",
  ]
    .filter(Boolean)
    .join("\n");
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid gap-1 py-3 sm:grid-cols-[140px_1fr] sm:gap-4">
      <dt className="text-[13px] text-fg-3">{label}</dt>
      <dd className="min-w-0 text-[14px]">{children}</dd>
    </div>
  );
}

/** The vendor's effort scale with the recommended step filled. */
function Effort({ m }: { m: PickedModel }) {
  if (m.effortLevels.length === 0) return <p className="text-[14px] text-fg-2">No effort setting in {m.app}</p>;
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
      <span className="text-[14px] text-fg-2">{m.effortLabel}</span>
      <ol className="flex gap-1" aria-label={`${m.effortLabel}: ${m.effort}`}>
        {m.effortLevels.map((level) => {
          const on = level === m.effort;
          return (
            <li
              key={level}
              aria-current={on ? "step" : undefined}
              className={`rounded-full px-2.5 py-0.5 text-[12px] font-medium ${
                on ? "bg-primary text-on-primary" : "bg-subtle text-fg-3"
              }`}
            >
              {level}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

export function Answer({ result }: { result: Result }) {
  const [copied, setCopied] = useState(false);
  const { best, budget, plan, runnerUp, features } = result;
  const needs = [features.needsLiveWeb && "live web", features.needsVision && "images", features.needsLongContext && "long input"].filter(Boolean);
  // The first part of the reason restates the task line.
  const why = result.reason.split(" · ").slice(1).join(" · ");
  // The plan note's first sentence restates the plan line; keep only what it adds (free option, caveats).
  const planExtra = plan.note
    .split(/(?<=\.)\s+/)
    .filter((s) => !/is enough for occasional use|is the cheapest plan that handles this well/.test(s))
    .join(" ");

  async function copy() {
    try {
      await navigator.clipboard.writeText(answerText(result));
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  }

  return (
    <article className="rise" aria-label="Recommendation">
      <h2 className="text-[28px] font-semibold leading-tight tracking-[-0.02em]">Use {best.name}</h2>
      <p className="mt-1 text-[14px] text-fg-2">
        in {best.app}
        {why && <span className="first-letter:uppercase"> · {why}</span>}
      </p>

      <div className="mt-4">
        <Effort m={best} />
      </div>

      <dl className="mt-5 divide-y divide-line border-y border-line">
        <Row label="Task">
          {TASK_NAMES[features.taskType] ?? features.taskType}, difficulty {features.complexity} of 5
          {needs.length > 0 && <span className="text-fg-2"> · needs {needs.join(", ")}</span>}
          {result.caveat && <p className="mt-1 text-[13px] text-fg-3">{result.caveat}</p>}
        </Row>
        <Row label="Plan">
          {plan.forThisTask ? (
            <>
              {plan.forThisTask.name} <span className="tabular text-fg-2">{price(plan.forThisTask.priceUSD)}</span>
              {plan.forRegularUse && plan.forRegularUse.name !== plan.forThisTask.name && (
                <span className="text-fg-2">
                  {" "}
                  · {plan.forRegularUse.name} <span className="tabular">{price(plan.forRegularUse.priceUSD)}</span> for daily use
                </span>
              )}
            </>
          ) : (
            <span>API only</span>
          )}
          {planExtra && <p className="mt-1 text-[13px] text-fg-3">{planExtra}</p>}
        </Row>
        {budget && (
          <Row label="Cheaper option">
            {budget.name} <span className="text-fg-2">in {budget.app}{budget.effort !== "n/a" && `, ${budget.effortLabel.toLowerCase()} ${budget.effort}`}</span>
          </Row>
        )}
        <Row label="Alternative">
          {runnerUp.name}
          {runnerUp.effort !== "n/a" && <span className="text-fg-2">, {runnerUp.effort}</span>}
        </Row>
      </dl>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-[12px] text-fg-3">
          Read by {result.reader ?? (result.source === "llm" ? "an AI model" : "the offline classifier")}
        </p>
        <button
          type="button"
          onClick={copy}
          className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-[13px] text-fg-2 transition-colors hover:bg-hover hover:text-fg"
        >
          {copied ? <Check size={15} aria-hidden /> : <Copy size={15} aria-hidden />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
    </article>
  );
}

/** Holds the answer's shape while the request runs. */
export function AnswerSkeleton() {
  return (
    <div aria-busy="true" aria-label="Finding the right model">
      <div className="skeleton h-8 w-64" />
      <div className="skeleton mt-2.5 h-4 w-72 max-w-full" />
      <div className="skeleton mt-5 h-6 w-64 max-w-full" />
      <div className="mt-5 space-y-3 border-y border-line py-4">
        {[0, 1, 2].map((i) => (
          <div key={i} className="grid gap-2 sm:grid-cols-[140px_1fr] sm:gap-4">
            <div className="skeleton h-4 w-20" />
            <div className="skeleton h-4 w-full max-w-md" />
          </div>
        ))}
      </div>
    </div>
  );
}
