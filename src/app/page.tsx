"use client";

import { useEffect, useRef, useState } from "react";
import { MODELS } from "@/data/models";
import LLM_EVAL from "@/data/training/llm-eval.json";
import METRICS from "@/data/training/metrics.json";
import { ExamDiagram } from "@/components/ExamDiagram";
import { LensCase } from "@/components/LensCase";
import { LensChart } from "@/components/LensChart";
import { LightsSwitch } from "@/components/LightsSwitch";
import { PatientFile, type Visit } from "@/components/PatientFile";
import { Prescription, type ExamResult } from "@/components/Prescription";
import { LensIcon } from "@/components/icons";
import { VisitSchema } from "@/lib/visit";

const SAMPLES = [
  { label: "Receipt-tracking app", prompt: "Build an app where users upload receipts and it tracks their expenses" },
  { label: "Decline a meeting", prompt: "Write a quick, friendly reply declining a meeting invite" },
  { label: "This week's GPU prices", prompt: "What are the latest GPU prices and which card is best value this week?" },
  { label: "Prove √2 is irrational", prompt: "Prove that the square root of 2 is irrational, rigorously" },
];

const pct = (x: number) => `${Math.round(x * 100)}%`;
const MODEL_COUNT = MODELS.length;
const LAB_COUNT = new Set(MODELS.map((m) => m.vendor)).size;
const FILE_KEY = "mp-file";
const FILE_LIMIT = 8;
const PROMPT_LIMIT = 20_000;

function readFile(): Visit[] {
  try {
    const raw = JSON.parse(localStorage.getItem(FILE_KEY) ?? "[]");
    // Saved visits can be stale (older app versions) or edited by hand: keep only ones that still render.
    return Array.isArray(raw) ? raw.flatMap((v) => (VisitSchema.safeParse(v).success ? [v as Visit] : [])).slice(0, FILE_LIMIT) : [];
  } catch {
    return [];
  }
}

function writeFile(visits: Visit[]) {
  try {
    localStorage.setItem(FILE_KEY, JSON.stringify(visits));
  } catch {
    // Storage unavailable (private mode, blocked): the file just won't persist.
  }
}

const today = () => new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

