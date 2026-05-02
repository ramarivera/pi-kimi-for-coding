import type { Api, Model, SimpleStreamOptions } from "@mariozechner/pi-ai"
import { streamSimpleOpenAICompletions } from "@mariozechner/pi-ai"
import { createKimiFetchWrapper, kimiHeaders } from "./headers.ts"
import { applyKimiPayload } from "./payload.ts"

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
  const originalFetch = globalThis.fetch
  const wrappedFetch = createKimiFetchWrapper(originalFetch)
  globalThis.fetch = wrappedFetch

  const stream = streamSimpleOpenAICompletions(openaiModel, context, {
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

  void stream.result().finally(() => {
    if (globalThis.fetch === wrappedFetch) {
      globalThis.fetch = originalFetch
    }
  })

  return stream
}
