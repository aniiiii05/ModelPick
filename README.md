# ModelPick

Paste a prompt; ModelPick tells you which AI model and effort level to use for it. It never answers the prompt.

## How it works

1. **Extract** (`src/lib/extract.ts`): one cheap LLM call classifies the prompt into structured features (task type, complexity 1–5, needs web / vision / long context). The provider and model come from environment variables (Anthropic, Google Gemini, OpenAI, or any OpenAI-compatible API; see `.env.example` and `src/lib/llm.ts`). With none configured it uses the trained offline classifier instead.
2. **Score** (`src/lib/score.ts`): deterministic ranking over the catalog. Hard tasks weight quality; easy ones reward speed and cost. Returns the best pick with effort level, a budget pick, and which subscription to buy (for this one task vs. regular use, plus the best free option).
3. **Catalog** (`src/data/models.ts`, `src/data/plans.ts`, `src/data/benchmarks.ts`): 18 models from 12 vendors and their consumer plans. Task strengths, speed and cost are computed from cited leaderboard numbers and API prices (`npm run catalog` prints them). Fields that rest on third-party sources carry a note the app shows.

Guardrails: the API rate-limits each client (20 requests a minute per instance), caps the body at 100 KB, strips invisible characters, rejects text with no words, and times out the LLM call after 8 s, falling back to the classifier. A model that can't see images or search the web is never prescribed for a task that needs it. Pages ship with a strict Content-Security-Policy.

## Train the offline classifier

```bash
npm run train
```

Trains on the hand-labelled `src/data/training/prompts.json` plus public datasets in `external.json` (sources and licences in `src/data/training/SOURCES.md`; rebuild with `python scripts/build_dataset.py`). Compares several data mixes by 5-fold cross-validation, writes the best to `src/data/classifier.json`, and records its accuracy in `metrics.json`, which the page quotes.

With an AI provider configured, that model reads prompts with the same rubric the training labels follow. Measured with Claude Haiku: about 85% task accuracy on real prompts in a 300-prompt check, against about 66% for the offline classifier. Other providers' models were not measured. Configure one in production.

### Choosing the AI reader

| Variable | Purpose |
|---|---|
| `EXTRACTOR_PROVIDER` | `anthropic`, `google`, `openai` or `openai-compatible`. Optional: blank picks the first provider whose key is set, in that order. |
| `EXTRACTOR_MODEL` | Model id. Defaults: `claude-haiku-5-5` (anthropic), `gemini-3.8-flash` (google). Required for `openai` and `openai-compatible`. |
| `ANTHROPIC_API_KEY` | Anthropic key. |
| `GOOGLE_GENERATIVE_AI_API_KEY` or `GEMINI_API_KEY` | Google Gemini key, from aistudio.google.com/apikey. |
| `OPENAI_API_KEY` | OpenAI key. |
| `EXTRACTOR_BASE_URL`, `EXTRACTOR_API_KEY` | Any OpenAI-compatible API, e.g. `https://openrouter.ai/api/v1`. |

Examples: Gemini only needs `GEMINI_API_KEY`. OpenRouter: `EXTRACTOR_PROVIDER=openai-compatible`, `EXTRACTOR_BASE_URL=https://openrouter.ai/api/v1`, `EXTRACTOR_API_KEY=...`, `EXTRACTOR_MODEL=<an OpenRouter model id>`. A half-finished setup logs one warning and the app falls back to the offline classifier. The chosen model must support structured (JSON schema) output.

## Security notes for deployment

The app limits each client to 20 requests a minute, keyed on Cloudflare's `cf-connecting-ip` (a client can't forge it; `X-Forwarded-For` can be). That count lives in memory per Worker isolate, so it caps bursts but is not a global quota. When an AI provider is configured, also:
- add a Cloudflare rate-limiting rule (WAF) on `POST /api/recommend`, for example 30 requests a minute per IP;
- set a monthly spend limit with the provider that owns the key;
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
cp .env.example .env.local   # optionally configure an AI provider
npm run dev
```

## Deploy to Cloudflare

The app runs on Cloudflare Workers through the OpenNext adapter (`@opennextjs/cloudflare`). Config lives in `wrangler.jsonc` (Worker name `modelpick`) and `open-next.config.ts`.

1. In the Cloudflare dashboard go to **Workers & Pages → Create → Import a repository**, connect GitHub and pick `aniiiii05/ModelPick`.
2. Set the commands:
   - Build command: `npx opennextjs-cloudflare build`
   - Deploy command: `npx opennextjs-cloudflare deploy`
3. Configure the AI reader under Worker → **Settings → Variables and Secrets** (runtime, not build variables): the API key as a **Secret** (e.g. `GEMINI_API_KEY` or `ANTHROPIC_API_KEY`), and optionally `EXTRACTOR_PROVIDER` / `EXTRACTOR_MODEL` as plain text. Or from a terminal: `npx wrangler secret put GEMINI_API_KEY`. Build variables are not visible at runtime.

Every push to the production branch then builds and deploys.

Preview the production build locally in the Workers runtime (no Cloudflare login needed):

```bash
npm run preview          # builds, then serves on http://localhost:8787
```

To use a provider in local preview, put its variables in `.dev.vars` (git-ignored). `npm run deploy` deploys from your machine after `npx wrangler login`.
