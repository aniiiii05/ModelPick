---
name: ModelPick
description: An eye exam for your prompts. A duochrome chart reads the task; a prescription slip names the model, effort and plan.
colors:
  ground: "#eef2f3"
  ground-2: "#e2e9eb"
  ink: "#0e1416"
  ink-2: "#3f5056"
  ink-3: "#56666c"
  rule: "#c5d0d3"
  field: "#ffffff"
  teal: "#0d5c63"
  teal-hover: "#094a50"
  on-teal: "#ffffff"
  steel: "#262d31"
  duo-red: "#e04848"
  duo-green: "#3e9b63"
  chart-ink: "#0b0b0b"
  paper: "#ffffff"
  paper-ink: "#121618"
  paper-muted: "#4e5a5f"
  paper-rule: "#d5dcde"
  dim-ground: "#0d1214"
  dim-ink: "#e7edef"
  dim-teal: "#63bcc4"
typography:
  chart:
    fontFamily: "Archivo (wdth 125), system-ui, sans-serif"
    fontSize: "clamp(2.6rem, 9vw, 6rem)"
    fontWeight: 700
    lineHeight: 1
    letterSpacing: "0.16em"
  display:
    fontFamily: "Archivo (wdth 112), system-ui, sans-serif"
    fontSize: "clamp(2rem, 4.5vw, 3.25rem)"
    fontWeight: 750
    lineHeight: 1.05
    letterSpacing: "-0.015em"
  body:
    fontFamily: "Hanken Grotesk, system-ui, sans-serif"
    fontSize: "1.0625rem"
    fontWeight: 400
    lineHeight: 1.6
  rx-data:
    fontFamily: "Red Hat Mono, ui-monospace, monospace"
    fontSize: "0.72rem"
    fontWeight: 500
    letterSpacing: "0.08em"
rounded:
  sm: "6px"
  md: "10px"
  lg: "14px"
  xl: "16px"
  pill: "9999px"
spacing:
  gutter-mobile: "16px"
  gutter: "24px"
  section: "112px"
  content-max: "1200px"
components:
  button-primary:
    backgroundColor: "{colors.teal}"
    textColor: "{colors.on-teal}"
    rounded: "{rounded.md}"
    padding: "12px 20px"
  button-primary-hover:
    backgroundColor: "{colors.teal-hover}"
  chip:
    backgroundColor: "{colors.field}"
    textColor: "{colors.ink-2}"
    rounded: "{rounded.pill}"
    padding: "4px 12px"
  intake-field:
    backgroundColor: "{colors.field}"
    textColor: "{colors.ink}"
    rounded: "{rounded.xl}"
  prescription-slip:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.paper-ink}"
    padding: "32px 32px 24px"
  eye-chart:
    backgroundColor: "{colors.duo-red}"
    textColor: "{colors.chart-ink}"
    rounded: "{rounded.lg}"
---

# Design System: ModelPick

## Overview

**Creative North Star: "The Exam Room"**

ModelPick is staged as an optician's exam. Choosing a model is fitting lenses: the right strength for the job, no stronger. The page never looks like an AI landing page. The visitor reads a backlit duochrome chart that asks the question, types, watches the chart pull into focus, and receives a printed prescription.

Two objects are lit and keep their colours in any light: the chart and the paper slip. Everything else is the room, a cool exam-room grey that dims to near-black when the visitor turns the lights down. The room is quiet so the two objects can carry the experience.

**Key Characteristics:**
- A duochrome chart (red and green halves, black letters) is the heading and the signature.
- Results are prescriptions on perforated paper, not cards.
- Teal, the colour of an exam chair, is reserved for the one primary action.
- Mono type appears only where a prescription would print data.
- Dark mode is "lights dimmed", and the chart spills coloured light onto the room.

## Colors

### Primary
- **Exam-chair teal** (`#0d5c63`; `#63bcc4` with the lights dimmed): the primary action, focus rings, the selected lens rim, data bars in the lens case.

### Secondary
- **Duochrome red** (`#e04848`) and **duochrome green** (`#3e9b63`): only on the chart, the chart's light spill, the rays in the exam diagram, and the small chart behind the 3D lens in the lens case. Text on them is always chart ink (`#0b0b0b`).

### Neutral
- **Exam-room ground** (`#eef2f3`, dimmed `#0d1214`), **ground-2** for quiet fills, **ink / ink-2 / ink-3** for text in three steps, **rule** for hairlines, **field** for inputs and panels.
- **Paper** (`#ffffff`) with **paper-ink** and **paper-muted**: the slip's own palette. It does not change with the lights.

### Named Rules
**The Two Lit Objects Rule.** Only the chart and the prescription slip own fixed colours. Everything else follows the room and changes with the lights.

**The One Teal Rule.** Teal marks the action you can take. Don't use it for decoration or headings.

## Typography

### Hierarchy
- **Chart** (Archivo, width 125, weight 700, tracking 0.16em): the four rows of the eye chart only, in descending sizes from `clamp(2.6rem, 9vw, 6rem)` to `clamp(0.9rem, 2.5vw, 1.65rem)`.
- **Display** (Archivo, width 112, weight 750, tracking -0.015em): section headings, the model name on the slip, lens powers.
- **Body** (Hanken Grotesk 17px / 1.6): all reading text, with the measure capped at about 60ch.
- **Rx data** (Red Hat Mono): slip field labels, the prescription number and date, acuity labels, prices, tabular figures.

### Named Rules
**The Printed Data Rule.** Mono is for what a prescription prints: labels, numbers, prices. Sentences are never set in mono.

## Layout

