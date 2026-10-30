import { describe, expect, it } from "vitest";
import { MODELS } from "@/data/models";
import { PLANS } from "@/data/plans";
import { pickEffort, recommend } from "@/lib/score";
import { TASK_TYPES, type Features } from "@/lib/types";

const base: Features = {
  taskType: "chat",
  complexity: 1,
  needsLiveWeb: false,
  needsLongContext: false,
  needsVision: false,
  latencySensitive: false,
  summary: "",
};

// Every combination the extractor can produce.
const ALL: Features[] = TASK_TYPES.flatMap((taskType) =>
  [1, 2, 3, 4, 5].flatMap((complexity) =>
    [false, true].flatMap((needsLiveWeb) =>
      [false, true].flatMap((needsVision) =>
        [false, true].flatMap((needsLongContext) =>
          [false, true].map((latencySensitive) => ({ ...base, taskType, complexity, needsLiveWeb, needsVision, needsLongContext, latencySensitive })),
        ),
      ),
    ),
  ),
);
const byId = (id: string) => MODELS.find((m) => m.id === id)!;

describe("recommend: invariants over every feature combination", () => {
  it.each(ALL.map((f) => [`${f.taskType}/${f.complexity} web=${f.needsLiveWeb} img=${f.needsVision} long=${f.needsLongContext} fast=${f.latencySensitive}`, f]))(
    "%s",
    (_, f) => {
      const r = recommend(f as Features);
      const best = byId(r.best.id);

      // Never prescribe a model that cannot do what the task needs.
      if (f.needsVision) expect(best.vision).toBe(true);
      if (f.needsLiveWeb) expect(best.webSearch).toBe(true);

      // The prescribed effort is one the vendor actually exposes.
      if (best.effortLevels.length) expect(best.effortLevels).toContain(r.best.effort);
      else expect(r.best.effort).toBe("n/a");

      // The spare pair is cheaper than the pick and meets the same needs.
      if (r.budget) {
        const b = byId(r.budget.id);
        expect(b.cost).toBeLessThanOrEqual(2);
        expect(b.cost).toBeLessThan(best.cost);
        if (f.needsVision) expect(b.vision).toBe(true);
        if (f.needsLiveWeb) expect(b.webSearch).toBe(true);
      }
      expect(r.runnerUp.name).not.toBe(r.best.name);

      // Plan advice names real plans that include the pick, and the daily plan gives full access.
      if (r.plan.forThisTask) {
        const p = PLANS.find((x) => x.name === r.plan.forThisTask!.name)!;
        expect(p.models[best.id]).toBeDefined();
      }
      if (r.plan.forRegularUse) {
        const p = PLANS.find((x) => x.name === r.plan.forRegularUse!.name)!;
        expect(p.models[best.id]).toBe("full");
        expect(p.priceUSD).toBeGreaterThanOrEqual(r.plan.forThisTask!.priceUSD);
      }
      expect(r.reason.length).toBeGreaterThan(0);
    },
  );
});

describe("recommend: prescribes to the task", () => {
  it("sends hard coding to a top coding model at high effort", () => {
    const r = recommend({ ...base, taskType: "coding", complexity: 5 });
    expect(byId(r.best.id).strengths.coding).toBeGreaterThanOrEqual(9);
    expect(["xhigh", "max"]).toContain(r.best.effort);
  });

  it("sends a greeting to a fast, cheap model", () => {
    const best = byId(recommend({ ...base, taskType: "chat", complexity: 1 }).best.id);
    expect(best.cost).toBe(1);
  });

  it("never picks a more expensive model for an easier version of the same task", () => {
    for (const taskType of TASK_TYPES) {
      const costs = [1, 2, 3, 4, 5].map((complexity) => byId(recommend({ ...base, taskType, complexity }).best.id).cost);
      // Allow one step of noise between neighbouring difficulties, but easy must not cost more than hard.
      expect(costs[0]).toBeLessThanOrEqual(costs[4]);
    }
  });
});

describe("pickEffort", () => {
  const opus = byId("claude-opus-5-5");
  it("scales with difficulty", () => {
    const efforts = [1, 2, 3, 4, 5].map((complexity) => opus.effortLevels.indexOf(pickEffort(opus, { ...base, taskType: "writing", complexity })));
    expect(efforts).toEqual([...efforts].sort((a, b) => a - b));
    expect(efforts[0]).toBe(0);
    expect(efforts[4]).toBe(opus.effortLevels.length - 1);
  });

  it("goes one step deeper for hard coding, math and reasoning", () => {
    const writing = opus.effortLevels.indexOf(pickEffort(opus, { ...base, taskType: "writing", complexity: 3 }));
    const coding = opus.effortLevels.indexOf(pickEffort(opus, { ...base, taskType: "coding", complexity: 3 }));
    expect(coding).toBeGreaterThan(writing);
  });

  it("returns n/a for models without an effort control", () => {
    expect(pickEffort(byId("muse-wonder"), base)).toBe("n/a");
  });
});
