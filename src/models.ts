import { DEFAULT_CONTEXT_WINDOW, DEFAULT_MAX_TOKENS, MODEL_ID, PROVIDER_ID } from "./constants.ts"
import { resolveKimiForCodingConfig, type KimiForCodingConfig, type ResolvedKimiForCodingConfig } from "./config.ts"
import type { KimiOAuthCredentials } from "./oauth.ts"

export const KIMI_K2_6_COST = {
  input: 0.95,
  output: 4,
  cacheRead: 0.16,
  cacheWrite: 0,
}

export function createKimiModels(config: KimiForCodingConfig | ResolvedKimiForCodingConfig) {
  const resolved = "baseUrl" in config ? config : resolveKimiForCodingConfig(config)
  const model = {
    id: MODEL_ID,
    name: "Kimi For Coding",
    api: resolved.api,
    provider: PROVIDER_ID,
    baseUrl: resolved.baseUrl,
    reasoning: true,
    input: ["text", "image"] as Array<"text" | "image">,
    cost: KIMI_K2_6_COST,
    contextWindow: DEFAULT_CONTEXT_WINDOW,
    maxTokens: DEFAULT_MAX_TOKENS,
    compat: {
      supportsDeveloperRole: false,
      supportsReasoningEffort: true,
      reasoningEffortMap: {
        minimal: "low",
        low: "low",
        medium: "medium",
        high: "high",
        xhigh: "high",
      },
    },
  }

  return [model]
}

export const DEFAULT_MODELS = createKimiModels({ protocol: "anthropic" })

export function modifyKimiModelsForCredentials<T extends Array<{ id: string }>>(
  models: T,
  credentials: Partial<KimiOAuthCredentials>,
) {
  return models.map((model) => {
    if (model.id !== MODEL_ID) return model

    return {
      ...model,
      name: credentials.modelDisplay || (model as { name?: unknown }).name,
      contextWindow:
        typeof credentials.contextLength === "number" && credentials.contextLength > 0
          ? credentials.contextLength
          : (model as { contextWindow?: unknown }).contextWindow,
      wireModelId: credentials.wireModelId || model.id,
    }
  }) as T
}
