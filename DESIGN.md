---
name: ModelPick
description: Paste a prompt, get the AI model, effort setting and plan that fit it. A production chat-app shell in the category's own grammar.
colors:
  bg: "#ffffff"
  sidebar: "#f9f9f9"
  subtle: "#f3f3f3"
  hover: "#ececec"
  border: "#e3e3e3"
  border-strong: "#d0d0d0"
  fg: "#0d0d0d"
  fg-2: "#5d5d5d"
  fg-3: "#6b6b6b"
  primary: "#0d0d0d"
  on-primary: "#ffffff"
  accent: "#0f766e"
  accent-soft: "#e6f4f2"
  danger: "#b42318"
  danger-soft: "#fef3f2"
  dark-bg: "#212121"
  dark-sidebar: "#171717"
  dark-fg: "#ececec"
  dark-primary: "#ececec"
  dark-accent: "#2dd4bf"
typography:
  question:
    fontFamily: "Geist, system-ui, sans-serif"
    fontSize: "32px (28px below 640px)"
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: "-0.02em"
  answer-heading:
    fontFamily: "Geist, system-ui, sans-serif"
    fontSize: "28px"
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: "-0.02em"
  view-heading:
    fontFamily: "Geist, system-ui, sans-serif"
    fontSize: "22px"
    fontWeight: 600
    letterSpacing: "-0.01em"
  body:
    fontFamily: "Geist, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.55
  ui:
    fontFamily: "Geist, system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 400
  meta:
    fontFamily: "Geist, system-ui, sans-serif"
    fontSize: "12–13px"
    fontWeight: 400
  data:
    fontFamily: "Geist Mono, ui-monospace, monospace"
    fontSize: "13px"
    fontWeight: 400
rounded:
  control: "8px"
  item: "8px (rounded-lg)"
  table: "12px"
  dialog: "16px"
  message: "24px"
  composer: "26px"
  pill: "9999px"
spacing:
  sidebar: "260px"
  content-max: "720px"
  models-max: "960px"
  gutter-mobile: "16px"
  gutter: "24px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    rounded: "{rounded.pill}"
    size: "36px"
  composer:
    backgroundColor: "{colors.bg}"
    borderColor: "{colors.border}"
    rounded: "{rounded.composer}"
  chip:
    borderColor: "{colors.border}"
    textColor: "{colors.fg-2}"
    rounded: "{rounded.pill}"
    padding: "6px 14px"
  sidebar-item:
    textColor: "{colors.fg}"
    activeBackground: "{colors.hover}"
    rounded: "{rounded.item}"
    height: "36px"
  message:
    backgroundColor: "{colors.subtle}"
    rounded: "{rounded.message}"
---

# Design System: ModelPick

## Overview

**North Star: "The category standard, played straight"**

ModelPick looks like the products it recommends. It uses the grammar every ChatGPT, Perplexity and Gemini user already knows: a slim sidebar, one centred question, a rounded composer, and an answer that appears in place. The craft is in precision, not ornament: neutral greys, one quiet accent, hairline rules, a real type scale, and every state designed.

The whole product is one screen. Secondary material (the model catalog, the method) sits one click away in the sidebar, never in a scroll.

**Key characteristics:**
- Chat-app shell: 260px sidebar, centred 720px column, composer docked once an answer exists.
- The answer reads as an AI answer ("Use Claude Opus 5.5"), not a card or a slip.
- Near-black primary action (white in dark mode); teal only for selection, focus and data.
- One family, Geist; Geist Mono only for figures in the Models table.
- Follows the system theme; a toggle in the sidebar overrides it.

## Colors

Restrained: neutrals plus one accent, each colour with one job.

