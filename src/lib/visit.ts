import { z } from "zod";
import { FeaturesSchema, type Features, type Recommendation } from "./types";

/**
 * A saved recommendation, as read back from localStorage. Storage can hold entries from older versions
 * or ones edited by hand, so every field the page renders is checked before it is trusted.
 */
const Picked = z.object({
  id: z.string(),
  name: z.string(),
  vendor: z.string(),
  app: z.string(),
  apiPrice: z.tuple([z.number(), z.number()]).nullable(),
  openWeights: z.boolean(),
  effortLevels: z.array(z.string()),
  effort: z.string(),
  effortLabel: z.string(),
});

const PlanRef = z.object({ name: z.string(), priceUSD: z.number() }).nullable();

export const VisitSchema = z.object({
  no: z.number().int().nonnegative(),
  date: z.string().max(40),
  prompt: z.string().max(20_000),
  result: z.object({
    best: Picked,
    budget: Picked.nullable(),
    runnerUp: z.object({ name: z.string(), effort: z.string() }),
    plan: z.object({ forThisTask: PlanRef, forRegularUse: PlanRef, note: z.string() }),
    reason: z.string(),
    features: FeaturesSchema,
    source: z.enum(["llm", "classifier"]),
    reader: z.string().max(60).optional(),
    caveat: z.string().nullable().optional(),
  }),
});

/** What the API returns for one prompt. */
export type Result = Recommendation & {
  features: Features;
  source: "llm" | "classifier";
  /** The model that read the prompt; absent on results saved by older versions. */
  reader?: string;
  caveat?: string | null;
};

/** One recommendation in the visitor's history. */
export type Visit = { no: number; date: string; prompt: string; result: Result };

const KEY = "mp-file";
export const HISTORY_LIMIT = 20;

/** Saved history, keeping only entries that still render (older versions or hand edits are dropped). */
export function readHistory(): Visit[] {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    return Array.isArray(raw) ? raw.flatMap((v) => (VisitSchema.safeParse(v).success ? [v as Visit] : [])).slice(0, HISTORY_LIMIT) : [];
  } catch {
    return [];
  }
}

export function writeHistory(visits: Visit[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(visits.slice(0, HISTORY_LIMIT)));
  } catch {
    // Storage unavailable (private mode, blocked): history just won't persist.
  }
}
