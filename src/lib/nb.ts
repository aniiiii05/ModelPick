/**
 * Multinomial Naive Bayes over unigrams + bigrams. Self-contained (no imports)
 * so `scripts/train.ts` can run it directly with Node.
 */

export type NBModel = {
  vocabSize: number;
  classes: Record<string, { logPrior: number; total: number; counts: Record<string, number> }>;
};

export type Example = { text: string; label: string };

/**
 * Word tables are plain objects, so a lookup must ignore inherited keys: otherwise a prompt containing
 * "constructor" reads Object.prototype.constructor (a function) and turns every score into NaN.
 */
const own = <T,>(o: Record<string, T>, k: string): T | undefined => (Object.hasOwn(o, k) ? o[k] : undefined);

const STOPWORDS = new Set(["a", "an", "the", "i", "my", "me", "to", "for", "of", "and", "in", "on", "is", "it", "this", "with", "can", "you", "please"]);

function stem(w: string): string {
  if (w.length > 5 && w.endsWith("ing")) return w.slice(0, -3);
  if (w.length > 4 && w.endsWith("ed")) return w.slice(0, -2);
  if (w.length > 3 && w.endsWith("s") && !w.endsWith("ss")) return w.slice(0, -1);
  return w;
}

/** Domain keyword groups, emitted as extra tokens so a small dataset still generalizes. */
const KEYWORD_GROUPS: [string, RegExp][] = [
  ["coding", /\b(app|application|website|site|web|api|backend|frontend|code|coding|script|function|bug|debug|refactor|deploy|database|schema|server|react|next\.?js|node|python|typescript|javascript|sql|regex|swift|flutter|android|ios|django|kubernetes|docker|bot|extension|saas|full[- ]?stack|compiler|repo|git|ci\/cd)\b/gi],
  ["math", /\b(prove|proof|theorem|integral|derivative|equation|solve|calculate|compute|probability|matrix|determinant|limit|prime|algebra|geometry|statistics|percent|%|\d+\s*[x*/+-]\s*\d+)\b/gi],
  ["reasoning", /\b(should i|decide|decision|strategy|plan|trade-?offs?|pros and cons|analy[sz]e|evaluate|assess|risks?|prioriti[sz]e|business plan|framework|critique|why did)\b/gi],
  ["writing", /\b(write|draft|rewrite|edit|proofread|essay|email|letter|blog|post|story|poem|lyrics|speech|toast|copy|resume|cover letter|novel|chapter|screenplay|translate|summari[sz]e|tweet)\b/gi],
  ["research", /\b(latest|current|today|tonight|this week|news|price|prices|rates?|compare|research|sources|citations|studies|papers|market|forecast|weather|who won|near me|20\d\d)\b/gi],
  ["vision", /\b(image|photo|picture|screenshot|scan|scanned|diagram|chart|ocr|handwriting|mockup|figma|x-ray|schematic|wireframe)\b/gi],
];
const HARD = /\b(architect\w*|scal\w+|production|multi-?tenan\w*|microservices?|edge cases?|every|rigorous\w*|olympiad|putnam|in[- ]depth|deep research|literature review|due diligence|thesis|full[- ]?stack|payments?|billing|auth\w*|real[- ]time|entire|whole|complete|end[- ]to[- ]end)\b/gi;
const BUILD = /\b(build|create|develop|make|design|implement)\b.{0,40}\b(app|application|platform|system|saas|website|store|game|service|backend)\b/i;
const BIG = /\b\d{1,3}(,\d{3})+|\b\d{3,}\s?-?\s?(lines?|pages?|words?|rows?|files?|invoices?)\b/i;

function signalTokens(text: string): string[] {
  const out: string[] = [];
  for (const [group, re] of KEYWORD_GROUPS) {
    const hits = text.match(re)?.length ?? 0;
    for (let i = 0; i < Math.min(hits, 3) * 2; i++) out.push(`__kw_${group}`);
  }
  const hard = Math.min(text.match(HARD)?.length ?? 0, 3);
  for (let i = 0; i < hard * 2; i++) out.push("__hard");
  if (BUILD.test(text)) out.push("__build", "__build", "__build");
  if (BIG.test(text)) out.push("__big", "__big");
  const words = text.split(/\s+/).length;
  out.push(words <= 6 ? "__len_xs" : words <= 12 ? "__len_s" : words <= 25 ? "__len_m" : "__len_l");
  return out;
}

