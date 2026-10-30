"use client";

import type { ExamResult } from "./Prescription";
import { ArrowIcon } from "./icons";

export type Visit = { no: number; date: string; prompt: string; result: ExamResult };

/** Past prescriptions, kept in this browser only. */
export function PatientFile({ visits, onOpen, onClear }: { visits: Visit[]; onOpen: (v: Visit) => void; onClear: () => void }) {
  if (visits.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-rule px-6 py-10 text-center">
        <p className="display text-[1.2rem]">No visits yet</p>
        <p className="mx-auto mt-2 max-w-[44ch] text-ink-2">
          Every prescription you get is filed here, on this device, so you can come back to it before your next task.
        </p>
      </div>
    );
  }

  return (
    <div>
      <ul className="divide-y divide-rule border-y border-rule">
        {visits.map((v) => (
          <li key={v.no}>
            <button
              type="button"
              onClick={() => onOpen(v)}
              className="group grid w-full grid-cols-[3.5rem_1fr_auto] items-center gap-4 py-3.5 text-left transition-colors hover:bg-ground-2 sm:grid-cols-[4.5rem_1fr_14rem_auto] sm:px-2"
            >
              <span className="font-rx tabular text-[0.78rem] text-ink-3">No. {String(v.no).padStart(4, "0")}</span>
              <span className="truncate text-ink">{v.prompt}</span>
              <span className="hidden truncate text-sm text-ink-2 sm:block">
                {v.result.best.name}
                {v.result.best.effort !== "n/a" && ` · ${v.result.best.effort}`}
              </span>
              <ArrowIcon size={18} className="text-ink-3 transition-transform duration-300 group-hover:translate-x-1 group-hover:text-ink" />
            </button>
          </li>
        ))}
      </ul>
      <button type="button" onClick={onClear} className="mt-4 text-sm text-ink-3 underline underline-offset-4 hover:text-ink">
        Clear my file
      </button>
    </div>
  );
}
