import { NextResponse } from "next/server";
import { z } from "zod";
import { cleanPrompt, extractFeatures, isReadable } from "@/lib/extract";
import { clientKey, createLimiter } from "@/lib/rateLimit";
import { recommend } from "@/lib/score";

const MAX_PROMPT = 20_000;
// Room for the JSON wrapper and escaped characters around a maximum-length prompt.
const MAX_BODY_BYTES = 100_000;

const BodySchema = z.object({ prompt: z.string() });
const limiter = createLimiter(20, 60_000);

const fail = (status: number, error: string, headers?: HeadersInit) =>
  NextResponse.json({ error }, { status, headers: { "Cache-Control": "no-store", ...headers } });

export async function POST(req: Request) {
  const gate = limiter.check(clientKey(req));
  if (!gate.ok) {
    return fail(429, `Too many exams in a minute. Try again in ${gate.retryAfter}s.`, { "Retry-After": String(gate.retryAfter) });
  }

  if (!req.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
    return fail(415, "Send the prompt as JSON.");
  }
  const tooLong = () => fail(413, `That prompt is too long. Keep it under ${MAX_PROMPT.toLocaleString("en-US")} characters.`);
  if (Number(req.headers.get("content-length") ?? 0) > MAX_BODY_BYTES) return tooLong();
  const raw = await readCapped(req, MAX_BODY_BYTES);
  if (raw === null) return tooLong();

  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return fail(400, "Send a prompt between 3 and 20,000 characters.");
  }
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) return fail(400, "Send a prompt between 3 and 20,000 characters.");

  const prompt = cleanPrompt(parsed.data.prompt);
  if (prompt.length < 3 || prompt.length > MAX_PROMPT) {
    return fail(400, `Send a prompt between 3 and ${MAX_PROMPT.toLocaleString("en-US")} characters.`);
  }
  if (!isReadable(prompt)) {
    return fail(422, "That doesn't read like a task. Describe what you want an AI to do in a few words.");
  }

  try {
    const { features, source, reader, caveat } = await extractFeatures(prompt);
    return NextResponse.json({ ...recommend(features), features, source, reader, caveat }, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    // Name and message only: SDK errors carry the request body, which is the visitor's prompt.
    console.error("Recommendation failed:", err instanceof Error ? `${err.name}: ${err.message}` : "unknown error");
    return fail(500, "The exam didn't finish. Try again.");
  }
}

/**
 * Reads the body as text, giving up (null) once it passes `cap` bytes, so a huge or chunked upload
 * is never buffered whole; a Worker has 128 MB and would otherwise die on one large request.
 */
async function readCapped(req: Request, cap: number): Promise<string | null> {
  if (!req.body) return "";
  const reader = req.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > cap) {
        await reader.cancel();
        return null;
      }
      chunks.push(value);
    }
  } catch {
    return "";
  }
  const all = new Uint8Array(size);
  let at = 0;
  for (const c of chunks) {
    all.set(c, at);
    at += c.byteLength;
  }
  return new TextDecoder().decode(all);
}
