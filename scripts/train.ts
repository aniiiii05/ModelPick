/**
 * Trains the offline prompt classifier and reports cross-validated accuracy.
 * - Task type: Naive Bayes, logistic regression, or both averaged, over words + keyword-group signals.
 * - Complexity: ridge regression over difficulty signals + an NB complexity score.
 *
 * Data:
 * - prompts.json: hand-labelled prompts in ModelPick's own task taxonomy.
 * - silver.json: real user prompts (LMArena) labelled with ModelPick's own rubric (scripts/sample_for_labeling.py).
 * - external.json: public prompts with labels mapped from the datasets' own tags (see SOURCES.md).
 *
 * Three test sets, each 5-fold and never seen by the model being scored:
 * - "hand": the hand-labelled prompts.
 * - "real (rubric)": held-out real user prompts labelled with the app's rubric. The headline number.
 * - "real (tags)": held-out public prompts scored against their source tags, which only loosely match
 *   ModelPick's seven tasks; kept so results stay comparable with earlier runs.
 * Each candidate is scored on both, and the best is written out. Run with `npm run train`.
 */
import { readFileSync, writeFileSync } from "node:fs";
import {
  complexityFeatures,
  fitLinear,
  nbExpected,
  predictComplexity,
  compactLR,
  predictTaskWith,
  train,
  trainLR,
  type LRModel,
  type NBModel,
} from "../src/lib/nb.ts";

type Row = { t: string; task: string | null; c: number | null; src?: string };

const hand: Row[] = JSON.parse(readFileSync("src/data/training/prompts.json", "utf8"));
// Real prompts are messy; drop fragments and pastes with too few words to carry a task signal.
const external: Row[] = (JSON.parse(readFileSync("src/data/training/external.json", "utf8")) as Row[]).filter(
  (r) => (r.t.match(/[a-z]{2,}/gi)?.length ?? 0) >= 4,
);

const silver: Row[] = JSON.parse(readFileSync("src/data/training/silver.json", "utf8"));

type Kind = "nb" | "lr" | "ensemble";
type Mix = {
  name: string;
  kind: Kind;
  handWeight: number;
  silver: boolean;
  tags: boolean;
  l2?: number;
  epochs?: number;
  minDf?: number;
  /** Small enough to ship in a Cloudflare Worker (the free plan caps the whole Worker at 3 MB compressed). */
  ships?: boolean;
};

const MIXES: Mix[] = [
  { name: "NB, hand x20 + tags (first model)", kind: "nb", handWeight: 20, silver: false, tags: true },
  { name: "NB, hand x5 + rubric", kind: "nb", handWeight: 5, silver: true, tags: false },
  { name: "LR, hand x5 + rubric", kind: "lr", handWeight: 5, silver: true, tags: false },
  { name: "NB+LR, hand x5 + rubric", kind: "ensemble", handWeight: 5, silver: true, tags: false },
  { name: "NB+LR, hand x10 + rubric", kind: "ensemble", handWeight: 10, silver: true, tags: false },
  // Rarer words dropped: the model has to fit a Cloudflare Worker (3 MB compressed on the free plan).
  { name: "NB+LR, hand x5 + rubric, words seen 5+ times", kind: "ensemble", handWeight: 5, silver: true, tags: false, minDf: 5, ships: true },
  { name: "NB+LR, hand x5 + rubric, words seen 10+ times", kind: "ensemble", handWeight: 5, silver: true, tags: false, minDf: 10, ships: true },
];

type TaskModel = { kind: Kind; nb?: NBModel; lr?: LRModel };

const repeat = <T,>(xs: T[], n: number) => Array.from({ length: n }, () => xs).flat();

