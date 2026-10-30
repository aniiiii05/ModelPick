# Surface brief: home (`src/app/page.tsx`)

Scope: the whole app, one route. The working tool, the models list, recent history and a short method note.
Visitor mode: Operate. The visitor came to get one answer: which model, at what effort, on which plan.
Audience: hackathon judges (a two-minute demo) and everyday AI users choosing between ChatGPT, Claude, Gemini and the rest.
Replaces: the "Exam Room" eye-chart world, which the owner judged a college project: long, themed, decorated.
Memorable moment: the answer itself, clear enough to act on in one read.

## Direction contract

THESIS: A production AI tool that looks like the products it recommends. One screen, the category's own grammar (sidebar, centred composer, answer in place), executed with the precision of ChatGPT, Perplexity and Gemini. It refuses the themed landing page, scroll-length explainers, decorative 3D and metaphor copy.

OWN-WORLD: Neutral greys with a near-black primary action (white in dark mode), one quiet teal accent for selection and score bars, hairline borders, 12–24px radii, no gradients, no glow. Geist Sans for everything; Geist Mono only for figures in the Models table, while prices inside answer sentences use tabular Geist Sans. Follows the system theme; a toggle overrides.

STORY: The visitor reads one question, pastes a prompt or taps a sample, and sees the recommendation as an answer block: the model, its effort setting, which plan covers it, a cheaper option and an alternative. Past answers sit in the sidebar; the Models view lists the catalog; "How it works" states the method and measured accuracy in a few lines.

FIRST VIEWPORT: Left sidebar 260px (wordmark, New, Models, Recent list, How it works and theme toggle at the foot). Main column centred at 720px: the question "Which AI model should you use?" at 28–32px semibold, one sentence beneath, the composer (rounded, textarea, send button bottom-right), four sample chips. All visible at 1280×720 and 390×844; on mobile the sidebar becomes a top bar with a menu.

FORM: The category standard, played straight; owner-pinned ("clean like Google, Apple, ChatGPT, Gemini"), so no direction roll was run (the skill's engine binary is not executed in this project). seed: none (roll not run; owner-pinned)

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

Signature interaction: the answer replaces the empty state in place, the prompt shown as a sent message above it and the composer docked below, as in a chat; a skeleton holds the answer's shape while it loads. Motion 150–200ms, state only.
