"use client";

import { Menu, SquarePen } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { AboutDialog } from "@/components/AboutDialog";
import { Answer, AnswerSkeleton } from "@/components/Answer";
import { Composer, PROMPT_LIMIT } from "@/components/Composer";
import { ModelsView } from "@/components/ModelsView";
import { Sidebar, type View } from "@/components/Sidebar";
import { MODELS } from "@/data/models";
import { readHistory, writeHistory, type Result, type Visit } from "@/lib/visit";

const SAMPLES = [
  { label: "Build an expense app", prompt: "Build an app where users upload receipts and it tracks their expenses" },
  { label: "Decline a meeting", prompt: "Write a quick, friendly reply declining a meeting invite" },
  { label: "This week's GPU prices", prompt: "What are the latest GPU prices and which card is best value this week?" },
  { label: "Prove √2 is irrational", prompt: "Prove that the square root of 2 is irrational, rigorously" },
];

const LAB_COUNT = new Set(MODELS.map((m) => m.vendor)).size;
const today = () => new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

export default function Home() {
  const [view, setView] = useState<View>("chat");
  const [prompt, setPrompt] = useState("");
  const [current, setCurrent] = useState<Visit | null>(null);
  const [pending, setPending] = useState<string | null>(null);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [error, setError] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);

  // History lives in localStorage, which only exists after hydration.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setVisits(readHistory()), []);

  // Keep the newest answer in view, as a chat does.
  useEffect(() => {
    scroller.current?.scrollTo({ top: 0 });
  }, [current, pending]);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMenuOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  const loading = pending !== null;

  async function ask(text: string) {
    const clean = text.trim();
    if (loading || clean.length === 0) return;
    if (clean.length < 3) return setError("Add a few more words so the task is clear.");
    if (clean.length > PROMPT_LIMIT) return setError(`Keep the prompt under ${PROMPT_LIMIT.toLocaleString("en-US")} characters.`);
    setView("chat");
    setError("");
    setPending(clean);
    setPrompt("");
    try {
      const res = await fetch("/api/recommend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: clean }),
        signal: AbortSignal.timeout(20_000),
      });
      // A proxy or platform error page is not JSON; don't surface it as a parse error.
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Something went wrong. Try again.");
      const visit: Visit = { no: Math.max(0, ...visits.map((v) => v.no)) + 1, date: today(), prompt: clean, result: data as Result };
      const next = [visit, ...visits];
      setVisits(next);
      writeHistory(next);
      setCurrent(visit);
    } catch (e) {
      const timedOut = e instanceof DOMException && e.name === "TimeoutError";
      setError(
        timedOut
          ? "That took too long. Try again."
          : e instanceof Error && e.message !== "Failed to fetch"
            ? e.message
            : "Can't reach ModelPick. Check your connection and try again.",
      );
      setPrompt(clean);
    } finally {
      setPending(null);
    }
  }

  function startNew() {
    setView("chat");
    setCurrent(null);
    setError("");
    setMenuOpen(false);
  }

  const sidebar = (onClose?: () => void) => (
    <Sidebar
      view={view}
      visits={visits}
      currentNo={current?.no ?? null}
      onNew={startNew}
      onModels={() => {
        setView("models");
        setMenuOpen(false);
      }}
      onOpen={(v) => {
        setView("chat");
        setCurrent(v);
        setError("");
        setMenuOpen(false);
      }}
      onClear={() => {
        setVisits([]);
        setCurrent(null);
        writeHistory([]);
      }}
      onAbout={() => {
        setAboutOpen(true);
        setMenuOpen(false);
      }}
      onClose={onClose}
    />
  );

  const shown = pending ?? current?.prompt ?? null;
  const errorNote = error && (
    <p role="alert" className="mt-3 rounded-xl bg-danger-soft px-4 py-2.5 text-[14px] text-danger">
      {error}
    </p>
  );

  return (
    <div className="flex h-dvh overflow-hidden">
      <aside className="hidden shrink-0 border-r border-line md:block">{sidebar()}</aside>

      {/* Mobile: the sidebar slides over the page. */}
      {menuOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <button type="button" aria-label="Close menu" onClick={() => setMenuOpen(false)} className="absolute inset-0 bg-black/40" />
          <div className="slide-in absolute inset-y-0 left-0 shadow-card">{sidebar(() => setMenuOpen(false))}</div>
        </div>
      )}

      <main className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center justify-between px-3 md:hidden">
          <button type="button" onClick={() => setMenuOpen(true)} aria-label="Open menu" className="grid size-9 place-items-center rounded-lg text-fg-2 hover:bg-hover hover:text-fg">
            <Menu size={20} aria-hidden />
          </button>
          <span className="text-[16px] font-semibold tracking-[-0.01em]">ModelPick</span>
          <button type="button" onClick={startNew} aria-label="New recommendation" className="grid size-9 place-items-center rounded-lg text-fg-2 hover:bg-hover hover:text-fg">
            <SquarePen size={19} aria-hidden />
          </button>
        </header>

        {view === "models" ? (
          <div className="min-h-0 flex-1 overflow-y-auto">
            <ModelsView />
          </div>
        ) : shown === null ? (
          /* Empty state: one question, one box. */
          <div className="flex min-h-0 flex-1 flex-col items-center justify-center overflow-y-auto px-4 pb-[8vh]">
            <div className="w-full max-w-[720px]">
              <h1 className="text-balance text-center text-[28px] font-semibold leading-tight tracking-[-0.02em] sm:text-[32px]">
                Which AI model should you use?
              </h1>
              <p className="mx-auto mt-2 max-w-[52ch] text-center text-[15px] text-fg-2">
                Paste a prompt and get the model, effort setting and plan that fit it, across {MODELS.length} models from {LAB_COUNT} labs.
                ModelPick never answers the prompt.
              </p>
              <div className="mt-7">
                <Composer value={prompt} onChange={setPrompt} onSubmit={() => ask(prompt)} busy={loading} autoFocus />
                {errorNote}
              </div>
              <ul className="mt-4 flex flex-wrap justify-center gap-2" aria-label="Example prompts">
                {SAMPLES.map((s) => (
                  <li key={s.label}>
                    <button
                      type="button"
                      onClick={() => ask(s.prompt)}
                      title={s.prompt}
                      className="rounded-full border border-line px-3.5 py-1.5 text-[13px] text-fg-2 transition-colors hover:bg-subtle hover:text-fg"
                    >
                      {s.label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ) : (
          /* The exchange: the prompt as a sent message, the answer below it, the composer docked. */
          <>
            <div ref={scroller} className="min-h-0 flex-1 overflow-y-auto">
              <div className="mx-auto w-full max-w-[720px] px-4 pt-8 pb-10 sm:px-6">
                <div className="flex justify-end">
                  <p className="max-w-[85%] whitespace-pre-wrap break-words rounded-3xl bg-subtle px-4 py-2.5 text-[15px]">
                    {shown.length > 600 ? `${shown.slice(0, 600)}…` : shown}
                  </p>
                </div>
                <div className="mt-8">{loading ? <AnswerSkeleton /> : current && <Answer key={current.no} result={current.result} />}</div>
              </div>
            </div>
            <div className="shrink-0 px-4 pb-4 sm:px-6">
              <div className="mx-auto w-full max-w-[720px]">
                {errorNote}
                <div className="mt-2">
                  <Composer value={prompt} onChange={setPrompt} onSubmit={() => ask(prompt)} busy={loading} placeholder="Paste another prompt" />
                </div>
                <p className="mt-2 text-center text-[12px] text-fg-3">Scores and prices are estimates from October 2026. Check vendor pages before buying.</p>
              </div>
            </div>
          </>
        )}
      </main>

      <AboutDialog open={aboutOpen} onClose={() => setAboutOpen(false)} />
    </div>
  );
}