function fitTask(handTrain: Row[], otherTrain: Row[], mix: Mix): TaskModel {
  const ext = otherTrain.filter((r) => r.task);
  const out: TaskModel = { kind: mix.kind };
  if (mix.kind !== "lr") {
    // Naive Bayes priors follow class counts, and real chat logs hold almost no image prompts; top rare
    // classes up with their hand-labelled rows to a tenth of an even share so they are not swamped.
    const rows = [...repeat(handTrain, mix.handWeight), ...ext];
    const count: Record<string, number> = {};
    for (const r of rows) count[r.task!] = (count[r.task!] ?? 0) + 1;
    const floor = rows.length / Object.keys(count).length / 10;
    for (const [task, n] of Object.entries(count)) {
      const seeds = handTrain.filter((r) => r.task === task);
      for (let i = 0; n + i < floor && seeds.length; i++) rows.push(seeds[i % seeds.length]);
    }
    out.nb = train(rows.map((r) => ({ text: r.t, label: r.task! })));
  }
  if (mix.kind !== "nb") {
    // LR takes the hand weight as a per-example weight, and balances classes so no source floods one.
    const rows = [...handTrain.map((r) => ({ r, w: mix.handWeight })), ...ext.map((r) => ({ r, w: 1 }))];
    const mass: Record<string, number> = {};
    for (const { r, w } of rows) mass[r.task!] = (mass[r.task!] ?? 0) + w;
    const mean = Object.values(mass).reduce((s, v) => s + v, 0) / Object.keys(mass).length;
    out.lr = trainLR(
      rows.map(({ r, w }) => ({ text: r.t, label: r.task!, weight: (w * mean) / mass[r.task!] })),
      { l2: mix.l2, epochs: mix.epochs, minDf: mix.minDf },
    );
  }
  return out;
}

const predictTask = (m: TaskModel, text: string) => predictTaskWith(m.kind, m.nb ?? null, m.lr ?? null, text)[0].label;

function fitComplexity(handTrain: Row[], task: TaskModel) {
  const cRows = handTrain as (Row & { c: number })[];
  const complexityNBOf = (rs: typeof cRows) => train(rs.map((r) => ({ text: r.t, label: String(r.c) })));
  const complexityNB = complexityNBOf(cRows);
  // Stacking: the NB score fed to the regression comes from models that never saw that row.
  const folds = Array.from({ length: 5 }, (_, f) => complexityNBOf(cRows.filter((_, j) => j % 5 !== f)));
  const X = cRows.map((r, i) => complexityFeatures(r.t, r.task ?? predictTask(task, r.t), nbExpected(folds[i % 5], r.t)));
  return { complexityNB, weights: fitLinear(X, cRows.map((r) => r.c)) };
}

// Deterministic shuffles so CV numbers are reproducible.
let seed = 42;
const rand = () => ((seed = (seed * 1103515245 + 12345) % 2 ** 31) / 2 ** 31);
const shuffledHand = [...hand].sort(() => rand() - 0.5);
const extTask = external.filter((r) => r.task).sort(() => rand() - 0.5);
const shuffledSilver = [...silver].sort(() => rand() - 0.5);

const K = 5;
const inFold = <T,>(xs: T[], k: number) => xs.filter((_, i) => i % K === k);
const outFold = <T,>(xs: T[], k: number) => xs.filter((_, i) => i % K !== k);

/** Accuracy on `pool`, one model per fold, trained on everything else the mix uses. */
function taskCV(mix: Mix, pool: "silver" | "tags") {
  let hits = 0;
  const confusion: Record<string, number> = {};
  const test = pool === "silver" ? shuffledSilver : extTask;
  for (let k = 0; k < K; k++) {
    const sil = mix.silver ? (pool === "silver" ? outFold(shuffledSilver, k) : shuffledSilver) : [];
    const tags = mix.tags ? (pool === "tags" ? outFold(extTask, k) : extTask) : [];
    const m = fitTask(hand, [...sil, ...tags], mix);
    for (const r of inFold(test, k)) {
      const t = predictTask(m, r.t);
      if (t === r.task) hits++;
      else confusion[`${r.task}→${t}`] = (confusion[`${r.task}→${t}`] ?? 0) + 1;
    }
  }
  return { acc: hits / test.length, confusion };
}

