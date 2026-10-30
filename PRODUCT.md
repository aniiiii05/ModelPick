# ModelPick

## Product
A web tool where people paste an AI prompt and get back which model to use for it, at which effort level, and which subscription plan to buy. It never answers the prompt itself.

## Users and job
- **Primary right now:** hackathon judges evaluating a short demo. They need the mechanism to be obvious within seconds.
- **Ongoing:** students, developers and professionals choosing between, or already paying for, ChatGPT, Claude, Gemini, Grok, Perplexity, DeepSeek and others, who want to stop guessing which model and effort setting fits a task.

## Mechanism
1. The prompt is classified into a task type, a complexity from 1 to 5, and needs (live web, vision, long context, speed). A configured LLM does this (Anthropic, Google, OpenAI or any OpenAI-compatible API); otherwise a classifier trained on labelled prompts does it.
2. A deterministic scorer ranks the model catalog. Hard tasks favour quality; easy tasks favour speed and cost.
3. The output: the best model and its effort level, a budget pick, a runner-up, and plan advice (cheapest plan for this one task, plan for regular use, best free option).

## Facts to preserve
- Catalog: 18 models from 12 labs (`src/data/models.ts`), plus consumer plans (`src/data/plans.ts`), as of Oct 2026.
- Scores are estimates anchored to the Artificial Analysis Intelligence Index v5. Some names and prices are marked unverified. The UI must not present them as guarantees.
- No invented testimonials, user counts or accuracy claims. The measured classifier accuracy in src/data/training/metrics.json (5-fold CV) may be quoted, and the page reads it from there.

## Platform
web

## Stack
Next.js 16 (App Router), TypeScript, Tailwind CSS v4, Vercel AI SDK. Deploy target: Cloudflare Workers (OpenNext).

## Brand commitments
- Look and behave like a production AI product (ChatGPT, Perplexity, Gemini, Google, Apple): clean, neutral, familiar app shell, compact. No themed metaphors, decorative 3D, long explainer sections or playful copy. (Owner, Oct 2026, replacing the "Exam Room" eye-chart design.)
