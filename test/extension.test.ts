import { expect, test } from "bun:test"
import extension, { DEFAULT_MODELS, applyKimiPayload, modifyKimiModelsForCredentials, normalizeReasoningLevel } from "../src/index.ts"
import { MODEL_ID, PROVIDER_ID } from "../src/constants.ts"

test("normalizeReasoningLevel maps pi thinking levels to Kimi wire semantics", () => {
  expect(normalizeReasoningLevel(undefined)).toEqual({ thinking: { type: "disabled" } })
  expect(normalizeReasoningLevel("minimal")).toEqual({ reasoning_effort: "low", thinking: { type: "enabled" } })
  expect(normalizeReasoningLevel("low")).toEqual({ reasoning_effort: "low", thinking: { type: "enabled" } })
  expect(normalizeReasoningLevel("medium")).toEqual({ reasoning_effort: "medium", thinking: { type: "enabled" } })
  expect(normalizeReasoningLevel("high")).toEqual({ reasoning_effort: "high", thinking: { type: "enabled" } })
  expect(normalizeReasoningLevel("xhigh")).toEqual({ reasoning_effort: "high", thinking: { type: "enabled" } })
})

test("applyKimiPayload injects session cache key, thinking fields, and discovered wire id", () => {
  const payload = applyKimiPayload(
    { model: MODEL_ID, messages: [] },
    { sessionId: "sess-1", reasoning: "medium", wireModelId: "k2p5" },
  ) as Record<string, unknown>

  expect(payload).toEqual({
    model: "k2p5",
    messages: [],
    prompt_cache_key: "sess-1",
    reasoning_effort: "medium",
    thinking: { type: "enabled" },
  })
})

test("modifyKimiModelsForCredentials patches runtime model metadata from login discovery", () => {
  const next = modifyKimiModelsForCredentials(DEFAULT_MODELS as any, {
    modelDisplay: "Kimi Code",
    contextLength: 262144,
    wireModelId: "k2p5",
  }) as Array<Record<string, unknown>>

  expect(next[0]?.name).toBe("Kimi Code")
  expect(next[0]?.contextWindow).toBe(262144)
  expect(next[0]?.wireModelId).toBe("k2p5")
  expect(next[0]?.id).toBe(MODEL_ID)
})

test("extension registers the custom provider with Pi", () => {
  let captured: { name: string; config: unknown } | undefined
  extension({
    registerProvider(name: string, config: unknown) {
      captured = { name, config }
    },
  } as any)

  expect(captured?.name).toBe(PROVIDER_ID)
  expect((captured?.config as { models: Array<{ id: string }> }).models[0]?.id).toBe(MODEL_ID)
  expect((captured?.config as { oauth: { name: string } }).oauth.name).toBe("Kimi For Coding")
})

test("Kimi model compat disables developer role so system prompts stay system messages", () => {
  expect(DEFAULT_MODELS[0]?.compat?.supportsDeveloperRole).toBe(false)
})