function evaluate(mix: Mix) {
  let taskHits = 0;
  let cExact = 0;
  let cWithin1 = 0;
  const confusion: Record<string, number> = {};
  const others = [...(mix.silver ? silver : []), ...(mix.tags ? external : [])];
  for (let k = 0; k < K; k++) {
    const test = inFold(shuffledHand, k);
    const handTrain = outFold(shuffledHand, k);
    const task = fitTask(handTrain, others, mix);
    const cx = fitComplexity(handTrain, task);
    for (const r of test) {
      const t = predictTask(task, r.t);
      if (t === r.task) taskHits++;
      else confusion[`${r.task}→${t}`] = (confusion[`${r.task}→${t}`] ?? 0) + 1;
      const c = predictComplexity(cx.weights, complexityFeatures(r.t, t, nbExpected(cx.complexityNB, r.t)));
      if (c === r.c) cExact++;
      if (Math.abs(c - (r.c ?? 0)) <= 1) cWithin1++;
    }
  }
  const real = taskCV(mix, "silver");
  const tags = taskCV(mix, "tags");
  const n = hand.length;
  return { task: taskHits / n, real: real.acc, ext: tags.acc, exact: cExact / n, within1: cWithin1 / n, confusion, extConfusion: real.confusion };
}

const pct = (x: number) => `${(x * 100).toFixed(1)}%`.padStart(6);
console.log(`Hand-labelled: ${hand.length}. Real prompts, rubric-labelled: ${silver.length}. Public prompts with source tags: ${extTask.length}.`);
console.log(`5-fold CV on each test set; complexity is scored on the hand-labelled prompts.\n`);
console.log("  hand  real(rubric)  real(tags)  c exact  c ±1   candidate");

let best: { mix: Mix; score: number; r: ReturnType<typeof evaluate> } | null = null;
for (const mix of MIXES) {
  const r = evaluate(mix);
  console.log(`${pct(r.task)}      ${pct(r.real)}     ${pct(r.ext)}   ${pct(r.exact)}  ${pct(r.within1)}   ${mix.name}`);
  // Task type matters most (it picks the model family): real prompts first, then the app's own set;
  // complexity ±1 next (it picks the effort).
  const score = r.real * 2 + r.task * 1.5 + r.within1 + r.exact * 0.5;
  // Every candidate is reported; only ones small enough for the Worker can be chosen.
  if (mix.ships && (!best || score > best.score)) best = { mix, score, r };
}

const top = (c: Record<string, number>) => Object.entries(c).sort((a, b) => b[1] - a[1]).slice(0, 6);
console.log(`\nChosen: ${best!.mix.name}`);
console.log("Hand mistakes:", top(best!.r.confusion));
console.log("Real-world (rubric) mistakes:", top(best!.r.extConfusion));

const task = fitTask(hand, [...(best!.mix.silver ? silver : []), ...(best!.mix.tags ? external : [])], best!.mix);
/** Drop tokens seen twice or less in a class: they barely move predictions and dominate file size. */
function prune(m: NBModel): NBModel {
  const classes: NBModel["classes"] = {};
  for (const [label, c] of Object.entries(m.classes)) {
    classes[label] = { ...c, counts: Object.fromEntries(Object.entries(c.counts).filter(([, n]) => n > 2)) };
  }
  return { vocabSize: m.vocabSize, classes };
}

const out = {
  taskKind: task.kind,
  task: task.nb ? prune(task.nb) : null,
  taskLR: task.lr ? compactLR(task.lr) : null,
  ...fitComplexity(hand, task),
};
writeFileSync("src/data/classifier.json", JSON.stringify(out));
writeFileSync(
  "src/data/training/metrics.json",
  JSON.stringify(
    {
      model: best!.mix.name,
      handPrompts: hand.length,
      // Only the data the chosen model was trained on.
      externalPrompts: (best!.mix.tags ? external.length : 0) + (best!.mix.silver ? silver.length : 0),
      rubricPrompts: silver.length,
      taskAccuracy: Number(best!.r.task.toFixed(3)),
      taskAccuracyRealWorld: Number(best!.r.real.toFixed(3)),
      taskAccuracySourceTags: Number(best!.r.ext.toFixed(3)),
      complexityExact: Number(best!.r.exact.toFixed(3)),
      complexityWithin1: Number(best!.r.within1.toFixed(3)),
    },
    null,
    2,
  ),
);
console.log(`Wrote src/data/classifier.json (${(JSON.stringify(out).length / 1024).toFixed(0)} KB) and metrics.json`);
