import type { Plan } from "@/lib/types";

/**
 * Consumer subscription plans (US prices), checked 2026-10-29.
 * "limited" = included but capped (session/weekly limits or a share of them);
 * "full" = usable for regular heavy work.
 *
 * Read on vendor pages: Anthropic (claude.com/pricing, support.claude.com Max plan article),
 * Mistral (mistral.ai/pricing), Perplexity (help-center article on included models, Oct 27, 2026).
 * Google's plan page only showed India prices; OpenAI, xAI and Meta pages blocked automated reads.
 * Those prices and model assignments come from third-party sites and carry a note.
 */
export const PLANS: Plan[] = [
  // OpenAI (third-party sources; chatgpt.com/pricing could not be read)
  { vendor: "OpenAI", name: "ChatGPT Free", priceUSD: 0, models: { "gpt-6-1-terra": "limited" }, note: "Model access per ChatGPT tier is from third-party sources" },
  { vendor: "OpenAI", name: "ChatGPT Go", priceUSD: 8, models: { "gpt-6-1-terra": "full" }, note: "Ad-supported; model access per ChatGPT tier is from third-party sources" },
  {
    vendor: "OpenAI",
    name: "ChatGPT Plus",
    priceUSD: 20,
    models: { "gpt-6-1-terra": "full", "gpt-6-1-sol": "full", "gpt-6-astra": "limited" },
    note: "Model access per ChatGPT tier is from third-party sources",
  },
  {
    vendor: "OpenAI",
    name: "ChatGPT Pro (5×)",
    priceUSD: 100,
    models: { "gpt-6-1-terra": "full", "gpt-6-1-sol": "full", "gpt-6-astra": "full" },
    note: "Pro tiers and model access are from third-party sources",
  },

  // Anthropic (vendor pages)
  {
    vendor: "Anthropic",
    name: "Claude Free",
    priceUSD: 0,
    models: { "claude-haiku-5-5": "full", "claude-sonnet-5-5": "limited" },
  },
  {
    vendor: "Anthropic",
    name: "Claude Pro",
    priceUSD: 20,
    models: { "claude-haiku-5-5": "full", "claude-sonnet-5-5": "full", "claude-opus-5-5": "limited" },
  },
  {
    vendor: "Anthropic",
    name: "Claude Max 5×",
    priceUSD: 100,
    models: {
      "claude-haiku-5-5": "full",
      "claude-sonnet-5-5": "full",
      "claude-opus-5-5": "full",
      "claude-fable-5-1": "limited",
    },
    note: "Fable 5.1 can use up to 50% of weekly limits",
  },
  {
    vendor: "Anthropic",
    name: "Claude Max 20×",
    priceUSD: 200,
    models: {
      "claude-haiku-5-5": "full",
      "claude-sonnet-5-5": "full",
      "claude-opus-5-5": "full",
      "claude-fable-5-1": "limited",
    },
    note: "Fable 5.1 can use up to 50% of weekly limits",
  },

  // Google (models from Google's plan pages; US prices from third-party sources)
  {
    vendor: "Google",
    name: "Google AI Pro",
    priceUSD: 19.99,
    models: { "gemini-3-8-flash": "full", "gemini-4-argon": "limited" },
  },
  {
    vendor: "Google",
    name: "Google AI Ultra (5×)",
    priceUSD: 99.99,
    models: { "gemini-3-8-flash": "full", "gemini-4-argon": "full" },
    note: "US price from third-party sources",
  },

  // xAI (third-party sources)
  { vendor: "xAI", name: "Grok Free", priceUSD: 0, models: { "grok-4-7": "limited" } },
  { vendor: "xAI", name: "SuperGrok", priceUSD: 30, models: { "grok-4-7": "full" }, note: "Price from third-party sources" },

  // Meta (third-party sources: the Muse app launched Sep 8, 2026; Muse Wonder is reported paid-only)
  { vendor: "Meta", name: "Muse Power", priceUSD: 20, models: { "muse-wonder": "limited" }, note: "Muse plan details are from third-party sources" },
  { vendor: "Meta", name: "Muse Maximum", priceUSD: 100, models: { "muse-wonder": "full" }, note: "Muse plan details are from third-party sources" },

  // Free chat apps from open-weight labs
  { vendor: "Moonshot AI", name: "Kimi (free)", priceUSD: 0, models: { "kimi-k3-1-pro": "full" }, note: "Kimi also sells paid tiers; whether K3.1 Pro needs one is unconfirmed" },
  { vendor: "Alibaba", name: "Qwen Chat (free)", priceUSD: 0, models: { "qwen-3-8-max": "full" } },
  { vendor: "DeepSeek", name: "DeepSeek Chat (free)", priceUSD: 0, models: { "deepseek-v4-1-flash": "full" } },
  { vendor: "Zhipu AI", name: "Z.ai Chat (free)", priceUSD: 0, models: { "glm-5-3": "full" } },

  // Mistral (vendor page)
  { vendor: "Mistral", name: "Le Chat Free", priceUSD: 0, models: { "mistral-large-4": "limited" } },
  { vendor: "Mistral", name: "Le Chat Pro", priceUSD: 14.99, models: { "mistral-large-4": "full" } },

  // Perplexity (models from Perplexity's help center; prices from third-party sources)
  { vendor: "Perplexity", name: "Perplexity Free", priceUSD: 0, models: { "perplexity-sonar-pro": "limited" } },
  {
    vendor: "Perplexity",
    name: "Perplexity Pro",
    priceUSD: 20,
    models: {
      "perplexity-sonar-pro": "full",
      "gpt-6-1-sol": "limited",
      "gemini-3-8-flash": "limited",
      "claude-sonnet-5-5": "limited",
      "glm-5-3": "limited",
      "grok-4-7": "limited",
    },
  },
  {
    vendor: "Perplexity",
    name: "Perplexity Max",
    priceUSD: 200,
    models: {
      "perplexity-sonar-pro": "full",
      "gpt-6-1-sol": "full",
      "gemini-3-8-flash": "full",
      "claude-sonnet-5-5": "full",
      "glm-5-3": "full",
      "grok-4-7": "full",
      "gpt-6-astra": "limited",
      "gemini-4-argon": "limited",
      "claude-opus-5-5": "limited",
      "claude-fable-5-1": "limited",
    },
  },
];