export default function Home() {
  const [prompt, setPrompt] = useState("");
  const [current, setCurrent] = useState<Visit | null>(null);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const slipRef = useRef<HTMLDivElement>(null);

  // The file lives in localStorage, which only exists after hydration.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setVisits(readFile()), []);

  // Let the chart snap into focus first, then follow the slip as it prints.
  useEffect(() => {
    if (!current) return;
    const t = setTimeout(() => slipRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 650);
    return () => clearTimeout(t);
  }, [current]);

  const focus = current ? 1 : loading ? 0.92 : Math.min(0.8, prompt.trim().length / 90);

  async function examine(text: string) {
    if (loading) return;
    if (text.trim().length < 3) {
      setError("Give the chart a little more to read: at least a few words.");
      return;
    }
    if (text.length > PROMPT_LIMIT) {
      setError(`That prompt is too long. Keep it under ${PROMPT_LIMIT.toLocaleString("en-US")} characters.`);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/recommend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: text }),
        signal: AbortSignal.timeout(20_000),
      });
      // A proxy or platform error page is not JSON; don't let it surface as a parse error.
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "The exam didn't finish. Try again.");
      const visit: Visit = { no: (visits[0]?.no ?? 0) + 1, date: today(), prompt: text.trim(), result: data as ExamResult };
      const next = [visit, ...visits].slice(0, FILE_LIMIT);
      setVisits(next);
      writeFile(next);
      setCurrent(visit);
    } catch (e) {
      const timedOut = e instanceof DOMException && e.name === "TimeoutError";
      setError(
        timedOut
          ? "The exam took too long. Try again."
          : e instanceof Error && e.message !== "Failed to fetch"
            ? e.message
            : "Couldn't reach ModelPick. Check your connection and try again.",
      );
    } finally {
      setLoading(false);
    }
  }

  function newExam() {
    setCurrent(null);
    setPrompt("");
    window.scrollTo({ top: 0, behavior: "smooth" });
    inputRef.current?.focus({ preventScroll: true });
  }

  return (
    <div id="top">
      <header className="mx-auto flex max-w-[1200px] items-center justify-between gap-4 px-4 py-5 sm:px-6">
        <a href="#top" className="flex items-center gap-2.5 rounded-md text-ink no-underline">
          <LensIcon size={28} />
          <span className="display text-[1.35rem]">ModelPick</span>
        </a>
        <nav aria-label="Sections" className="flex items-center gap-1 sm:gap-2">
          <a href="#how" className="hidden rounded-md px-2.5 py-1.5 text-sm text-ink-2 no-underline hover:text-ink md:inline">
            How it works
          </a>
          <a href="#lenses" className="hidden rounded-md px-2.5 py-1.5 text-sm text-ink-2 no-underline hover:text-ink md:inline">
            Lens case
          </a>
          <a href="#file" className="whitespace-nowrap rounded-md px-2.5 py-1.5 text-sm text-ink-2 no-underline hover:text-ink">
            Your file{visits.length > 0 && <span className="font-rx tabular ml-1 text-ink-3">{visits.length}</span>}
          </a>
          <LightsSwitch />
        </nav>
      </header>

      <main>
        <section className="mx-auto max-w-[1200px] overflow-x-clip px-4 pt-6 sm:px-6" aria-label="Eye exam">
          <LensChart focus={focus} hunting={loading} />

          <div className="mx-auto mt-8 max-w-[780px]">
            <p className="mx-auto max-w-[60ch] text-center text-[1.12rem] text-ink-2">
              ModelPick is an eye exam for your prompts. Paste what you want an AI to do. It won&apos;t answer it; it
              prescribes the model, the effort setting and the subscription that fit, from {MODEL_COUNT} models across{" "}
              {LAB_COUNT} labs.
            </p>

            <form
              className="mt-6"
              onSubmit={(e) => {
                e.preventDefault();
                examine(prompt);
              }}
            >
              <label htmlFor="prompt" className="sr-only">
                Your prompt
              </label>
              <div className="rounded-2xl border-[1.5px] border-rule bg-field shadow-[0_10px_30px_-18px_rgb(10_20_24/0.35)] transition-colors focus-within:border-teal">
                <textarea
                  id="prompt"
                  ref={inputRef}
                  value={prompt}
                  onChange={(e) => {
                    setPrompt(e.target.value);
                    if (current) setCurrent(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) examine(prompt);
                  }}
                  rows={4}
                  maxLength={PROMPT_LIMIT}
                  placeholder="Describe the task, or paste the prompt you were about to send…"
                  className="block w-full resize-none rounded-t-2xl bg-transparent px-5 pt-4 text-[1.05rem] text-ink outline-none placeholder:text-ink-3 focus-visible:outline-none"
                />
                <div className="flex items-center justify-between gap-3 border-t border-rule px-3 py-3 sm:px-4">
                  <span className="hidden text-xs text-ink-3 sm:inline">Ctrl + Enter to submit</span>
                  <button
                    type="submit"
                    disabled={loading}
                    className="ml-auto inline-flex w-full items-center justify-center gap-2 rounded-xl bg-teal px-5 py-3 font-semibold text-on-teal shadow-[0_6px_14px_-6px_rgb(13_92_99/0.6)] transition-[background-color,transform,opacity] duration-200 hover:bg-teal-hover active:translate-y-px disabled:cursor-not-allowed disabled:opacity-45 sm:w-auto"
                  >
                    <LensIcon size={20} className={loading ? "hunting" : ""} />
                    {loading ? "Focusing…" : "Get my prescription"}
                  </button>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-2">
                <span className="text-sm text-ink-3">Try a sample:</span>
                {SAMPLES.map((s) => (
                  <button
                    key={s.label}
                    type="button"
                    title={s.prompt}
                    onClick={() => {
                      setPrompt(s.prompt);
                      examine(s.prompt);
                    }}
                    className="rounded-full border border-rule bg-field px-3 py-1 text-sm text-ink-2 transition-colors hover:border-teal hover:text-ink"
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </form>

            {error && (
              <p role="alert" className="mt-4 rounded-lg border border-[color:var(--duo-red)]/50 px-4 py-3 text-sm text-ink">
                {error}
              </p>
            )}
          </div>
        </section>

        <div ref={slipRef} className="mx-auto mt-12 max-w-[680px] scroll-mt-6 px-4 sm:px-6">
          {current && <Prescription key={current.no} result={current.result} no={current.no} date={current.date} onNew={newExam} />}
        </div>

        <section id="how" className="mx-auto mt-28 max-w-[1200px] px-4 sm:px-6">
          <h2 className="display max-w-[18ch] text-[clamp(2rem,4.5vw,3.25rem)]">How the exam works</h2>
          <p className="mt-3 max-w-[60ch] text-ink-2">
            One read, one fit, one prescription. ModelPick only classifies your prompt; it never answers it.
          </p>
          <div className="mt-10">
            <ExamDiagram />
          </div>
          <p className="mt-10 max-w-[75ch] text-sm text-ink-3">
            Two readers can take the exam, both measured on real user prompts from LMArena. With an Anthropic key, Claude
            Haiku 5.5 reads each prompt against the same rubric its training labels follow; in a 300-prompt check, a Haiku
            labeller matched the reference labels {pct(LLM_EVAL.haikuTaskAgreement)} of the time (
            {pct(LLM_EVAL.haikuTaskAgreementOnUnambiguous)} on prompts two reference labellers agreed on, against{" "}
            {pct(LLM_EVAL.secondLabellerTaskAgreement)} agreement between those labellers). Without a key, an offline
            classifier trained on {(METRICS.handPrompts + METRICS.externalPrompts).toLocaleString("en-US")} labelled prompts
            reads it: {pct(METRICS.taskAccuracyRealWorld)} on held-out real prompts and {pct(METRICS.taskAccuracy)} on
            ModelPick&apos;s own test prompts, with difficulty within one step {pct(METRICS.complexityWithin1)} of the time.
            Model strengths come from public leaderboards (Artificial Analysis, LMArena), checked October 2026.
          </p>
        </section>

        <section id="lenses" className="mx-auto mt-28 max-w-[1200px] px-4 sm:px-6">
          <h2 className="display max-w-[18ch] text-[clamp(2rem,4.5vw,3.25rem)]">The trial lens case</h2>
          <p className="mb-10 mt-3 max-w-[60ch] text-ink-2">
            {MODEL_COUNT} lenses from {LAB_COUNT} labs. Pick one to see what it&apos;s strong at and where you can get it.
          </p>
          <LensCase />
        </section>

        <section id="file" className="mx-auto mt-28 max-w-[1200px] px-4 sm:px-6">
          <h2 className="display max-w-[18ch] text-[clamp(2rem,4.5vw,3.25rem)]">Your file</h2>
          <p className="mb-8 mt-3 max-w-[60ch] text-ink-2">Your last {FILE_LIMIT} prescriptions, kept in this browser only.</p>
          <PatientFile
            visits={visits}
            onOpen={(v) => {
              setPrompt(v.prompt);
              setCurrent(v);
            }}
            onClear={() => {
              setVisits([]);
              setCurrent(null);
              writeFile([]);
            }}
          />
        </section>
      </main>

      <footer className="mt-28 border-t border-rule">
        <div className="mx-auto flex max-w-[1200px] flex-col gap-4 px-4 py-10 text-sm text-ink-3 sm:flex-row sm:items-start sm:justify-between sm:px-6">
          <p className="max-w-[62ch]">
            Model scores are estimates anchored to the Artificial Analysis Intelligence Index v5 (October 2026). Plan prices
            vary by region and change often; check the vendor&apos;s page before you buy.
          </p>
          <a href="#top" className="shrink-0 text-ink-2 underline hover:text-ink">
            Back to the chart
          </a>
        </div>
      </footer>
    </div>
  );
}
