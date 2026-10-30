import { describe, expect, it } from "vitest";
import { languageModel, readerLabel, resolveReader } from "@/lib/llm";

describe("resolveReader", () => {
  it("uses the offline classifier when nothing is configured", () => {
    expect(resolveReader({})).toEqual({ config: null, problem: null });
  });

  it.each([
    [{ ANTHROPIC_API_KEY: "a" }, "anthropic", "claude-haiku-5-5"],
    [{ GOOGLE_GENERATIVE_AI_API_KEY: "g" }, "google", "gemini-3.8-flash"],
    [{ GEMINI_API_KEY: "g" }, "google", "gemini-3.8-flash"],
  ])("picks the provider from the key that is set: %o", (env, provider, model) => {
    const r = resolveReader(env);
    expect(r.config).toMatchObject({ provider, model });
  });

  it("prefers anthropic, then google, then openai when several keys are set", () => {
    expect(resolveReader({ GEMINI_API_KEY: "g", ANTHROPIC_API_KEY: "a" }).config?.provider).toBe("anthropic");
  });

  it("follows an explicit provider over key order, case-insensitively", () => {
    const r = resolveReader({ EXTRACTOR_PROVIDER: " Google ", ANTHROPIC_API_KEY: "a", GEMINI_API_KEY: "g" });
    expect(r.config).toMatchObject({ provider: "google", apiKey: "g" });
  });

  it("lets EXTRACTOR_MODEL override the default", () => {
    expect(resolveReader({ GEMINI_API_KEY: "g", EXTRACTOR_MODEL: "gemini-4-argon" }).config?.model).toBe("gemini-4-argon");
  });

  it("needs a model id for openai, which has no default", () => {
    const r = resolveReader({ OPENAI_API_KEY: "o" });
    expect(r.config).toBeNull();
    expect(r.problem).toMatch(/EXTRACTOR_MODEL/);
    expect(resolveReader({ OPENAI_API_KEY: "o", EXTRACTOR_MODEL: "gpt-x" }).config?.provider).toBe("openai");
  });

  it("configures an OpenAI-compatible API from base URL, key and model", () => {
    const env = {
      EXTRACTOR_PROVIDER: "openai-compatible",
      EXTRACTOR_BASE_URL: "https://openrouter.ai/api/v1",
      EXTRACTOR_API_KEY: "k",
      EXTRACTOR_MODEL: "vendor/model",
    };
    expect(resolveReader(env).config).toEqual({ provider: "openai-compatible", model: "vendor/model", apiKey: "k", baseURL: "https://openrouter.ai/api/v1" });
  });

  it.each([
    [{ EXTRACTOR_PROVIDER: "cohere", ANTHROPIC_API_KEY: "a" }, /not one of/],
    [{ EXTRACTOR_PROVIDER: "google", ANTHROPIC_API_KEY: "a" }, /API key is not set/],
    [{ EXTRACTOR_PROVIDER: "openai-compatible", EXTRACTOR_API_KEY: "k", EXTRACTOR_MODEL: "m" }, /EXTRACTOR_BASE_URL/],
    [{ EXTRACTOR_PROVIDER: "openai-compatible", EXTRACTOR_API_KEY: "k", EXTRACTOR_MODEL: "m", EXTRACTOR_BASE_URL: "ftp://x" }, /EXTRACTOR_BASE_URL/],
  ])("reports a half-finished setup instead of guessing: %o", (env, problem) => {
    const r = resolveReader(env);
    expect(r.config).toBeNull();
    expect(r.problem).toMatch(problem);
  });

  it("treats blank values as unset", () => {
    expect(resolveReader({ ANTHROPIC_API_KEY: "  ", EXTRACTOR_MODEL: "" })).toEqual({ config: null, problem: null });
  });
});

describe("languageModel and readerLabel", () => {
  it.each([
    { provider: "anthropic", model: "claude-haiku-5-5", apiKey: "a" },
    { provider: "google", model: "gemini-3.8-flash", apiKey: "g" },
    { provider: "openai", model: "gpt-x", apiKey: "o" },
    { provider: "openai-compatible", model: "vendor/model", apiKey: "k", baseURL: "https://example.com/v1" },
  ] as const)("builds a model for $provider without a network call", (c) => {
    const m = languageModel(c) as { modelId: string };
    expect(m.modelId).toBe(c.model);
  });

  it("labels the reader with the model id only, never the key", () => {
    const label = readerLabel({ provider: "anthropic", model: "claude-haiku-5-5", apiKey: "sk-ant-secret" });
    expect(label).toBe("claude-haiku-5-5");
    expect(readerLabel({ provider: "openai", model: "<b>x</b> y", apiKey: "k" })).toBe("bx/by");
  });
});
