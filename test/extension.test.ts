import { expect, test } from "bun:test"
import { calculateCost, type Api, type Model, type Usage } from "@mariozechner/pi-ai"
import extension, { DEFAULT_MODELS, applyKimiPayload, modifyKimiModelsForCredentials, normalizeReasoningLevel } from "../src/index.ts"
import { ANTHROPIC_API_BASE_URL, MODEL_ID, OPENAI_API_BASE_URL, PROVIDER_ID } from "../src/constants.ts"
import { resolveKimiForCodingConfig } from "../src/config.ts"
import { createKimiModels } from "../src/models.ts"

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

test("Kimi model advertises both text and image input", () => {
  expect(DEFAULT_MODELS[0]?.input).toEqual(["text", "image"])
})

test("Kimi endpoint config defaults to Anthropic-compatible protocol", () => {
  const resolved = resolveKimiForCodingConfig({ protocol: "anthropic" })

  expect(DEFAULT_MODELS[0]?.api).toBe("anthropic-messages")
  expect(DEFAULT_MODELS[0]?.baseUrl).toBe(ANTHROPIC_API_BASE_URL)
  expect(resolved).toMatchObject({
    protocol: "anthropic",
    api: "anthropic-messages",
    baseUrl: ANTHROPIC_API_BASE_URL,
  })
})

test("Kimi endpoint config can still select OpenAI-compatible protocol", () => {
  const [model] = createKimiModels({ protocol: "openai" })

  expect(model?.api).toBe("openai-completions")
  expect(model?.baseUrl).toBe(OPENAI_API_BASE_URL)
})

test("Kimi model reports K2.6 costs from models.dev in Pi per-million-token units", () => {
  expect(DEFAULT_MODELS[0]?.cost).toEqual({
    input: 0.95,
    output: 4,
    cacheRead: 0.16,
    cacheWrite: 0,
  })
})

test("Pi cost calculation prices Kimi usage from the model metadata", () => {
  const usage: Usage = {
    input: 1_000_000,
    output: 1_000_000,
    cacheRead: 1_000_000,
    cacheWrite: 1_000_000,
    totalTokens: 4_000_000,
    cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 },
  }

  expect(calculateCost(DEFAULT_MODELS[0] as Model<Api>, usage)).toEqual({
    input: 0.95,
    output: 4,
    cacheRead: 0.16,
    cacheWrite: 0,
    total: 5.11,
  })
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
  expect((captured?.config as { api: string }).api).toBe("anthropic-messages")
  expect((captured?.config as { baseUrl: string }).baseUrl).toBe(ANTHROPIC_API_BASE_URL)
  expect((captured?.config as { streamSimple?: unknown }).streamSimple).toBeTypeOf("function")
  expect((captured?.config as { oauth: { name: string } }).oauth.name).toBe("Kimi For Coding")
})

test("Kimi model compat disables developer role so system prompts stay system messages", () => {
  expect(DEFAULT_MODELS[0]?.compat?.supportsDeveloperRole).toBe(false)
})
