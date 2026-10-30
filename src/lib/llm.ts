import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";
import type { LanguageModel } from "ai";

/**
 * Which LLM reads prompts, chosen entirely from environment variables (see .env.example):
 *
 * - EXTRACTOR_PROVIDER: anthropic | google | openai | openai-compatible. Optional; when unset, the first
 *   provider whose API key is present wins, in that order.
 * - EXTRACTOR_MODEL: the provider's model id. Optional for anthropic and google, which have defaults;
 *   required for openai and openai-compatible.
 * - Keys: ANTHROPIC_API_KEY; GOOGLE_GENERATIVE_AI_API_KEY (or GEMINI_API_KEY); OPENAI_API_KEY;
 *   for openai-compatible, EXTRACTOR_API_KEY and EXTRACTOR_BASE_URL (OpenRouter, Groq, Together, a local
 *   server, anything speaking the OpenAI chat completions API).
 *
 * With nothing configured the app uses its offline classifier.
 */
export const PROVIDERS = ["anthropic", "google", "openai", "openai-compatible"] as const;
export type Provider = (typeof PROVIDERS)[number];

/** Defaults only where the model id is confirmed on the vendor's own docs (October 2026). */
const DEFAULT_MODEL: Partial<Record<Provider, string>> = {
  anthropic: "claude-haiku-5-5",
  google: "gemini-3.8-flash",
};

type Env = Record<string, string | undefined>;

export type ReaderConfig = { provider: Provider; model: string; apiKey: string; baseURL?: string };
export type ReaderResolution = { config: ReaderConfig; problem: null } | { config: null; problem: string | null };

const value = (env: Env, name: string) => env[name]?.trim() || undefined;

function keyFor(provider: Provider, env: Env): string | undefined {
  switch (provider) {
    case "anthropic":
      return value(env, "ANTHROPIC_API_KEY");
    case "google":
      return value(env, "GOOGLE_GENERATIVE_AI_API_KEY") ?? value(env, "GEMINI_API_KEY");
    case "openai":
      return value(env, "OPENAI_API_KEY");
    case "openai-compatible":
      return value(env, "EXTRACTOR_API_KEY");
  }
}

/**
 * Works out the reader from the environment. `problem` explains a half-finished setup (for the server
 * log); it is null when no provider is configured at all, which is a normal way to run the app.
 */
export function resolveReader(env: Env = process.env): ReaderResolution {
  const named = value(env, "EXTRACTOR_PROVIDER")?.toLowerCase();
  if (named && !PROVIDERS.includes(named as Provider)) {
    return { config: null, problem: `EXTRACTOR_PROVIDER "${named}" is not one of ${PROVIDERS.join(", ")}.` };
  }
  const provider = (named as Provider | undefined) ?? PROVIDERS.find((p) => keyFor(p, env));
  if (!provider) return { config: null, problem: null };

  const apiKey = keyFor(provider, env);
  if (!apiKey) return { config: null, problem: `EXTRACTOR_PROVIDER is ${provider} but its API key is not set.` };

  const model = value(env, "EXTRACTOR_MODEL") ?? DEFAULT_MODEL[provider];
  if (!model) return { config: null, problem: `Set EXTRACTOR_MODEL to a ${provider} model id.` };

  if (provider === "openai-compatible") {
    const baseURL = value(env, "EXTRACTOR_BASE_URL");
    if (!baseURL || !/^https?:\/\//i.test(baseURL)) {
      return { config: null, problem: "openai-compatible needs EXTRACTOR_BASE_URL, e.g. https://openrouter.ai/api/v1." };
    }
    return { config: { provider, model, apiKey, baseURL }, problem: null };
  }
  return { config: { provider, model, apiKey }, problem: null };
}

/** The language model for a resolved config. */
export function languageModel(c: ReaderConfig): LanguageModel {
  switch (c.provider) {
    case "anthropic":
      return createAnthropic({ apiKey: c.apiKey })(c.model);
    case "google":
      return createGoogleGenerativeAI({ apiKey: c.apiKey })(c.model);
    case "openai":
      return createOpenAI({ apiKey: c.apiKey })(c.model);
    case "openai-compatible":
      // Compatible servers implement chat completions, not OpenAI's newer Responses API.
      return createOpenAI({ apiKey: c.apiKey, baseURL: c.baseURL, name: "openai-compatible" }).chat(c.model);
  }
}

/** A short, safe label for the answer footer: the model id only, never the key or URL. */
export function readerLabel(c: ReaderConfig): string {
  return c.model.replace(/[^\w.:/-]/g, "").slice(0, 60);
}
