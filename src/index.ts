import type { ExtensionAPI } from "@mariozechner/pi-coding-agent"
import type { Api, Model, OAuthCredentials, SimpleStreamOptions, ThinkingLevel } from "@mariozechner/pi-ai"
import { streamSimpleOpenAICompletions } from "@mariozechner/pi-ai"
import { API_BASE_URL, DEFAULT_CONTEXT_WINDOW, DEFAULT_MAX_TOKENS, MODEL_ID, PROVIDER_ID } from "./constants.ts"
import { kimiHeaders } from "./headers.ts"
import { loginWithDeviceFlow, refreshKimiCredentials, type KimiOAuthCredentials } from "./oauth.ts"

export const DEFAULT_MODELS = [
  {
    id: MODEL_ID,
    name: "Kimi For Coding",
    reasoning: true,
    input: ["text"] as Array<"text" | "image">,
    cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
    contextWindow: DEFAULT_CONTEXT_WINDOW,
    maxTokens: DEFAULT_MAX_TOKENS,
    compat: {
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

export function normalizeReasoningLevel(reasoning: ThinkingLevel | undefined) {
  if (!reasoning) return { thinking: { type: "disabled" as const } }
  if (reasoning === "minimal" || reasoning === "low") {
    return { reasoning_effort: "low", thinking: { type: "enabled" as const } }
  }
  if (reasoning === "medium") {
    return { reasoning_effort: "medium", thinking: { type: "enabled" as const } }
  }
  return { reasoning_effort: "high", thinking: { type: "enabled" as const } }
}

export function applyKimiPayload(
  payload: unknown,
  options: {
    sessionId?: string
    reasoning?: ThinkingLevel
    wireModelId?: string
  },
) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return payload

  const next = { ...(payload as Record<string, unknown>) }
  if (options.sessionId) next.prompt_cache_key = options.sessionId

  const reasoning = normalizeReasoningLevel(options.reasoning)
  if (reasoning.reasoning_effort) {
    next.reasoning_effort = reasoning.reasoning_effort
  } else {
    delete next.reasoning_effort
  }
  next.thinking = reasoning.thinking

  if (options.wireModelId && next.model === MODEL_ID) {
    next.model = options.wireModelId
  }

  return next
}

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

export function streamKimiForCoding(
  model: Model<Api>,
  context: Parameters<typeof streamSimpleOpenAICompletions>[1],
  options?: SimpleStreamOptions,
) {
  const mergedHeaders = {
    ...kimiHeaders(),
    ...(options?.headers ?? {}),
  }

  const openaiModel = model as Model<"openai-completions"> & { wireModelId?: string }
  const wireModelId = openaiModel.wireModelId
  const userOnPayload = options?.onPayload

  return streamSimpleOpenAICompletions(openaiModel, context, {
    ...options,
    headers: mergedHeaders,
    onPayload: async (payload, payloadModel) => {
      const basePayload = applyKimiPayload(payload, {
        sessionId: options?.sessionId,
        reasoning: options?.reasoning,
        wireModelId,
      })

      const userPayload = await userOnPayload?.(basePayload, payloadModel)
      return userPayload ?? basePayload
    },
  })
}

export default function extension(pi: ExtensionAPI) {
  pi.registerProvider(PROVIDER_ID, {
    baseUrl: API_BASE_URL,
    api: "openai-completions",
    models: DEFAULT_MODELS,
    oauth: {
      name: "Kimi For Coding",
      login: loginWithDeviceFlow,
      refreshToken: refreshKimiCredentials,
      getApiKey: (credentials: OAuthCredentials) => credentials.access,
      modifyModels: (models, credentials) => modifyKimiModelsForCredentials(models as never, credentials),
    },
    streamSimple: streamKimiForCoding,
  })
}
