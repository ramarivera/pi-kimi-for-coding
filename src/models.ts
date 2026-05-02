import { API_BASE_URL, DEFAULT_CONTEXT_WINDOW, DEFAULT_MAX_TOKENS, MODEL_ID, PROVIDER_ID } from "./constants.ts"
import type { KimiOAuthCredentials } from "./oauth.ts"

export const KIMI_K2_6_COST = {
  input: 0.95,
  output: 4,
  cacheRead: 0.16,
  cacheWrite: 0,
}

export const DEFAULT_MODELS = [
  {
    id: MODEL_ID,
    name: "Kimi For Coding",
    api: "openai-completions" as const,
    provider: PROVIDER_ID,
    baseUrl: API_BASE_URL,
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
  },
]

export function modifyKimiModelsForCredentials<T extends Array<Record<string, unknown>>>(
  models: T,
  credentials: Partial<KimiOAuthCredentials>,
) {
  return models.map((model) => {
    if (model.id !== MODEL_ID) return model

    return {
      ...model,
      name: credentials.modelDisplay || model.name,
      contextWindow:
        typeof credentials.contextLength === "number" && credentials.contextLength > 0
          ? credentials.contextLength
          : model.contextWindow,
      wireModelId: credentials.wireModelId || model.id,
    }
  }) as T
}
