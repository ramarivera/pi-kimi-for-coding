import type { Api, Model, SimpleStreamOptions } from "@mariozechner/pi-ai"
import { streamSimpleOpenAICompletions } from "@mariozechner/pi-ai"
import { createKimiFetchWrapper, kimiHeaders } from "./headers.ts"
import { applyKimiPayload } from "./payload.ts"

/** Reference count for nested streamKimiForCoding calls.
 *  Keeps the fetch wrapper alive until the last active stream ends.
 */
let fetchOverrideRefCount = 0
let originalFetch: typeof globalThis.fetch | undefined

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

  // Install the wrapper on first call; reuse it on nested calls.
  if (fetchOverrideRefCount === 0) {
    originalFetch = globalThis.fetch
    globalThis.fetch = createKimiFetchWrapper(originalFetch)
  }
  fetchOverrideRefCount++

  const currentWrappedFetch = globalThis.fetch

  let stream: ReturnType<typeof streamSimpleOpenAICompletions>
  try {
    stream = streamSimpleOpenAICompletions(openaiModel, context, {
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
  } catch (error) {
    // Ensure we restore fetch even if streamSimpleOpenAICompletions throws synchronously.
    fetchOverrideRefCount--
    if (fetchOverrideRefCount === 0 && originalFetch !== undefined) {
      globalThis.fetch = originalFetch
    }
    throw error
  }

  // Decrement the ref-count (and restore fetch if needed) when the stream ends.
  void stream.result().finally(() => {
    fetchOverrideRefCount--
    if (fetchOverrideRefCount === 0 && globalThis.fetch === currentWrappedFetch && originalFetch !== undefined) {
      globalThis.fetch = originalFetch
    }
  })

  return stream
}
