import { z } from "zod";
import { FeaturesSchema } from "./types";

/**
 * A saved prescription, as read back from localStorage. Storage can hold entries from older versions
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
