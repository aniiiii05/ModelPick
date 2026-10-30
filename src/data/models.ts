import type { ModelEntry, TaskType } from "@/lib/types";
import { BENCH, TASK_BENCH, type Bench } from "./benchmarks";

/**
 * The model catalog, verified 2026-10-29. Edit this file when vendors ship new models;
 * the scoring engine needs no changes.
 *
 * Strengths, speed and cost are derived from data, not hand-set:
 * - Task strength (3-10) blends two ranks among catalog models: the task's own leaderboard
 *   (see benchmarks.ts) and the Artificial Analysis Intelligence Index. Arena Elo measures what
 *   people prefer; the AA index measures hard capability. A model on only one gets that one.
 * - Speed (1-5) buckets AA output tokens/s.
 * - Cost (1-5) buckets the blended API price (3 parts input : 1 part output) per 1M tokens.
 *
 * Prices and context windows: vendor docs where they could be read
 * (platform.claude.com, developers.openai.com, ai.google.dev, docs.x.ai, api-docs.deepseek.com, docs.z.ai);
 * models marked `verify` rely on third-party sources for at least one field.
 */

const values = (key: keyof Bench) => Object.values(BENCH).map((b) => b[key]).filter((v): v is number => v !== null);

/** Rank a value among catalog models onto 3..10. */
function scaled(key: keyof Bench, v: number | null): number | null {
  if (v === null) return null;
  const vs = values(key);
  const lo = Math.min(...vs);
  const hi = Math.max(...vs);
  return hi === lo ? 10 : 3 + (7 * (v - lo)) / (hi - lo);
}

/**
 * A model missing from a task leaderboard gets the rank its AA score predicts there: a straight-line
 * fit over the catalog models that are on both. Using the AA rank directly would inflate it, since
 * leaderboard ranks spread wider than AA ranks among the strongest models.
 */
function imputed(key: keyof Bench, aa: number | null): number | null {
  if (aa === null) return null;
  const pairs = Object.values(BENCH)
    .filter((b) => b.aa !== null && b[key] !== null)
    .map((b) => [scaled("aa", b.aa)!, scaled(key, b[key])!]);
  if (pairs.length < 8) return null; // too few models on both boards for a fit
  const mx = pairs.reduce((s, p) => s + p[0], 0) / pairs.length;
  const my = pairs.reduce((s, p) => s + p[1], 0) / pairs.length;
  const sxx = pairs.reduce((s, p) => s + (p[0] - mx) ** 2, 0);
  const slope = sxx ? pairs.reduce((s, p) => s + (p[0] - mx) * (p[1] - my), 0) / sxx : 0;
  return Math.min(10, Math.max(3, my + slope * (scaled("aa", aa)! - mx)));
}

function strengths(id: string): Record<TaskType, number> {
  const b = BENCH[id];
  const overall = scaled("aa", b.aa);
  const out = {} as Record<TaskType, number>;
  for (const [task, key] of Object.entries(TASK_BENCH) as [TaskType, keyof Bench][]) {
    const onBoard = scaled(key, b[key]) ?? imputed(key, b.aa);
    const parts = [onBoard, overall].filter((x): x is number => x !== null);
    out[task] = parts.length ? Math.round(parts.reduce((s, x) => s + x, 0) / parts.length) : 3;
  }
  return out;
}

const speed = (id: string) => {
  const t = BENCH[id].tps;
  return t === null ? 3 : t >= 170 ? 5 : t >= 100 ? 4 : t >= 70 ? 3 : t >= 50 ? 2 : 1;
};

const cost = ([input, output]: [number, number]) => {
  const blended = (3 * input + output) / 4;
  return blended <= 1 ? 1 : blended <= 3 ? 2 : blended <= 6 ? 3 : blended <= 10 ? 4 : 5;
};

type Spec = Omit<ModelEntry, "strengths" | "speed" | "cost" | "intelligence"> & { apiPrice: [number, number] };

const CLAUDE_EFFORT = ["low", "medium", "high", "xhigh", "max"];
const GPT_EFFORT = ["low", "medium", "high", "xhigh", "max"];

