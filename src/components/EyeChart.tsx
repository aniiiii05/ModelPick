import type { CSSProperties } from "react";

const ROWS = [
  { text: "WHICH", acuity: 0, label: "20/200", size: "clamp(2.6rem, 9vw, 6rem)" },
  { text: "MODEL", acuity: 0.012, label: "20/100", size: "clamp(1.9rem, 6.2vw, 4.1rem)" },
  { text: "SHOULD I USE", acuity: 0.035, label: "20/70", size: "clamp(1.2rem, 3.9vw, 2.6rem)" },
  { text: "FOR THIS PROMPT?", acuity: 0.07, label: "20/40", size: "clamp(0.9rem, 2.5vw, 1.65rem)" },
];

/**
 * A backlit duochrome test chart. Rows blur by acuity and sharpen as `focus` goes from 0 to 1.
 * The rows together are the page heading.
 */
export function EyeChart({ focus, decorative = false }: { focus: number; decorative?: boolean }) {
  // The decorative copy is the sharp view seen through the trial lens; it is not a second heading.
  const Letters = decorative ? "div" : "h1";
  return (
    <div className="relative isolate" aria-hidden={decorative || undefined}>
      {/* Light the chart throws onto the room; only visible with the lights dimmed. */}
      {!decorative && <div aria-hidden="true" className="chart-spill" />}
      <div
        className="chart-panel relative overflow-hidden rounded-[14px] border-[6px] border-steel shadow-[0_24px_48px_-24px_rgb(10_20_24/0.55),0_2px_6px_rgb(10_20_24/0.18)] sm:border-[10px]"
        style={{ "--focus": focus } as CSSProperties}
      >
        <Letters className="chart-letters relative flex flex-col items-center gap-[clamp(0.9rem,2.4vw,1.6rem)] px-3 py-[clamp(1.75rem,4.5vw,3.25rem)] text-[color:var(--chart-ink)] sm:px-4">
          {ROWS.map((row, i) => (
            <span key={row.label} className="relative block w-full text-center">
              <span
                aria-hidden="true"
                className="font-rx absolute left-0 top-1/2 -translate-y-1/2 text-[0.55rem] font-medium tracking-normal sm:text-[0.7rem]"
              >
                {row.label}
              </span>
              <span
                className="chart-row inline-block pl-[0.16em]"
                style={{ "--acuity": row.acuity, fontSize: row.size, transitionDelay: `${i * 70}ms` } as CSSProperties}
              >
                {row.text}
              </span>
            </span>
          ))}
        </Letters>
      </div>
    </div>
  );
}
