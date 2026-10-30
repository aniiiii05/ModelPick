import { MODELS } from "@/data/models";
import { PLANS } from "@/data/plans";
import type { Features, ModelEntry, PickedModel, PlanAdvice, Plan, Recommendation, TaskType } from "./types";

const DEEP_TASKS: TaskType[] = ["coding", "math", "reasoning"];
const BUDGET_MAX_COST = 2;

function scoreModel(m: ModelEntry, f: Features): number {
  const c = f.complexity;
  // Hard tasks reward raw quality; easy tasks reward speed and low cost.
  const qualityWeight = 0.6 + 0.1 * c;
  const thriftWeight = Math.max(0, 4 - c) * 0.5 + (f.latencySensitive ? 0.5 : 0);

  let score = m.strengths[f.taskType] * qualityWeight + (m.speed - m.cost) * thriftWeight;

  if (f.needsLongContext) score += m.contextK >= 1000 ? 1.5 : m.contextK < 400 ? -3 : 0;
  return score;
}

/** A model that cannot see images or search the web is never prescribed for a task that needs it. */
function eligible(models: ModelEntry[], f: Features): ModelEntry[] {
  const ok = models.filter((m) => (!f.needsVision || m.vision) && (!f.needsLiveWeb || m.webSearch));
  return ok.length >= 2 ? ok : models;
}

export function pickEffort(m: ModelEntry, f: Features): string {
  const levels = m.effortLevels;
  if (levels.length === 0) return "n/a";

  let level = f.complexity;
  if (DEEP_TASKS.includes(f.taskType) && f.complexity >= 3) level += 1;
  if (f.latencySensitive) level -= 1;
  level = Math.min(5, Math.max(1, level));

  const idx = Math.round(((level - 1) / 4) * (levels.length - 1));
  return levels[idx];
}

function toPicked(m: ModelEntry, f: Features): PickedModel {
  return {
    id: m.id,
    name: m.name,
    vendor: m.vendor,
    app: m.app,
    apiPrice: m.apiPrice,
    openWeights: m.openWeights,
    effortLevels: m.effortLevels,
    effort: pickEffort(m, f),
    effortLabel: m.effortLabel,
  };
}

function cheapest(plans: Plan[]) {
  const p = [...plans].sort((a, b) => a.priceUSD - b.priceUSD)[0];
  return p ? { name: p.name, priceUSD: p.priceUSD } : null;
}

function adviseOnPlan(best: ModelEntry, freeBest: ModelEntry | null, plans: Plan[]): PlanAdvice {
  const offering = plans.filter((p) => p.models[best.id]);
  // A one-off task fits inside "limited" caps; doing it regularly needs "full" access.
  const forThisTask = cheapest(offering);
  const forRegularUse = cheapest(offering.filter((p) => p.models[best.id] === "full"));

  if (!forThisTask) {
    const price = best.apiPrice ? ` (about $${best.apiPrice[0]} in / $${best.apiPrice[1]} out per 1M tokens)` : "";
    return { forThisTask: null, forRegularUse: null, note: `No consumer subscription; use it through an API such as OpenRouter${price}.` };
  }

  const notes: string[] = [];
  if (forThisTask.priceUSD === 0) notes.push("The free tier covers this.");
  else if (forRegularUse && forRegularUse.name !== forThisTask.name)
    notes.push(`${forThisTask.name} is enough for occasional use; if you do this kind of task daily, ${forRegularUse.name} avoids hitting limits.`);
  else notes.push(`${forThisTask.name} is the cheapest plan that handles this well.`);

  if (forThisTask.priceUSD > 0 && freeBest && freeBest.id !== best.id) {
    const free = plans.find((p) => p.priceUSD === 0 && p.models[freeBest.id] === "full");
    notes.push(`Best free option: ${freeBest.name} in ${free?.name ?? freeBest.app}.`);
  }
  const planNote = plans.find((p) => p.name === forThisTask.name)?.note;
  if (planNote) notes.push(planNote + ".");

  return { forThisTask, forRegularUse, note: notes.join(" ") };
}

function explain(m: ModelEntry, f: Features): string {
  const parts = [`${f.summary || f.taskType} (complexity ${f.complexity}/5)`];
  if (f.needsLiveWeb) parts.push("needs live web data");
  if (f.needsVision) parts.push("involves images");
  if (f.needsLongContext) parts.push(`large input, ${m.contextK >= 1000 ? `${m.contextK / 1000}M` : `${m.contextK}K`} context`);
  if (f.complexity <= 2) parts.push("a fast, cheap model is enough");
  else if (m.strengths[f.taskType] >= 9) parts.push(`top-tier at ${f.taskType}`);
  return parts.join(" · ");
}

export function recommend(f: Features, models: ModelEntry[] = MODELS, plans: Plan[] = PLANS): Recommendation {
  const ranked = eligible(models, f)
    .map((m) => ({ m, s: scoreModel(m, f) }))
    .sort((a, b) => b.s - a.s);

  const best = ranked[0].m;
  const runnerUp = ranked[1].m;
  const budget = best.cost <= BUDGET_MAX_COST ? null : (ranked.find((r) => r.m.cost <= BUDGET_MAX_COST)?.m ?? null);
  const freeIds = new Set(plans.filter((p) => p.priceUSD === 0).flatMap((p) => Object.entries(p.models).filter(([, a]) => a === "full").map(([id]) => id)));
  const freeBest = ranked.find((r) => freeIds.has(r.m.id))?.m ?? null;

  return {
    best: toPicked(best, f),
    budget: budget && toPicked(budget, f),
    runnerUp: { name: runnerUp.name, effort: pickEffort(runnerUp, f) },
    plan: adviseOnPlan(best, freeBest, plans),
    reason: explain(best, f),
  };
}