- The content column is 1200px max, with a 16px gutter on mobile and 24px from `sm`.
- 112px separates major sections. Headings get more space above than below.
- The first viewport stacks the chart, a one-line intro, then the intake form at max 780px. The primary action stays visible without scrolling at 1440×900.
- The prescription column is 680px max. On mobile, slip labels stack above their values. From `sm` up, they sit in an 8rem column.
- The lens case is a 3, 4 or 5-column grid beside a sticky detail panel on `lg`, and stacks below.

## Elevation & Depth

- **Chart:** a steel bezel (6px mobile, 10px desktop) with a soft offset shadow, an inner radial backlight per half, and an inset falloff at the bezel. With the lights dimmed, a blurred red/green spill falls 48px below it.
- **Slip:** a drop shadow (`0 22px 28px rgb(8 18 22 / 0.28)`) applied as a filter, so it follows the perforated mask.
- **Intake:** a soft lift (`0 10px 30px -18px`).
- **3D (three.js via React Three Fiber):** two scenes, no more. Both are lit by drei Lightformers baked into an environment map (no HDR download) and use one steel (`#a9b4b8`, metal). They load after hydration via `next/dynamic`, stop rendering off screen, and fall back to the plain page if WebGL fails.
- Every shadow has an offset and a blur. No zero-offset glows.

## Shapes

- Radii are 6px (focus), 10px (buttons), 14px (chart), 16px (intake and panels), and pill (chips and filters).
- Lenses are true circles with 6px rims and a centration cross. The slip's top edge is perforated with 5px semicircles every 18px.

## Components

### Buttons
- **Primary:** teal, white text, 10px radius, 12×20 padding, semibold, with the lens icon. Hover darkens it; active nudges it down 1px. While loading it reads "Focusing…" and the lens icon rotates. It is disabled only while loading.
- **Quiet:** an underlined text button ("New exam", "Clear my file"), or an outlined small button ("Copy") on the slip.

### Chips
- Sample prompts and lab filters are pills with a hairline rule. Chips carry authored short labels, never truncated text. Filters fill with ink when pressed.

### Inputs / Fields
- **Intake:** a white field with a 1.5px rule border that turns teal on focus-within, a 4-row textarea with a red caret, and a footer bar holding the shortcut hint and the primary action.

### Navigation
- Text links in ink-2 that hover to ink, plus the Lights switch (a bulb icon in an outlined pill, labelled from `sm`). On mobile only "Your file" and the switch show.

### Eye Chart (signature)
- Four rows: WHICH / MODEL / SHOULD I USE / FOR THIS PROMPT?, with acuity labels 20/200 to 20/40 at the left. Each row blurs by its acuity in em (0, 0.012, 0.035, 0.07) multiplied by `1 - focus`. Focus follows typing progress up to 0.8, reaches 0.92 while loading, and snaps to 1 on a result. The transition is 900ms exponential ease-out, staggered 70ms per row.

### Trial Lens over the chart (signature, 3D)
- A steel trial lens (rim, near-clear glass, angled tab) floats over the chart in an orthographic scene, where 1 unit = 1 CSS px. Through its aperture the chart reads sharp and 1.14× larger: a DOM copy of the chart at focus 1, clipped to `circle(--lr at --lx --ly)`, which the scene updates each frame. Idle, it drifts across the rows; a pointer over the chart takes it over (the cursor hides on fine pointers). It leans into its motion and spins in its frame while the exam runs. Reduced motion parks it over row three.

### Lens stage (3D)
- The lens case detail panel opens with the selected model as a biconvex glass lens (transmission material) in front of a small duochrome Snellen chart. The glass thickness follows the Intelligence Index (thin at 28, thick at 60), so a stronger model visibly magnifies more. Each new pick sets the lens with a quarter turn, and visitors can drag it within limits; it springs back.

### Exam film (stop-motion)
- "How the exam works" opens with a 9-second loop rendered with Remotion (`exam-film/`): a prompt card, the chart sharpening under a trial lens, the slip printing, a teal FILLED stamp. Posed every third frame at 24 fps, each pose nudged up to 0.6° and 1.6px like hand-placed paper. It sits in the chart's steel bezel on the dimmed-room colour, plays only on screen, and shows its final frame to reduced-motion visitors.

### Prescription Slip (signature)
- Header ("Prescription", number and date), then Task, Rx (an SVG ℞ mark drawn at the name's cap height, plus the model name in display type), Strength (biconvex lens profiles that thicken per effort step: outlines in paper-ink at 60% over a paper-rule fill, the prescribed one solid ink), Frames (plan for this task, plan for daily use, and a note), Spare pair, and Notes. It closes with a prescriber line. It prints with a 1100ms clip-path reveal, and the fields ink in staggered by 90ms. Under a mouse it tips toward the pointer (up to 5° by 7°) like a sheet held to the light.

### Trial Lens
- A circular rim (steel; teal when selected), glass, and a centration cross that turns 45° on hover and 90° when selected. The power is the Intelligence Index in display type, or a "not rated" stamp when no score exists.

## Do's and Don'ts

### Do:
- Do let the chart and the slip carry the page. Keep the room quiet.
- Do keep teal for the single primary action and selection states.
- Do write labels in the exam's language: prescription, strength, frames, spare pair, your file.
- Do respect reduced motion: no blur transition, no print animation, no lens hunt.
- Do theme browser surfaces: selection colour, the red caret, focus rings and the scrollbar.

### Don't:
- Don't set prose in mono.
- Don't put a kicker or eyebrow label above a heading.
- Don't truncate chip or button labels; author a short label instead.
- Don't add same-size feature-card grids, gradient text, or glass panels.
- Don't recolour the chart or the slip for dark mode; dim the room around them.
