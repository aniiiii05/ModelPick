/**
 * Golden prompts, written for this suite and not present in the training data.
 * They pin the behaviour users notice most; the overall bar mirrors the measured CV accuracy.
 */
import { describe, expect, it } from "vitest";
import prompts from "@/data/training/prompts.json";
import { classifierFeatures } from "@/lib/extract";
import type { TaskType } from "@/lib/types";

const GOLDEN: [string, TaskType, [number, number]][] = [
  // App building must never come back as an easy task (the original complaint).
  ["Build a full-stack marketplace app with payments, auth and an admin dashboard", "coding", [4, 5]],
  ["Create a mobile app for tracking my gym workouts with charts", "coding", [3, 5]],
  ["Make me a website for my bakery with online ordering", "coding", [3, 5]],
  ["Why does my React useEffect run twice in development?", "coding", [1, 3]],
  ["Write a SQL query that returns the top 5 customers by revenue", "coding", [1, 3]],
  ["Solve 3x + 7 = 22", "math", [1, 2]],
  ["Prove that there are infinitely many primes", "math", [2, 5]],
  ["What is the derivative of x^3 sin(x)?", "math", [1, 3]],
  ["Should I lease or buy a car if I drive 20,000 miles a year?", "reasoning", [2, 4]],
  ["Help me prioritize these five projects for next quarter", "reasoning", [2, 4]],
  ["Write a wedding toast for my sister", "writing", [1, 3]],
  ["Proofread this paragraph for grammar", "writing", [1, 2]],
  ["Draft a polite email asking my landlord to fix the heating", "writing", [1, 2]],
  ["What is the weather in Tokyo tomorrow?", "research", [1, 2]],
  ["Compare the latest electric SUVs on price and range", "research", [2, 4]],
  ["What did the Fed announce today?", "research", [1, 3]],
  ["Describe what is in this picture", "vision", [1, 2]],
  ["Read the handwriting in this photo and type it out", "vision", [1, 3]],
  ["hey there", "chat", [1, 1]],
  ["Tell me a fun fact about octopuses", "chat", [1, 2]],
];

describe("golden prompts", () => {
  const results = GOLDEN.map(([p, task, [lo, hi]]) => {
    const f = classifierFeatures(p);
    return { p, task, got: f.taskType, c: f.complexity, taskOk: f.taskType === task, cOk: f.complexity >= lo && f.complexity <= hi };
  });

  it("are not in the training data", () => {
    const train = new Set((prompts as { t: string }[]).map((r) => r.t.toLowerCase()));
    expect(GOLDEN.filter(([p]) => train.has(p.toLowerCase()))).toEqual([]);
  });

  it("names the task type for at least 80%", () => {
    const misses = results.filter((r) => !r.taskOk).map((r) => `${r.p} → ${r.got} (want ${r.task})`);
    expect(results.filter((r) => r.taskOk).length / results.length, misses.join("\n")).toBeGreaterThanOrEqual(0.8);
  });

  it("places difficulty in range for at least 75%", () => {
    const misses = results.filter((r) => !r.cOk).map((r) => `${r.p} → ${r.c}`);
    expect(results.filter((r) => r.cOk).length / results.length, misses.join("\n")).toBeGreaterThanOrEqual(0.75);
  });

  it.each(GOLDEN.slice(0, 3))("treats app building as hard coding: %s", (p) => {
    const f = classifierFeatures(p);
    expect(f.taskType).toBe("coding");
    expect(f.complexity).toBeGreaterThanOrEqual(3);
  });
});