- **Neutrals:** `bg` (#ffffff / dark #212121) for the work area, `sidebar` (#f9f9f9 / #171717) for navigation, `subtle` for sent messages, table headers and skeletons, `hover` for hovered and current items, `border` / `border-strong` for hairlines.
- **Text:** `fg`, `fg-2` (secondary), `fg-3` (meta and placeholders). All meet 4.5:1 on their grounds.
- **Primary:** near-black (#0d0d0d; #ececec in dark) for the send button, the selected effort step and the error page's action.
- **Accent:** teal (#0f766e; #2dd4bf in dark) for focus rings, the caret, text selection, score bars and the GitHub link. Never decoration.
- **Danger:** inline error messages only, on `danger-soft`.

### Named rules
**One accent, real jobs.** Teal marks focus, selection and data. A new colour needs a job no existing token does.

## Typography

- **Question** (32px, 28px on phones, semibold, -0.02em): the empty state's single heading.
- **Answer heading** (28px semibold): "Use {model}", the largest thing on the answer screen.
- **View heading** (22px semibold): Models, the error page.
- **Body** (15px / 1.55): the composer, messages, answer rows.
- **UI** (14px): sidebar items, table cells, buttons.
- **Meta** (12–13px): labels, notes, the disclaimer.
- **Data** (Geist Mono 13px, tabular): scores, prices and context sizes in the Models table. Prices inside answer sentences stay in Geist with tabular figures.

Fixed pixel sizes, not fluid: this is a working screen.

## Layout

- **Desktop:** sidebar (260px, `sidebar` ground, hairline right edge) plus the main column. The empty state centres the question, sentence, composer and chips vertically. Once there is an answer: the sent prompt (right-aligned message), the answer below it, and the composer docked at the bottom with a one-line disclaimer.
- **Mobile (below 768px):** a 56px top bar (menu, wordmark, new). The sidebar slides in from the left over a 40% black scrim; Escape or the scrim closes it.
- **Models view:** 960px max, a sortable table in a 12px-radius frame that scrolls sideways on narrow screens.
- Every chat state fits one viewport at 1440, 768 and 390 wide.

## Elevation & Depth

Flat. One shadow token (`--shadow`: a 1px contact shadow plus a soft 16px drop) on the composer, the dialog and the mobile sheet. Depth otherwise comes from the sidebar's ground and hairline borders.

## Shapes

8px for items and controls, 12px for the table frame, 16px for the dialog, 24px for sent messages, 26px for the composer, full pills for chips, effort steps and the send button. Focus outlines follow each element's own radius.

## Components

- **Composer:** textarea that grows to about 10 lines; Enter sends, Shift+Enter adds a line. Footer row with a hint (or a character count near the limit) and a 36px round send button, disabled at 30% opacity when empty, a spinner while loading. Focus shows as a stronger border plus a 1px ring on the pill, never an outline inside it.
- **Sample chips:** four short authored labels, never truncated prompts.
- **Answer:** heading, "in {app} · {why}", the vendor's effort scale with the chosen step filled, then a hairline definition list (Task, Plan, Cheaper option, Alternative), then a meta row ("Read by {reader}") with Copy.
- **Skeleton:** the answer's shape in shimmering bars while the request runs.
- **Sidebar:** wordmark, New recommendation, Models, a Recent list (truncated prompts, current one highlighted, Clear), and How it works plus the theme toggle at the foot.
- **Models table:** Model and lab, Score (sortable), Price per 1M tokens (sortable, ascending), Context (sortable), Best at, Cheapest plan. A row expands to strength bars per task and the plans that include it.
- **How it works:** a native dialog with three steps, the measured accuracy, and the source link.
- **Errors:** inline under the composer on `danger-soft`, naming the problem and the fix.

## Motion

150–200ms, state only: the answer rises 4px into place, the mobile sheet slides in, rows' chevrons rotate. No page-load choreography. Reduced motion turns off the rise, the slide and the shimmer.

## Do's and Don'ts

### Do:
- Do keep the product on one screen; put secondary material behind the sidebar.
- Do write the answer as an answer: a sentence, then facts.
- Do keep teal for focus, selection and data.
- Do design every state: empty, loading, answer, error, history, dark.

### Don't:
- Don't add themes, metaphors, illustrations, 3D or decorative motion.
- Don't add explainer sections to the page; extend How it works instead.
- Don't put a label above a heading.
- Don't truncate chip or button labels; author a short one.
- Don't introduce a second accent colour or a gradient.