export function tokenize(text: string): string[] {
  const words = text
    .toLowerCase()
    .split(/[^a-z0-9+#]+/)
    .filter((w) => w && !STOPWORDS.has(w))
    .map(stem);
  const bigrams = words.slice(1).map((w, i) => `${words[i]}_${w}`);
  return [...words, ...bigrams, ...signalTokens(text)];
}

export function train(examples: Example[]): NBModel {
  const classes: NBModel["classes"] = {};
  const vocab = new Set<string>();

  for (const { text, label } of examples) {
    const c = (classes[label] ??= { logPrior: 0, total: 0, counts: Object.create(null) });
    c.logPrior += 1;
    for (const tok of tokenize(text)) {
      vocab.add(tok);
      c.counts[tok] = (own(c.counts, tok) ?? 0) + 1;
      c.total += 1;
    }
  }
  for (const c of Object.values(classes)) c.logPrior = Math.log(c.logPrior / examples.length);
  return { vocabSize: vocab.size, classes };
}

export const TASK_ORDER = ["coding", "math", "reasoning", "writing", "research", "vision", "chat"];

/** Features for the complexity regression. `nbExpected` is the NB complexity model's expected value. */
export function complexityFeatures(text: string, task: string, nbExpected: number): number[] {
  const words = text.split(/\s+/).length;
  return [
    1,
    nbExpected,
    Math.min(text.match(HARD)?.length ?? 0, 3),
    BUILD.test(text) ? 1 : 0,
    BIG.test(text) ? 1 : 0,
    Math.log2(1 + words),
    ...TASK_ORDER.map((t) => (t === task ? 1 : 0)),
  ];
}

/** Ridge least squares via normal equations + Gaussian elimination. */
export function fitLinear(X: number[][], y: number[], lambda = 0.5): number[] {
  const n = X[0].length;
  const A = Array.from({ length: n }, (_, i) =>
    Array.from({ length: n }, (_, j) => X.reduce((s, r) => s + r[i] * r[j], 0) + (i === j && i > 0 ? lambda : 0)),
  );
  const b = Array.from({ length: n }, (_, i) => X.reduce((s, r, k) => s + r[i] * y[k], 0));
  for (let c = 0; c < n; c++) {
    let p = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(A[r][c]) > Math.abs(A[p][c])) p = r;
    [A[c], A[p]] = [A[p], A[c]];
    [b[c], b[p]] = [b[p], b[c]];
    for (let r = 0; r < n; r++) {
      if (r === c || A[c][c] === 0) continue;
      const f = A[r][c] / A[c][c];
      for (let k = c; k < n; k++) A[r][k] -= f * A[c][k];
      b[r] -= f * b[c];
    }
  }
  return b.map((v, i) => (A[i][i] === 0 ? 0 : v / A[i][i]));
}

export function nbExpected(model: NBModel, text: string): number {
  return predict(model, text).reduce((s, x) => s + Number(x.label) * x.p, 0);
}

export function predictComplexity(weights: number[], features: number[]): number {
  const v = weights.reduce((s, w, i) => s + w * features[i], 0);
  return Math.min(5, Math.max(1, Math.round(v)));
}

/** Returns class probabilities, highest first. */
export function predict(model: NBModel, text: string): { label: string; p: number }[] {
  const toks = tokenize(text);
  const logs = Object.entries(model.classes).map(([label, c]) => {
    let lp = c.logPrior;
    for (const tok of toks) lp += Math.log(((own(c.counts, tok) ?? 0) + 1) / (c.total + model.vocabSize));
    return { label, lp };
  });
  const max = Math.max(...logs.map((l) => l.lp));
  const exp = logs.map((l) => ({ label: l.label, e: Math.exp(l.lp - max) }));
  const sum = exp.reduce((s, x) => s + x.e, 0);
  return exp.map((x) => ({ label: x.label, p: x.e / sum })).sort((a, b) => b.p - a.p);
}

/* ── Logistic regression ──────────────────────────────────────────────────────
 * Multinomial (softmax) regression over the same tokens, TF-IDF weighted and L2-normalised.
 * Unlike Naive Bayes it learns how much each token matters given the others, so a word like
 * "app" can count for coding without every prompt containing it being coding.
 */

export type LRModel = {
  labels: string[];
  vocab: Record<string, number>;
  idf: number[];
  /** Sparse weights per class: feature index → weight. */
  w: Record<string, number>[];
  b: number[];
};

export type WeightedExample = Example & { weight?: number };

function featurize(text: string, vocab: Record<string, number>, idf: number[]): [number, number][] {
  const counts = new Map<number, number>();
  for (const tok of tokenize(text)) {
    const i = own(vocab, tok);
    if (i !== undefined) counts.set(i, (counts.get(i) ?? 0) + 1);
  }
  const feats = [...counts].map(([i, n]): [number, number] => [i, (1 + Math.log(n)) * idf[i]]);
  const norm = Math.hypot(...feats.map((f) => f[1])) || 1;
  return feats.map(([i, v]) => [i, v / norm]);
}

/** Deterministic PRNG so training runs are reproducible. */
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function trainLR(
  examples: WeightedExample[],
  opts: { epochs?: number; lr?: number; l2?: number; minDf?: number; seed?: number } = {},
): LRModel {
  const { epochs = 25, lr = 0.5, l2 = 1e-5, minDf = 2, seed = 7 } = opts;
  const labels = [...new Set(examples.map((e) => e.label))].sort();
  const df = new Map<string, number>();
  for (const e of examples) for (const tok of new Set(tokenize(e.text))) df.set(tok, (df.get(tok) ?? 0) + 1);
  const vocab: Record<string, number> = Object.create(null);
  const idf: number[] = [];
  for (const [tok, n] of df) {
    if (n < minDf) continue;
    vocab[tok] = idf.length;
    idf.push(Math.log((1 + examples.length) / (1 + n)) + 1);
  }
  const V = idf.length;
  const K = labels.length;
  const W = Array.from({ length: K }, () => new Float64Array(V));
  const G = Array.from({ length: K }, () => new Float64Array(V).fill(1e-8)); // AdaGrad accumulators
  const b = new Float64Array(K);
  const gb = new Float64Array(K).fill(1e-8);
  const data = examples.map((e) => ({ x: featurize(e.text, vocab, idf), y: labels.indexOf(e.label), w: e.weight ?? 1 }));
  const rand = mulberry32(seed);
  const p = new Float64Array(K);

  for (let epoch = 0; epoch < epochs; epoch++) {
    for (let i = data.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [data[i], data[j]] = [data[j], data[i]];
    }
    for (const { x, y, w } of data) {
      let max = -Infinity;
      for (let k = 0; k < K; k++) {
        let z = b[k];
        for (const [i, v] of x) z += W[k][i] * v;
        p[k] = z;
        if (z > max) max = z;
      }
      let sum = 0;
      for (let k = 0; k < K; k++) sum += p[k] = Math.exp(p[k] - max);
      for (let k = 0; k < K; k++) {
        const g = w * (p[k] / sum - (k === y ? 1 : 0));
        gb[k] += g * g;
        b[k] -= (lr * g) / Math.sqrt(gb[k]);
        for (const [i, v] of x) {
          const gi = g * v + l2 * W[k][i];
          G[k][i] += gi * gi;
          W[k][i] -= (lr * gi) / Math.sqrt(G[k][i]);
        }
      }
    }
  }

  // Store only weights that move a prediction; three decimals is plenty after normalisation.
  const w = W.map((row) => {
    const out: Record<string, number> = {};
    row.forEach((v, i) => {
      if (Math.abs(v) >= 0.02) out[i] = Math.round(v * 1000) / 1000;
    });
    return out;
  });
  return { labels, vocab, idf: idf.map((v) => Math.round(v * 1000) / 1000), w, b: [...b].map((v) => Math.round(v * 1000) / 1000) };
}

export function predictLR(model: LRModel, text: string): { label: string; p: number }[] {
  const x = featurize(text, model.vocab, model.idf);
  const z = model.labels.map((_, k) => x.reduce((s, [i, v]) => s + (model.w[k][i] ?? 0) * v, model.b[k]));
  const max = Math.max(...z);
  const e = z.map((v) => Math.exp(v - max));
  const sum = e.reduce((s, v) => s + v, 0);
  return model.labels.map((label, k) => ({ label, p: e[k] / sum })).sort((a, b) => b.p - a.p);
}

/* ── The shipped task model ───────────────────────────────────────────────── */

export type TaskKind = "nb" | "lr" | "ensemble";

/** Task type from Naive Bayes, logistic regression, or the average of both. */
export function predictTaskWith(kind: TaskKind, nb: NBModel | null, lr: LRModel | null, text: string): { label: string; p: number }[] {
  if (kind === "nb") return predict(nb!, text);
  if (kind === "lr") return predictLR(lr!, text);
  const a = Object.fromEntries(predict(nb!, text).map((x) => [x.label, x.p]));
  return predictLR(lr!, text)
    .map((x) => ({ label: x.label, p: (x.p + (a[x.label] ?? 0)) / 2 }))
    .sort((x, y) => y.p - x.p);
}

/** Drop vocabulary the regression gave no weight to, and renumber what is left. */
export function compactLR(m: LRModel): LRModel {
  const used = new Set(m.w.flatMap((row) => Object.keys(row).map(Number)));
  const remap = new Map<number, number>();
  const vocab: Record<string, number> = Object.create(null);
  const idf: number[] = [];
  for (const [tok, i] of Object.entries(m.vocab)) {
    if (!used.has(i)) continue;
    remap.set(i, idf.length);
    vocab[tok] = idf.length;
    idf.push(m.idf[i]);
  }
  const w = m.w.map((row) => Object.fromEntries(Object.entries(row).map(([i, v]) => [remap.get(Number(i))!, v])));
  return { ...m, vocab, idf, w };
}
