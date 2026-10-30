import { describe, expect, it } from "vitest";
import { BENCH } from "@/data/benchmarks";
import { MODELS } from "@/data/models";
import { PLANS } from "@/data/plans";
import { TASK_TYPES } from "@/lib/types";

describe("catalog integrity", () => {
  it("has unique model ids", () => {
    expect(new Set(MODELS.map((m) => m.id)).size).toBe(MODELS.length);
  });

  it.each(MODELS.map((m) => [m.name, m]))("%s has sane, sourced fields", (_, m) => {
    expect(BENCH[m.id]).toBeDefined();
    for (const t of TASK_TYPES) {
      expect(Number.isInteger(m.strengths[t])).toBe(true);
      expect(m.strengths[t]).toBeGreaterThanOrEqual(3);
      expect(m.strengths[t]).toBeLessThanOrEqual(10);
    }
    expect(m.speed).toBeGreaterThanOrEqual(1);
    expect(m.speed).toBeLessThanOrEqual(5);
    expect(m.cost).toBeGreaterThanOrEqual(1);
    expect(m.cost).toBeLessThanOrEqual(5);
    expect(m.apiPrice![0]).toBeGreaterThan(0);
    expect(m.apiPrice![1]).toBeGreaterThanOrEqual(m.apiPrice![0]);
    expect(m.contextK).toBeGreaterThan(0);
    // An effort label without levels (or the reverse) would print a broken Strength line.
    expect(m.effortLevels.length > 0).toBe(m.effortLabel.length > 0);
    expect(new Set(m.effortLevels).size).toBe(m.effortLevels.length);
  });

  it("has no benchmark rows for models that are not in the catalog", () => {
    const ids = new Set(MODELS.map((m) => m.id));
    expect(Object.keys(BENCH).filter((id) => !ids.has(id))).toEqual([]);
  });
});

describe("plan integrity", () => {
  const ids = new Set(MODELS.map((m) => m.id));

  it("has unique plan names", () => {
    expect(new Set(PLANS.map((p) => p.name)).size).toBe(PLANS.length);
  });

  it.each(PLANS.map((p) => [p.name, p]))("%s only lists catalog models", (_, p) => {
    expect(p.priceUSD).toBeGreaterThanOrEqual(0);
    expect(Object.keys(p.models).length).toBeGreaterThan(0);
    for (const [id, access] of Object.entries(p.models)) {
      expect(ids.has(id), `${p.name} lists unknown model ${id}`).toBe(true);
      expect(["limited", "full"]).toContain(access);
    }
  });

  it("gives every model a consumer plan or an API price", () => {
    for (const m of MODELS) {
      const inPlan = PLANS.some((p) => p.models[m.id]);
      expect(inPlan || m.apiPrice !== null, m.name).toBe(true);
    }
  });

  it("never gives less access on a pricier plan from the same vendor", () => {
    const rank = { limited: 1, full: 2 } as const;
    for (const vendor of new Set(PLANS.map((p) => p.vendor))) {
      const tiers = PLANS.filter((p) => p.vendor === vendor).sort((a, b) => a.priceUSD - b.priceUSD);
      for (let i = 1; i < tiers.length; i++) {
        for (const [id, access] of Object.entries(tiers[i - 1].models)) {
          const next = tiers[i].models[id];
          if (next) expect(rank[next], `${tiers[i].name} vs ${tiers[i - 1].name} for ${id}`).toBeGreaterThanOrEqual(rank[access]);
        }
      }
    }
  });
});
