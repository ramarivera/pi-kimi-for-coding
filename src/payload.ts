import type { ThinkingLevel } from "@earendil-works/pi-ai"
import { MODEL_ID } from "./constants.ts"

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
