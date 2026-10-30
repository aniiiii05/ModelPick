# ModelPick

Paste a prompt; ModelPick tells you which AI model and effort level to use for it. It never answers the prompt.

## How it works

1. **Extract** (`src/lib/extract.ts`): one cheap LLM call classifies the prompt into structured features (task type, complexity 1–5, needs web / vision / long context). Without `ANTHROPIC_API_KEY` it uses the trained offline classifier instead.
2. **Score** (`src/lib/score.ts`): deterministic ranking over the catalog. Hard tasks weight quality; easy ones reward speed and cost. Returns the best pick with effort level, a budget pick, and which subscription to buy (for this one task vs. regular use, plus the best free option).
3. **Catalog** (`src/data/models.ts`, `src/data/plans.ts`, `src/data/benchmarks.ts`): 18 models from 12 vendors and their consumer plans. Task strengths, speed and cost are computed from cited leaderboard numbers and API prices (`npm run catalog` prints them). Fields that rest on third-party sources carry a note the app shows.

Guardrails: the API rate-limits each client (20 requests a minute per instance), caps the body at 100 KB, strips invisible characters, rejects text with no words, and times out the LLM call after 8 s, falling back to the classifier. A model that can't see images or search the web is never prescribed for a task that needs it. Pages ship with a strict Content-Security-Policy.

## Train the offline classifier

```bash
npm run train
```

Trains on the hand-labelled `src/data/training/prompts.json` plus public datasets in `external.json` (sources and licences in `src/data/training/SOURCES.md`; rebuild with `python scripts/build_dataset.py`). Compares several data mixes by 5-fold cross-validation, writes the best to `src/data/classifier.json`, and records its accuracy in `metrics.json`, which the page quotes.

With `ANTHROPIC_API_KEY` set, Claude Haiku 5.5 reads prompts with the same rubric the training labels follow: about 85% task accuracy on real prompts in a 300-prompt check, against about 60% for the offline classifier. Set the key in production.

## The film

The stop-motion loop in "How the exam works" is a Remotion project in `exam-film/` (its own `package.json`). Preview with `npm run dev` there; re-render into `public/film/` with:

```bash
npx remotion render ExamLoop ../public/film/exam.mp4 --codec=h264 --crf=26
npx remotion render ExamLoop ../public/film/exam.webm --codec=vp9 --crf=36
npx remotion still ExamLoop ../public/film/exam-poster.jpg --frame=200 --image-format=jpeg
```

Remotion is free for individuals and companies of up to three people; larger companies need a license (remotion.pro/license).

## Security notes for deployment

The app limits each client to 20 requests a minute, keyed on Cloudflare's `cf-connecting-ip` (a client can't forge it; `X-Forwarded-For` can be). That count lives in memory per Worker isolate, so it caps bursts but is not a global quota. When `ANTHROPIC_API_KEY` is set, also:
- add a Cloudflare rate-limiting rule (WAF) on `POST /api/recommend`, for example 30 requests a minute per IP;
- set a monthly spend limit on the Anthropic workspace that owns the key;
- turn on "Always Use HTTPS" (the app already sends HSTS).

Errors are logged without the visitor's prompt.

## Test

```bash
npm test
```

Vitest covers every feature combination the scorer can see (it must never prescribe a model that lacks vision or web search when needed, and the effort must be one the vendor exposes), catalog and plan integrity, the API's input guardrails and rate limit, and golden prompts the classifier has never seen.

## Run locally

```bash
npm install
cp .env.example .env.local   # optionally add ANTHROPIC_API_KEY
npm run dev
```

## Deploy

Push to GitHub, import the repo on Vercel, and add `ANTHROPIC_API_KEY` in Project → Settings → Environment Variables.
