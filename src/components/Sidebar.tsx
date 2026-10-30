"use client";

import { Info, LayoutList, SquarePen, X } from "lucide-react";
import type { ReactNode } from "react";
import type { Visit } from "@/lib/visit";
import { ThemeToggle } from "./ThemeToggle";

export type View = "chat" | "models";

function Item({ icon, children, active, onClick }: { icon: ReactNode; children: ReactNode; active?: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={`flex h-9 w-full items-center gap-2.5 rounded-lg px-2.5 text-left text-[14px] transition-colors hover:bg-hover ${
        active ? "bg-hover font-medium text-fg" : "text-fg"
      }`}
    >
      {icon}
      {children}
    </button>
  );
}

export function Sidebar({
  view,
  visits,
  currentNo,
  onNew,
  onModels,
  onOpen,
  onClear,
  onAbout,
  onClose,
}: {
  view: View;
  visits: Visit[];
  currentNo: number | null;
  onNew: () => void;
  onModels: () => void;
  onOpen: (v: Visit) => void;
  onClear: () => void;
  onAbout: () => void;
  /** Present on the mobile sheet, where the sidebar can be dismissed. */
  onClose?: () => void;
}) {
  return (
    <nav aria-label="ModelPick" className="flex h-full w-[260px] flex-col bg-sidebar px-2.5 py-3">
      <div className="flex h-9 items-center justify-between px-2.5">
        <span className="text-[16px] font-semibold tracking-[-0.01em]">ModelPick</span>
        {onClose && (
          <button type="button" onClick={onClose} aria-label="Close menu" className="grid size-8 place-items-center rounded-lg text-fg-2 hover:bg-hover hover:text-fg">
            <X size={18} aria-hidden />
          </button>
        )}
      </div>

      <div className="mt-3 space-y-0.5">
        <Item icon={<SquarePen size={17} aria-hidden />} onClick={onNew} active={view === "chat" && currentNo === null}>
          New recommendation
        </Item>
        <Item icon={<LayoutList size={17} aria-hidden />} onClick={onModels} active={view === "models"}>
          Models
        </Item>
      </div>

      <div className="mt-6 flex min-h-0 flex-1 flex-col">
        <div className="flex items-center justify-between px-2.5 pb-1">
          <h2 className="text-[12px] font-medium text-fg-3">Recent</h2>
          {visits.length > 0 && (
            <button type="button" onClick={onClear} className="rounded text-[12px] text-fg-3 hover:text-fg">
              Clear
            </button>
          )}
        </div>
        {visits.length === 0 ? (
          <p className="px-2.5 py-1 text-[13px] leading-snug text-fg-3">Your recommendations appear here, saved in this browser only.</p>
        ) : (
          <ul className="-mr-1 min-h-0 flex-1 space-y-0.5 overflow-y-auto pr-1">
            {visits.map((v) => (
              <li key={v.no}>
                <button
                  type="button"
                  onClick={() => onOpen(v)}
                  aria-current={view === "chat" && v.no === currentNo ? "page" : undefined}
                  className={`block w-full truncate rounded-lg px-2.5 py-2 text-left text-[14px] transition-colors hover:bg-hover ${
                    view === "chat" && v.no === currentNo ? "bg-hover text-fg" : "text-fg-2"
                  }`}
                  title={v.prompt}
                >
                  {v.prompt}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="mt-2 space-y-0.5 border-t border-line pt-2">
        <Item icon={<Info size={17} aria-hidden />} onClick={onAbout}>
          How it works
        </Item>
        <ThemeToggle withLabel />
      </div>
    </nav>
  );
}