const SPECS: Spec[] = [
  // ── Anthropic: prices, context and effort levels from platform.claude.com ──
  { id: "claude-opus-5-5", name: "Claude Opus 5.5", vendor: "Anthropic", app: "Claude.ai", apiPrice: [4, 20], contextK: 1000, webSearch: true, vision: true, openWeights: false, effortLevels: CLAUDE_EFFORT, effortLabel: "Effort" },
  { id: "claude-fable-5-1", name: "Claude Fable 5.1", vendor: "Anthropic", app: "Claude.ai", apiPrice: [10, 50], contextK: 1000, webSearch: true, vision: true, openWeights: false, effortLevels: CLAUDE_EFFORT, effortLabel: "Effort" },
  { id: "claude-sonnet-5-5", name: "Claude Sonnet 5.5", vendor: "Anthropic", app: "Claude.ai", apiPrice: [2, 10], contextK: 1000, webSearch: true, vision: true, openWeights: false, effortLevels: CLAUDE_EFFORT, effortLabel: "Effort" },
  { id: "claude-haiku-5-5", name: "Claude Haiku 5.5", vendor: "Anthropic", app: "Claude.ai", apiPrice: [0.1, 0.5], contextK: 1000, webSearch: true, vision: true, openWeights: false, effortLevels: CLAUDE_EFFORT, effortLabel: "Effort" },

  // ── OpenAI: prices from developers.openai.com ──
  { id: "gpt-6-astra", name: "GPT-6 Astra", vendor: "OpenAI", app: "ChatGPT", apiPrice: [10, 50], contextK: 1050, webSearch: true, vision: true, openWeights: false, effortLevels: GPT_EFFORT, effortLabel: "Reasoning effort", verify: "Context window and effort labels from third-party sources; input over 272K costs $20/$75" },
  { id: "gpt-6-1-sol", name: "GPT-6.1 Sol", vendor: "OpenAI", app: "ChatGPT", apiPrice: [2, 10], contextK: 1050, webSearch: true, vision: true, openWeights: false, effortLevels: GPT_EFFORT, effortLabel: "Reasoning effort", verify: "Context window and effort labels from third-party sources" },
  { id: "gpt-6-1-terra", name: "GPT-6.1 Terra", vendor: "OpenAI", app: "ChatGPT", apiPrice: [1, 5], contextK: 1050, webSearch: true, vision: true, openWeights: false, effortLevels: ["none", ...GPT_EFFORT], effortLabel: "Reasoning effort", verify: "Launched Oct 26; not yet on LMArena, so task strengths rest on the AA index alone" },

  // ── Google: prices and context from ai.google.dev ──
  { id: "gemini-4-argon", name: "Gemini 4 Argon", vendor: "Google", app: "Gemini", apiPrice: [2, 10], contextK: 1000, webSearch: true, vision: true, openWeights: false, effortLevels: ["low", "medium", "high"], effortLabel: "Thinking level", verify: "Launch price; rises to $4/$20 on Dec 1, 2026. Gemini app thinking labels not confirmed" },
  { id: "gemini-3-8-flash", name: "Gemini 3.8 Flash", vendor: "Google", app: "Gemini", apiPrice: [0.75, 3.75], contextK: 1000, webSearch: true, vision: true, openWeights: false, effortLevels: ["low", "medium", "high"], effortLabel: "Thinking level", verify: "Price rises to $1.50/$7.50 on Jan 1, 2027. Gemini app thinking labels not confirmed" },

  // ── xAI: docs.x.ai ──
  { id: "grok-4-7", name: "Grok 4.7", vendor: "xAI", app: "Grok", apiPrice: [2, 6], contextK: 500, webSearch: true, vision: true, openWeights: false, effortLevels: ["low", "medium", "high", "xhigh"], effortLabel: "Reasoning effort" },

  // ── Meta ──
  { id: "muse-wonder", name: "Meta Muse Wonder", vendor: "Meta", app: "Meta Muse", apiPrice: [4, 20], contextK: 1000, webSearch: true, vision: true, openWeights: false, effortLevels: [], effortLabel: "", verify: "Price and plans from third-party sources. The app's Muse Wonder Full (AA 50) is stronger than the API model rated here" },

  // ── Open-weight and Chinese labs ──
  { id: "kimi-k3-1-pro", name: "Kimi K3.1 Pro", vendor: "Moonshot AI", app: "Kimi", apiPrice: [2, 10], contextK: 1000, webSearch: true, vision: true, openWeights: false, effortLevels: ["off", "on"], effortLabel: "Thinking", verify: "Price from OpenRouter; weights promised for Nov 4, 2026. Not yet on LMArena" },
  { id: "qwen-3-8-max", name: "Qwen3.8 Max", vendor: "Alibaba", app: "Qwen Chat", apiPrice: [2, 6], contextK: 984, webSearch: true, vision: true, openWeights: false, effortLevels: ["off", "on"], effortLabel: "Thinking", verify: "Price from a third-party source; thinking control label not confirmed" },
  { id: "mimo-v2-6-pro", name: "MiMo-V2.6-Pro", vendor: "Xiaomi", app: "API (e.g. OpenRouter)", apiPrice: [0.435, 0.87], contextK: 1000, webSearch: false, vision: true, openWeights: true, effortLevels: ["off", "on"], effortLabel: "Thinking", verify: "Price from a third-party source; MIT-licensed weights on Hugging Face" },
  { id: "deepseek-v4-1-flash", name: "DeepSeek V4.1 Flash", vendor: "DeepSeek", app: "DeepSeek Chat", apiPrice: [0.3, 1.2], contextK: 1000, webSearch: true, vision: true, openWeights: true, effortLevels: ["off", "on"], effortLabel: "DeepThink", verify: "Peak price shown; off-peak is $0.15/$0.60. Open-weights status of this release not confirmed" },
  { id: "glm-5-3", name: "GLM-5.3", vendor: "Zhipu AI", app: "Z.ai Chat", apiPrice: [1.4, 4.4], contextK: 1000, webSearch: true, vision: false, openWeights: false, effortLevels: ["off", "on"], effortLabel: "Thinking", verify: "Context window from a third-party source; no released weights found" },
  { id: "mistral-large-4", name: "Mistral Large 4", vendor: "Mistral", app: "Le Chat", apiPrice: [1.36, 4.18], contextK: 1000, webSearch: true, vision: true, openWeights: true, effortLevels: [], effortLabel: "", verify: "Rated as the Preview on AA. Price from OpenRouter; Mistral tags it open-weight but weights were not confirmed released" },

  // ── Search-first ──
  { id: "perplexity-sonar-pro", name: "Perplexity Sonar Pro", vendor: "Perplexity", app: "Perplexity", apiPrice: [3, 15], contextK: 200, webSearch: true, vision: true, openWeights: false, effortLevels: [], effortLabel: "", verify: "Perplexity's docs now steer to its Agent API; price from a third-party source. Only benchmark found: Search Arena" },
];

export const MODELS: ModelEntry[] = SPECS.map((s) => ({
  ...s,
  strengths: strengths(s.id),
  speed: speed(s.id),
  cost: cost(s.apiPrice),
  intelligence: BENCH[s.id].aa,
}));
