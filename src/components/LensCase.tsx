"use client";

import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import { MODELS } from "@/data/models";
import { PLANS } from "@/data/plans";
import { TASK_TYPES } from "@/lib/types";

const LensStage = dynamic(() => import("./three/LensStage"), { ssr: false });

const VENDORS = ["All", ...Array.from(new Set(MODELS.map((m) => m.vendor)))];

/** The model catalog as an optician's trial lens case. Power = Intelligence Index. */
export function LensCase() {
  const [vendor, setVendor] = useState("All");
  const [selectedId, setSelectedId] = useState(MODELS[0].id);
  const [turns, setTurns] = useState(0);
  const lenses = useMemo(() => (vendor === "All" ? MODELS : MODELS.filter((m) => m.vendor === vendor)), [vendor]);
  const selected = MODELS.find((m) => m.id === selectedId) ?? MODELS[0];
  const plans = PLANS.filter((p) => p.models[selected.id]);

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] lg:gap-12">
      <div>
        <div className="mb-6 flex flex-wrap gap-1.5" role="group" aria-label="Filter by lab">
          {VENDORS.map((v) => (
            <button
              key={v}
              type="button"
              aria-pressed={vendor === v}
              onClick={() => setVendor(v)}
              className="rounded-full border border-rule px-3 py-1 text-sm text-ink-2 transition-colors hover:border-ink-3 hover:text-ink aria-pressed:border-ink aria-pressed:bg-ink aria-pressed:text-ground"
            >
              {v}
            </button>
          ))}
        </div>

        <ul className="grid grid-cols-3 gap-x-3 gap-y-6 sm:grid-cols-4 xl:grid-cols-5">
          {lenses.map((m) => {
            const active = m.id === selected.id;
            return (
              <li key={m.id}>
                <button
                  type="button"
                  onClick={() => {
                    if (m.id !== selectedId) setTurns((n) => n + 1);
                    setSelectedId(m.id);
                  }}
                  aria-pressed={active}
                  className="group flex w-full flex-col items-center gap-2 text-center"
                >
                  <span className="relative flex aspect-square w-full max-w-[96px] items-center justify-center">
                    {/* Rim, glass and centration cross of a trial lens. */}
                    <span
                      className={`absolute inset-0 rounded-full border-[6px] transition-colors duration-500 ${
                        active ? "border-teal" : "border-steel"
                      }`}
                    />
                    <span className="absolute inset-[6px] rounded-full bg-field/70 shadow-[inset_0_2px_6px_rgb(0_0_0/0.12)]" />
                    {/* Centration cross turns like a lens being set in a trial frame. */}
                    <span className="absolute inset-[6px] transition-transform duration-700 [transition-timing-function:var(--ease-out)] group-hover:rotate-45 group-aria-pressed:rotate-45">
                      <span className="absolute left-1/2 top-[16%] h-[68%] w-px -translate-x-1/2 bg-ink/20" />
                      <span className="absolute left-[16%] top-1/2 h-px w-[68%] -translate-y-1/2 bg-ink/20" />
                    </span>
                    {m.intelligence !== null ? (
                      <span className="display tabular relative text-[1.35rem] text-ink">{m.intelligence}</span>
                    ) : (
                      <span className="font-rx relative rounded bg-field px-1 text-[0.62rem] text-ink-3">not rated</span>
                    )}
                  </span>
                  <span className={`text-[0.82rem] leading-tight ${active ? "font-semibold text-ink" : "text-ink-2"}`}>{m.name}</span>
                </button>
              </li>
            );
          })}
        </ul>
        <p className="mt-6 text-sm text-ink-3">
          Lens power is the Artificial Analysis Intelligence Index (v5, Oct 2026) where published.
        </p>
      </div>

      <section aria-live="polite" aria-label={`${selected.name} details`} className="lg:sticky lg:top-6 lg:self-start">
        <div className="rounded-2xl border border-rule bg-field p-6">
          <figure className="-mx-2 -mt-2 mb-5">
            <div className="relative aspect-[16/10] overflow-hidden rounded-[10px] border-[5px] border-steel bg-[linear-gradient(90deg,var(--duo-red)_50%,var(--duo-green)_50%)] shadow-[0_14px_28px_-18px_rgb(10_20_24/0.6)]">
              <LensStage power={selected.intelligence} turn={turns} />
            </div>
            <figcaption className="mt-2 text-[0.8rem] text-ink-3">
              Glass thickness follows the lens power. Drag to turn it.
            </figcaption>
          </figure>
          <h3 className="display text-[1.75rem]">{selected.name}</h3>
          <p className="text-ink-2">
            {selected.app} · {selected.vendor}
          </p>

          <dl className="font-rx tabular mt-5 grid grid-cols-2 gap-x-4 gap-y-3 text-[0.82rem]">
            <div>
              <dt className="text-ink-3">API price / 1M</dt>
              <dd className="text-ink">{selected.apiPrice ? `$${selected.apiPrice[0]} in · $${selected.apiPrice[1]} out` : "not published"}</dd>
            </div>
            <div>
              <dt className="text-ink-3">Context</dt>
              <dd className="text-ink">{selected.contextK >= 1000 ? `${selected.contextK / 1000}M` : `${selected.contextK}K`} tokens</dd>
            </div>
            <div>
              <dt className="text-ink-3">Effort steps</dt>
              <dd className="text-ink">{selected.effortLevels.length ? selected.effortLevels.join(" · ") : "none"}</dd>
            </div>
            <div>
              <dt className="text-ink-3">Weights</dt>
              <dd className="text-ink">{selected.openWeights ? "open" : "closed"}</dd>
            </div>
          </dl>

          <h4 className="mt-6 text-sm font-semibold">Strength by task</h4>
          <ul className="mt-2 space-y-1.5">
            {TASK_TYPES.map((t) => (
              <li key={t} className="grid grid-cols-[5.5rem_1fr_1.5rem] items-center gap-3 text-sm">
                <span className="capitalize text-ink-2">{t}</span>
                <span className="h-2 overflow-hidden rounded-full bg-ground-2">
                  <span
                    className="block h-full rounded-full bg-teal transition-[width] duration-700 [transition-timing-function:var(--ease-out)]"
                    style={{ width: `${selected.strengths[t] * 10}%` }}
                  />
                </span>
                <span className="font-rx tabular text-right text-ink-2">{selected.strengths[t]}</span>
              </li>
            ))}
          </ul>

          <h4 className="mt-6 text-sm font-semibold">Where to get it</h4>
          {plans.length ? (
            <ul className="mt-2 space-y-1 text-sm text-ink-2">
              {plans.map((p) => (
                <li key={p.name} className="flex justify-between gap-3">
                  <span>
                    {p.name}
                    {p.models[selected.id] === "limited" && <span className="text-ink-3"> (limited)</span>}
                  </span>
                  <span className="font-rx tabular">{p.priceUSD === 0 ? "Free" : `$${p.priceUSD}/mo`}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-ink-2">No consumer plan; available through APIs such as OpenRouter.</p>
          )}
          {selected.verify && <p className="mt-4 text-[0.8rem] text-ink-3">Unverified: {selected.verify}.</p>}
        </div>
      </section>
    </div>
  );
}
