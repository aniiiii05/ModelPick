import { loadFont as loadArchivo } from "@remotion/google-fonts/Archivo";
import { loadFont as loadHanken } from "@remotion/google-fonts/HankenGrotesk";
import { loadFont as loadMono } from "@remotion/google-fonts/RedHatMono";
import type { CSSProperties, ReactNode } from "react";
import { AbsoluteFill, Easing, Interactive, interpolate, random, useCurrentFrame } from "remotion";

const { fontFamily: archivo } = loadArchivo("normal", { weights: ["700", "800"], subsets: ["latin"] });
const { fontFamily: hanken } = loadHanken("normal", { weights: ["400", "600"], subsets: ["latin"] });
const { fontFamily: mono } = loadMono("normal", { weights: ["500"], subsets: ["latin"] });

// The ModelPick palette (DESIGN.md).
const C = {
  room: "#0d1214",
  roomLight: "#17211f",
  steel: "#262d31",
  red: "#e04848",
  green: "#3e9b63",
  chartInk: "#0b0b0b",
  paper: "#ffffff",
  paperInk: "#121618",
  paperMuted: "#4e5a5f",
  rule: "#d5dcde",
  teal: "#0d5c63",
};

/** Stop-motion: the scene is posed only every third frame (8 poses a second at 24 fps). */
const STEP = 3;
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const ease = Easing.bezier(0.16, 1, 0.3, 1);

/** A paper cut-out: each pose nudges it slightly, as a hand-placed piece would sit. */
function Cutout({ seed, pose, style, children }: { seed: string; pose: number; style: CSSProperties; children: ReactNode }) {
  const j = (k: string, amp: number) => (random(`${seed}-${k}-${pose}`) - 0.5) * 2 * amp;
  return (
    <Interactive.Div
      name={seed}
      style={{
        position: "absolute",
        rotate: `${j("r", 0.6)}deg`,
        translate: `${j("x", 1.6)}px ${j("y", 1.6)}px`,
        filter: "drop-shadow(0 14px 18px rgb(0 0 0 / 0.45))",
        ...style,
      }}
    >
      {children}
    </Interactive.Div>
  );
}

const PROMPT = "Build an app that tracks my receipts";
const ROWS = [
  { text: "WHICH", size: 64, acuity: 0 },
  { text: "MODEL", size: 46, acuity: 1.2 },
  { text: "SHOULD I USE", size: 30, acuity: 3 },
  { text: "FOR THIS PROMPT?", size: 20, acuity: 5 },
];
const SLIP = [
  { label: "RX", value: "Claude Opus 5.5", big: true },
  { label: "STRENGTH", value: "Effort: max" },
  { label: "FRAMES", value: "Claude Pro · $20/mo" },
];

