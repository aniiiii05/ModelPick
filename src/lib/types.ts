import { z } from "zod";

export const TASK_TYPES = [
  "coding",
  "math",
  "reasoning",
  "writing",
  "research",
  "vision",
  "chat",
] as const;

export type TaskType = (typeof TASK_TYPES)[number];

/** What the extractor tells us about a prompt. It describes the prompt; it never answers it. */
export const FeaturesSchema = z.object({
  taskType: z.enum(TASK_TYPES).describe("The single best-fitting category for the prompt"),
  complexity: z
    .number()
    .int()
    .min(1)
    .max(5)
    .describe("1 = trivial one-liner, 3 = multi-step, 5 = expert-level, long or high-stakes"),
  needsLiveWeb: z.boolean().describe("Needs current information (news, prices, recent releases)"),
  needsLongContext: z.boolean().describe("Involves very large inputs (whole codebases, books, long PDFs)"),
  needsVision: z.boolean().describe("Involves images, screenshots, diagrams or scanned documents"),
  latencySensitive: z.boolean().describe("The user wants a quick answer more than a perfect one"),
  summary: z.string().max(120).describe("A short neutral description of the task, e.g. 'refactor a React hook'"),
});

export type Features = z.infer<typeof FeaturesSchema>;

export type ModelEntry = {
  id: string;
  name: string;
  vendor: string;
  /** Where the user actually picks this model. */
  app: string;
  /** 0–10 per task. Estimates anchored to the benchmarks noted in models.ts. */
  strengths: Record<TaskType, number>;
  /** 1 = slow, 5 = fast */
  speed: number;
  /** 1 = cheap, 5 = premium (API price per task) */
  cost: number;
  /** USD per 1M tokens, input / output. Null when no public price was found. */
  apiPrice: [number, number] | null;
  /** Artificial Analysis Intelligence Index (v5 where available). */
  intelligence: number | null;
  contextK: number;
  webSearch: boolean;
  vision: boolean;
  openWeights: boolean;
  /** Effort levels the vendor exposes, lowest to highest. Empty = no effort control. */
  effortLevels: string[];
  effortLabel: string;
  /** Set when sources conflicted on name, availability or pricing. */
  verify?: string;
};

/** How much of a model a plan gives you. */
export type Access = "limited" | "full";

export type Plan = {
  vendor: string;
  name: string;
  priceUSD: number;
  models: Record<string, Access>;
  note?: string;
};

export type PickedModel = Pick<ModelEntry, "id" | "name" | "vendor" | "app" | "apiPrice" | "openWeights" | "effortLevels"> & {
  effort: string;
  effortLabel: string;
};

export type PlanAdvice = {
  /** Cheapest plan that handles this one task. */
  forThisTask: { name: string; priceUSD: number } | null;
  /** Cheapest plan with full access, for people who do this kind of task often. */
  forRegularUse: { name: string; priceUSD: number } | null;
  note: string;
};

export type Recommendation = {
  best: PickedModel;
  /** Strongest cheap model for the same task; null when the best pick is already cheap. */
  budget: PickedModel | null;
  runnerUp: { name: string; effort: string };
  plan: PlanAdvice;
  reason: string;
};
