"use client";

import { ArrowDown, ChevronRight } from "lucide-react";
import { Fragment, useMemo, useState } from "react";
import { MODELS } from "@/data/models";
import { PLANS } from "@/data/plans";
import { TASK_TYPES, type ModelEntry } from "@/lib/types";

type SortKey = "score" | "price" | "context";

const LABS = Array.from(new Set(MODELS.map((m) => m.vendor)));
const TASK_NAMES: Record<string, string> = {
  coding: "Coding",
  math: "Maths",
  reasoning: "Reasoning",
  writing: "Writing",
  research: "Research",
  vision: "Images",
  chat: "Chat",
};

const blended = (m: ModelEntry) => (m.apiPrice ? (3 * m.apiPrice[0] + m.apiPrice[1]) / 4 : Infinity);
const context = (k: number) => (k >= 1000 ? `${(k / 1000).toFixed(k % 1000 ? 2 : 0)}M` : `${k}K`);
const usd = (n: number) => `$${n < 1 ? n.toFixed(2).replace(/0$/, "") : n}`;

function cheapestPlan(m: ModelEntry) {
  const p = PLANS.filter((x) => x.models[m.id]).sort((a, b) => a.priceUSD - b.priceUSD)[0];
  return p ? `${p.name}${p.priceUSD ? ` · $${p.priceUSD}` : ""}` : "API only";
}

function bestAt(m: ModelEntry) {
  const top = Math.max(...TASK_TYPES.map((t) => m.strengths[t]));
  return TASK_TYPES.filter((t) => m.strengths[t] === top)
    .slice(0, 2)
    .map((t) => TASK_NAMES[t])
    .join(", ");
}

function SortHeader({ k, sort, onSort, children }: { k: SortKey; sort: SortKey; onSort: (k: SortKey) => void; children: string }) {
  return (
    <th scope="col" aria-sort={sort === k ? (k === "price" ? "ascending" : "descending") : "none"} className="px-3 py-2 text-right font-medium">
      <button type="button" onClick={() => onSort(k)} className={`inline-flex items-center gap-1 hover:text-fg ${sort === k ? "text-fg" : ""}`}>
        {children}
        <ArrowDown size={13} aria-hidden className={`${sort === k ? "opacity-100" : "opacity-0"} ${k === "price" ? "rotate-180" : ""}`} />
      </button>
    </th>
  );
}

export function ModelsView() {
  const [lab, setLab] = useState("all");
  const [sort, setSort] = useState<SortKey>("score");
  const [open, setOpen] = useState<string | null>(null);

  const rows = useMemo(() => {
    const list = MODELS.filter((m) => lab === "all" || m.vendor === lab);
    const by: Record<SortKey, (a: ModelEntry, b: ModelEntry) => number> = {
      score: (a, b) => (b.intelligence ?? -1) - (a.intelligence ?? -1),
      price: (a, b) => blended(a) - blended(b),
      context: (a, b) => b.contextK - a.contextK,
    };
    return [...list].sort(by[sort]);
  }, [lab, sort]);

  return (
    <div className="mx-auto w-full max-w-[960px] px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[22px] font-semibold tracking-[-0.01em]">Models</h1>
          <p className="mt-1 text-[14px] text-fg-2">
            {MODELS.length} models from {LABS.length} labs. Score is the Artificial Analysis Intelligence Index (v5, October 2026).
          </p>
        </div>
        <label className="flex items-center gap-2 text-[13px] text-fg-2">
          Lab
          <select
            value={lab}
            onChange={(e) => setLab(e.target.value)}
            className="h-9 rounded-lg border border-line bg-bg px-2.5 text-[14px] text-fg hover:border-line-strong"
          >
            <option value="all">All labs</option>
            {LABS.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="mt-5 overflow-x-auto rounded-xl border border-line">
        <table className="w-full min-w-[720px] border-collapse text-[14px]">
          <thead className="bg-subtle text-[12px] text-fg-3">
            <tr>
              <th scope="col" className="px-3 py-2 text-left font-medium">
                Model
              </th>
              <SortHeader k="score" sort={sort} onSort={setSort}>
                Score
              </SortHeader>
              <SortHeader k="price" sort={sort} onSort={setSort}>
                Price / 1M tokens
              </SortHeader>
              <SortHeader k="context" sort={sort} onSort={setSort}>
                Context
              </SortHeader>
              <th scope="col" className="px-3 py-2 text-left font-medium">
                Best at
              </th>
              <th scope="col" className="px-3 py-2 text-left font-medium">
                Cheapest plan
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((m) => {
              const expanded = open === m.id;
              return (
                <Fragment key={m.id}>
                  <tr className="border-t border-line hover:bg-subtle">
                    <td className="px-3 py-2.5">
                      <button
                        type="button"
                        onClick={() => setOpen(expanded ? null : m.id)}
                        aria-expanded={expanded}
                        className="flex items-center gap-2 text-left"
                      >
                        <ChevronRight size={15} aria-hidden className={`shrink-0 text-fg-3 transition-transform duration-150 ${expanded ? "rotate-90" : ""}`} />
                        <span>
                          <span className="font-medium">{m.name}</span>
                          <span className="block text-[12px] text-fg-3">{m.vendor}</span>
                        </span>
                      </button>
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono tabular text-[13px]">{m.intelligence ?? <span className="text-fg-3">n/a</span>}</td>
                    <td className="px-3 py-2.5 text-right font-mono tabular text-[13px] text-fg-2">
                      {m.apiPrice ? `${usd(m.apiPrice[0])} / ${usd(m.apiPrice[1])}` : "n/a"}
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono tabular text-[13px] text-fg-2">{context(m.contextK)}</td>
                    <td className="px-3 py-2.5 text-fg-2">{bestAt(m)}</td>
                    <td className="px-3 py-2.5 text-fg-2">{cheapestPlan(m)}</td>
                  </tr>
                  {expanded && (
                    <tr className="border-t border-line bg-subtle/60">
                      <td colSpan={6} className="px-3 py-4 pl-10">
                        <div className="grid gap-6 sm:grid-cols-[minmax(0,320px)_1fr]">
                          <ul className="space-y-1.5" aria-label={`${m.name} strength by task`}>
                            {TASK_TYPES.map((t) => (
                              <li key={t} className="grid grid-cols-[80px_1fr_20px] items-center gap-3 text-[13px]">
                                <span className="text-fg-2">{TASK_NAMES[t]}</span>
                                <span className="h-1.5 overflow-hidden rounded-full bg-hover">
                                  <span className="block h-full rounded-full bg-accent" style={{ width: `${m.strengths[t] * 10}%` }} />
                                </span>
                                <span className="text-right font-mono tabular text-fg-2">{m.strengths[t]}</span>
                              </li>
                            ))}
                          </ul>
                          <div className="text-[13px] text-fg-2">
                            <p>
                              Use it in {m.app}.{" "}
                              {m.effortLevels.length ? `${m.effortLabel}: ${m.effortLevels.join(", ")}.` : "No effort setting."}
                              {m.openWeights && " Open weights."}
                            </p>
                            <p className="mt-2">
                              Plans:{" "}
                              {PLANS.filter((p) => p.models[m.id])
                                .map((p) => `${p.name}${p.models[m.id] === "limited" ? " (limited)" : ""}`)
                                .join(", ") || "none; API only"}
                            </p>
                            {m.verify && <p className="mt-2 text-fg-3">Unverified: {m.verify}.</p>}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-[12px] text-fg-3">
        Task strengths blend LMArena leaderboards with the Intelligence Index. Prices change often; check the vendor before you buy.
      </p>
    </div>
  );
}