export const ExamLoop: React.FC = () => {
  const raw = useCurrentFrame();
  const f = Math.floor(raw / STEP) * STEP;
  const pose = f / STEP;

  // Scene timing in frames (24 fps): prompt, exam, prescription, stamp, hold.
  const typed = Math.round(interpolate(f, [9, 54], [0, PROMPT.length], clamp));
  const lensX = interpolate(f, [60, 84, 108, 126], [470, 590, 700, 610], { ...clamp, easing: ease });
  const lensY = interpolate(f, [60, 84, 108, 126], [250, 180, 300, 230], { ...clamp, easing: ease });
  const focus = interpolate(f, [66, 126], [0, 1], clamp);
  const slipLines = Math.floor(interpolate(f, [138, 174], [0, SLIP.length + 1], clamp));

  return (
    <AbsoluteFill
      name="Exam room"
      style={{ background: `radial-gradient(ellipse 70% 80% at 55% 45%, ${C.roomLight}, ${C.room})`, fontFamily: hanken }}
    >
      {/* The prompt, written on an index card. */}
      <Cutout
        seed="Prompt card"
        pose={pose}
        style={{
          left: interpolate(f, [0, 9], [-380, 60], { ...clamp, easing: ease }),
          top: 170,
          width: 330,
          padding: "26px 28px 30px",
          background: C.paper,
          borderRadius: 6,
          color: C.paperInk,
        }}
      >
        <div style={{ fontFamily: mono, fontSize: 15, letterSpacing: "0.08em", color: C.paperMuted }}>YOUR PROMPT</div>
        <div style={{ marginTop: 14, fontSize: 30, lineHeight: 1.25, fontWeight: 600, minHeight: 114 }}>
          {PROMPT.slice(0, typed)}
          {/* The caret blinks on poses, in the chart's red. */}
          <span style={{ color: C.red, opacity: typed < PROMPT.length || pose % 4 < 2 ? 1 : 0 }}>|</span>
        </div>
      </Cutout>

      {/* The duochrome chart, in its steel bezel. */}
      <Cutout
        seed="Eye chart"
        pose={pose}
        style={{
          left: 430,
          top: interpolate(f, [42, 54], [-420, 120], { ...clamp, easing: ease }),
          width: 420,
          height: 330,
          border: `10px solid ${C.steel}`,
          borderRadius: 14,
          overflow: "hidden",
          background: `linear-gradient(90deg, ${C.red} 50%, ${C.green} 50%)`,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16, paddingTop: 38, color: C.chartInk }}>
          {ROWS.map((row) => (
            <div
              key={row.text}
              style={{
                fontFamily: archivo,
                fontWeight: 800,
                fontSize: row.size,
                letterSpacing: "0.16em",
                paddingLeft: "0.16em",
                lineHeight: 1,
                filter: `blur(${(row.acuity * (1 - focus)).toFixed(2)}px)`,
              }}
            >
              {row.text}
            </div>
          ))}
        </div>
      </Cutout>

      {/* The trial lens hops across the chart; rows sharpen behind it. */}
      <Cutout
        seed="Trial lens"
        pose={pose}
        style={{
          left: lensX,
          top: lensY,
          width: 132,
          height: 132,
          opacity: interpolate(f, [57, 60, 132, 138], [0, 1, 1, 0], clamp),
          borderRadius: "50%",
          border: `11px solid #a9b4b8`,
          background: "radial-gradient(circle at 35% 30%, rgb(255 255 255 / 0.35), rgb(255 255 255 / 0.06) 60%)",
          boxShadow: "inset 0 0 0 2px rgb(0 0 0 / 0.25)",
        }}
      >
        <div style={{ position: "absolute", left: 50, top: 118, width: 22, height: 54, background: "#a9b4b8", borderRadius: 3, rotate: "-35deg" }} />
      </Cutout>

      {/* The prescription prints, line by line, onto a slip. */}
      <Cutout
        seed="Prescription slip"
        pose={pose}
        style={{
          left: 880,
          top: interpolate(f, [132, 141], [640, 150], { ...clamp, easing: ease }),
          width: 270,
          padding: "22px 22px 26px",
          background: C.paper,
          color: C.paperInk,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", borderBottom: `3px solid ${C.paperInk}`, paddingBottom: 10 }}>
          <span style={{ fontFamily: archivo, fontWeight: 800, fontSize: 22 }}>Prescription</span>
          <span style={{ fontFamily: mono, fontSize: 12, color: C.paperMuted }}>No. 0001</span>
        </div>
        {SLIP.map((line, i) => (
          <div key={line.label} style={{ opacity: i < slipLines ? 1 : 0, paddingTop: 14, borderBottom: `1px solid ${C.rule}`, paddingBottom: 12 }}>
            <div style={{ fontFamily: mono, fontSize: 12, letterSpacing: "0.08em", color: C.paperMuted }}>{line.label}</div>
            <div style={{ marginTop: 4, fontFamily: line.big ? archivo : hanken, fontWeight: line.big ? 800 : 600, fontSize: line.big ? 24 : 17 }}>
              {line.value}
            </div>
          </div>
        ))}
      </Cutout>

      {/* The stamp lands with a thump: oversized, then pressed flat. */}
      <Cutout
        seed="Stamp"
        pose={pose}
        style={{
          left: 930,
          top: 420,
          opacity: f >= 180 ? 1 : 0,
          scale: interpolate(f, [180, 183, 186], [1.6, 0.92, 1], clamp),
          rotate: "-9deg",
          padding: "8px 16px",
          border: `4px solid ${C.teal}`,
          borderRadius: 6,
          color: C.teal,
          fontFamily: archivo,
          fontWeight: 800,
          fontSize: 26,
          letterSpacing: "0.12em",
          filter: "none",
          background: "rgb(255 255 255 / 0.9)",
        }}
      >
        FILLED
      </Cutout>
    </AbsoluteFill>
  );
};
