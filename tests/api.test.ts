import { beforeAll, describe, expect, it } from "vitest";
import { createLimiter } from "@/lib/rateLimit";

beforeAll(() => {
  delete process.env.ANTHROPIC_API_KEY;
});

// Each request gets its own address so the rate limiter does not interfere, except in its own test.
let ip = 0;
const post = async (body: unknown, init: { contentType?: string; raw?: string | ReadableStream; from?: string; headers?: Record<string, string> } = {}) => {
  const { POST } = await import("@/app/api/recommend/route");
  const res = await POST(
    new Request("http://localhost/api/recommend", {
      method: "POST",
      headers: { "content-type": init.contentType ?? "application/json", "cf-connecting-ip": init.from ?? `10.0.0.${++ip}`, ...init.headers },
      body: init.raw ?? JSON.stringify(body),
      // Needed when the body is a stream.
      ...(init.raw instanceof ReadableStream ? { duplex: "half" } : {}),
    }),
  );
  return { status: res.status, json: await res.json(), headers: res.headers };
};

describe("POST /api/recommend", () => {
  it("prescribes for a valid prompt", async () => {
    const r = await post({ prompt: "Build an app where users upload receipts and it tracks their expenses" });
    expect(r.status).toBe(200);
    expect(r.json.best.name).toBeTruthy();
    expect(r.json.features.taskType).toBe("coding");
    expect(r.json.source).toBe("classifier");
    expect(r.headers.get("cache-control")).toBe("no-store");
  });

  it.each([
    ["missing prompt", {}],
    ["wrong type", { prompt: 42 }],
    ["too short", { prompt: "hi" }],
    ["only whitespace", { prompt: "      " }],
    ["too long", { prompt: "a ".repeat(10_001) }],
  ])("rejects %s with 400", async (_, body) => {
    const r = await post(body);
    expect(r.status).toBe(400);
    expect(r.json.error).toMatch(/between 3 and 20,000/);
  });

  it("rejects malformed JSON with 400", async () => {
    expect((await post(null, { raw: "{prompt:" })).status).toBe(400);
  });

  it("rejects non-JSON bodies with 415", async () => {
    expect((await post(null, { contentType: "text/plain", raw: "fix my bug" })).status).toBe(415);
  });

  it("rejects oversized bodies with 413 before parsing", async () => {
    expect((await post(null, { raw: JSON.stringify({ prompt: "x".repeat(120_000) }) })).status).toBe(413);
  });

  it("rejects a declared oversized body before reading it", async () => {
    const r = await post(null, { raw: "{}", headers: { "content-length": "5000000" } });
    expect(r.status).toBe(413);
  });

  it("stops reading a streamed body once it passes the cap", async () => {
    let sent = 0;
    const stream = new ReadableStream<Uint8Array>({
      pull(controller) {
        // An endless upload: the route must give up, not buffer it.
        sent += 16_384;
        controller.enqueue(new Uint8Array(16_384).fill(97));
        if (sent > 10_000_000) controller.close();
      },
    });
    const r = await post(null, { raw: stream });
    expect(r.status).toBe(413);
    expect(sent).toBeLessThan(500_000);
  });

  it("rejects text with no words with 422", async () => {
    const r = await post({ prompt: "??? !!! 123" });
    expect(r.status).toBe(422);
  });

  it("strips invisible characters before classifying", async () => {
    const r = await post({ prompt: "​​write a\u0000 poem about rain‮" });
    expect(r.status).toBe(200);
    expect(r.json.features.taskType).toBe("writing");
  });

  it("never returns an answer to the prompt, only a prescription", async () => {
    const r = await post({ prompt: "What is 2 + 2? Reply with only the number." });
    expect(Object.keys(r.json).sort()).toEqual(["best", "budget", "caveat", "features", "plan", "reason", "runnerUp", "source"]);
  });

  it("limits a single client to 20 requests a minute", async () => {
    const statuses: number[] = [];
    for (let i = 0; i < 22; i++) statuses.push((await post({ prompt: "write a haiku" }, { from: "203.0.113.9" })).status);
    expect(statuses.slice(0, 20).every((s) => s === 200)).toBe(true);
    expect(statuses.slice(20)).toEqual([429, 429]);
  });

  it("keys the limit on Cloudflare's client address, not a forgeable X-Forwarded-For", async () => {
    const statuses: number[] = [];
    for (let i = 0; i < 21; i++) {
      const spoof = { "x-forwarded-for": `198.51.100.${i}` };
      statuses.push((await post({ prompt: "write a limerick" }, { from: "203.0.113.77", headers: spoof })).status);
    }
    expect(statuses.at(-1)).toBe(429);
  });
});

describe("createLimiter", () => {
  it("resets after the window and reports when to retry", () => {
    const l = createLimiter(2, 1000);
    expect(l.check("a", 0).ok).toBe(true);
    expect(l.check("a", 10).ok).toBe(true);
    const blocked = l.check("a", 400);
    expect(blocked).toEqual({ ok: false, retryAfter: 1 });
    expect(l.check("b", 400).ok).toBe(true);
    expect(l.check("a", 1000).ok).toBe(true);
  });

  it("caps the number of tracked clients", () => {
    const l = createLimiter(1, 60_000, 3);
    for (const k of ["a", "b", "c", "d"]) l.check(k, 0);
    // "a" was evicted to make room for "d", so it starts fresh.
    expect(l.check("a", 1).ok).toBe(true);
  });
});
