/**
 * Benchmark numbers behind every model's task strengths, retrieved 2026-10-29.
 * null = the model is not on that leaderboard (or only an older/newer version is); it is never filled in by hand.
 *
 * Sources:
 * - aa:       Artificial Analysis Intelligence Index v5.0, best listed effort  https://artificialanalysis.ai/leaderboards/models
 * - tps:      Artificial Analysis output speed, tokens/s (same page)
 * - coding:   LMArena Text-Coding Elo, 2026-10-27   https://arena.ai/leaderboard/text/coding
 * - creative: LMArena Creative Writing Elo, 2026-10-27  https://arena.ai/leaderboard/text/creative-writing
 * - text:     LMArena Text Elo (overall), 2026-10-27  https://arena.ai/leaderboard/text
 * - vision:   LMArena Vision Elo, 2026-10-19  https://arena.ai/leaderboard/vision
 * - search:   LMArena Search Arena Elo, 2026-10-13  https://arena.ai/leaderboard/search
 * - hle:      Humanity's Last Exam %, Artificial Analysis  https://artificialanalysis.ai/evaluations/humanitys-last-exam
 *             (Opus 5.5 from AA's page; others via https://pricepertoken.com/leaderboards/benchmark/hle)
 * No independent, current math benchmark (AIME, FrontierMath) covers these models, so math uses HLE,
 * which is largely competition-level math and science.
 */
export type Bench = {
  aa: number | null;
  tps: number | null;
  coding: number | null;
  creative: number | null;
  text: number | null;
  vision: number | null;
  search: number | null;
  hle: number | null;
};

export const BENCH: Record<string, Bench> = {
  "claude-opus-5-5": { aa: 58, tps: 98, coding: 1551, creative: 1520, text: 1509, vision: 1293, search: 1213, hle: 61.4 },
  "claude-fable-5-1": { aa: 50, tps: 66, coding: 1537, creative: 1489, text: 1504, vision: 1288, search: 1246, hle: 59.1 },
  "claude-sonnet-5-5": { aa: 54, tps: 137, coding: 1529, creative: 1468, text: 1477, vision: 1265, search: null, hle: 55.0 },
  "claude-haiku-5-5": { aa: 36, tps: 240, coding: 1489, creative: null, text: 1425, vision: null, search: null, hle: 44.4 },
  "gpt-6-astra": { aa: 57, tps: 73, coding: 1542, creative: 1450, text: 1476, vision: 1285, search: 1234, hle: 54.7 },
  "gpt-6-1-sol": { aa: 55, tps: 79, coding: 1541, creative: 1454, text: 1481, vision: 1294, search: 1233, hle: null },
  "gpt-6-1-terra": { aa: 51, tps: 91, coding: null, creative: null, text: null, vision: null, search: null, hle: null },
  "gemini-4-argon": { aa: 50, tps: 82, coding: 1550, creative: 1517, text: 1520, vision: null, search: null, hle: 57.1 },
  "gemini-3-8-flash": { aa: 31, tps: 140, coding: 1530, creative: 1487, text: 1496, vision: 1291, search: null, hle: 47.8 },
  "grok-4-7": { aa: 35, tps: 102, coding: 1494, creative: 1418, text: 1441, vision: 1250, search: null, hle: 43.1 },
  // API model muse-wonder-1.0. The subscription-only "Muse Wonder Full" scores 50 on AA.
  "muse-wonder": { aa: 43, tps: 197, coding: 1545, creative: 1487, text: 1507, vision: null, search: null, hle: null },
  // LMArena lists Kimi K3, not K3.1 Pro, so its arena numbers are not used.
  "kimi-k3-1-pro": { aa: 46, tps: 36, coding: null, creative: null, text: null, vision: null, search: null, hle: null },
  "qwen-3-8-max": { aa: 34, tps: 41, coding: 1525, creative: 1469, text: 1482, vision: 1300, search: 1261, hle: 43.1 },
  "mimo-v2-6-pro": { aa: 30, tps: 58, coding: 1538, creative: 1443, text: 1480, vision: 1245, search: null, hle: 49.4 },
  "deepseek-v4-1-flash": { aa: 32, tps: 178, coding: 1523, creative: 1441, text: 1476, vision: 1261, search: null, hle: 39.2 },
  "glm-5-3": { aa: 32, tps: 74, coding: 1520, creative: 1457, text: 1481, vision: null, search: null, hle: 42.3 },
  // AA lists "Mistral Large 4 Preview".
  "mistral-large-4": { aa: 25, tps: 111, coding: 1496, creative: null, text: 1432, vision: 1252, search: null, hle: null },
  "perplexity-sonar-pro": { aa: null, tps: null, coding: null, creative: null, text: null, vision: null, search: 1130, hle: null },
};

/** Which leaderboard measures each ModelPick task. */
export const TASK_BENCH = {
  coding: "coding",
  math: "hle",
  reasoning: "hle",
  writing: "creative",
  research: "search",
  vision: "vision",
  chat: "text",
} as const;
