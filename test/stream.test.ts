import { expect, test } from "bun:test"
import { streamKimiForCoding } from "../src/stream.ts"
import { MODEL_ID, PROVIDER_ID } from "../src/constants.ts"

function createKimiTestModel() {
  return {
    id: MODEL_ID,
    api: "openai-completions" as const,
    provider: PROVIDER_ID,
    baseUrl: "https://api.kimi.com/coding/v1",
    reasoning: true,
    input: ["text", "image"] as const,
    cost: { input: 0.95, output: 4, cacheRead: 0.16, cacheWrite: 0 },
    contextWindow: 262144,
    maxTokens: 32768,
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
    wireModelId: "k2p5",
  }
}

function kimiSse(content = "hi") {
  return `data: {"id":"test","object":"chat.completion.chunk","model":"${MODEL_ID}","choices":[{"delta":{"content":"${content}"},"index":0,"finish_reason":"stop"}]}

data: [DONE]

`
}

async function consumeStream(stream: ReturnType<typeof streamKimiForCoding>) {
  for await (const _event of stream) {
    /* consume events */
  }
  await stream.result()
}

async function waitFor(condition: () => boolean, timeoutMs = 250) {
  const deadline = Date.now() + timeoutMs
  while (!condition()) {
    if (Date.now() >= deadline) break
    await new Promise((resolve) => setTimeout(resolve, 1))
  }
}

test("streamKimiForCoding sends Kimi headers and strips OpenAI SDK fingerprint headers", async () => {
  const originalFetch = globalThis.fetch
  const calls: Array<{ url: string; headers: Record<string, string>; body?: string }> = []

  // Mock globalThis.fetch to capture the actual HTTP request that the OpenAI SDK makes.
  const mockFetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const request = input instanceof Request ? input : undefined
    const headers = new Headers(request?.headers)
    new Headers(init?.headers).forEach((value, key) => headers.set(key, value))

    calls.push({
      url: request?.url ?? String(input),
      headers: Object.fromEntries(headers.entries()),
      body: typeof init?.body === "string" ? init.body : undefined,
    })

    // Return a minimal SSE stream that the OpenAI SDK can parse.
    return new Response(kimiSse(), {
      status: 200,
      headers: {
        "content-type": "text/event-stream",
        "cache-control": "no-cache",
      },
    })
  }) as typeof fetch
  globalThis.fetch = mockFetch

  try {
    const stream = streamKimiForCoding(createKimiTestModel() as any, {
      messages: [{ role: "user", content: "hi" }],
    } as any, {
      apiKey: "test-token",
      sessionId: "sess-1",
      reasoning: "medium",
    })

    // Consume the stream so the async IIFE inside streamOpenAICompletions runs to completion.
    await consumeStream(stream)
    await waitFor(() => globalThis.fetch === mockFetch)
    expect(globalThis.fetch).toBe(mockFetch)

    // Verify the request was made.
    expect(calls.length).toBeGreaterThanOrEqual(1)

    // Find the chat completions request (ignore any discovery calls).
    const chatCall = calls.find((c) => c.url.includes("/chat/completions"))
    expect(chatCall).toBeDefined()

    // Kimi fingerprint headers must be present.
    expect(chatCall!.headers["user-agent"]).toBe("KimiCLI/1.37.0")
    expect(chatCall!.headers["x-msh-platform"]).toBe("kimi_cli")
    expect(chatCall!.headers["x-msh-device-id"]).toMatch(/^[0-9a-f]{32}$/)
    expect(chatCall!.headers["x-msh-version"]).toBeDefined()
    expect(chatCall!.headers["x-msh-device-model"]).toBeDefined()
    expect(chatCall!.headers["x-msh-device-name"]).toBeDefined()
    expect(chatCall!.headers["x-msh-os-version"]).toBeDefined()

    // OpenAI SDK fingerprint headers must be stripped by createKimiFetchWrapper.
    expect(chatCall!.headers["x-stainless-lang"]).toBeUndefined()
    expect(chatCall!.headers["x-stainless-runtime"]).toBeUndefined()
    expect(chatCall!.headers["x-stainless-arch"]).toBeUndefined()
    expect(chatCall!.headers["x-stainless-os"]).toBeUndefined()
    expect(chatCall!.headers["x-stainless-package-version"]).toBeUndefined()
    expect(chatCall!.headers["x-stainless-retry-count"]).toBeUndefined()
    expect(chatCall!.headers["x-stainless-runtime-version"]).toBeUndefined()

    // Body should have the correct model and payload fields injected by applyKimiPayload.
    const body = JSON.parse(chatCall!.body ?? "{}")
    expect(body.model).toBe("k2p5")
    expect(body.prompt_cache_key).toBe("sess-1")
    expect(body.reasoning_effort).toBe("medium")
    expect(body.thinking).toEqual({ type: "enabled" })
  } finally {
    globalThis.fetch = originalFetch
  }
})

test("streamKimiForCoding keeps the Kimi fetch wrapper installed until concurrent streams finish", async () => {
  const originalFetch = globalThis.fetch
  let firstRequestReleased!: () => void
  const firstRequestCanFinish = new Promise<void>((resolve) => {
    firstRequestReleased = resolve
  })
  const requestOrder: string[] = []
  const wrappedRequestHeaders: Array<Record<string, string>> = []

  const mockFetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const request = input instanceof Request ? input : undefined
    const headers = new Headers(request?.headers)
    new Headers(init?.headers).forEach((value, key) => headers.set(key, value))
    wrappedRequestHeaders.push(Object.fromEntries(headers.entries()))

    const body = typeof init?.body === "string" ? JSON.parse(init.body) as { prompt_cache_key?: string } : {}
    const sessionId = body.prompt_cache_key ?? "unknown"
    requestOrder.push(sessionId)

    if (sessionId === "first") {
      await firstRequestCanFinish
    }

    return new Response(kimiSse(sessionId), {
      status: 200,
      headers: {
        "content-type": "text/event-stream",
        "cache-control": "no-cache",
      },
    })
  }) as typeof fetch
  globalThis.fetch = mockFetch

  try {
    const first = streamKimiForCoding(createKimiTestModel() as any, {
      messages: [{ role: "user", content: "first" }],
    } as any, {
      apiKey: "test-token",
      sessionId: "first",
      reasoning: "medium",
    })

    await new Promise((resolve) => setTimeout(resolve, 0))

    const second = streamKimiForCoding(createKimiTestModel() as any, {
      messages: [{ role: "user", content: "second" }],
    } as any, {
      apiKey: "test-token",
      sessionId: "second",
      reasoning: "medium",
    })

    await consumeStream(second)

    // The second stream finishing first must not restore global fetch while the
    // first stream is still active, otherwise Kimi requests can leak OpenAI SDK
    // fingerprint headers or bypass the wrapper entirely.
    expect(globalThis.fetch).not.toBe(originalFetch)

    firstRequestReleased()
    await consumeStream(first)

    expect(requestOrder).toEqual(["first", "second"])
    await waitFor(() => globalThis.fetch === mockFetch)
    expect(globalThis.fetch).toBe(mockFetch)
    expect(wrappedRequestHeaders).toHaveLength(2)
    for (const headers of wrappedRequestHeaders) {
      expect(headers["user-agent"]).toBe("KimiCLI/1.37.0")
      expect(headers["x-stainless-lang"]).toBeUndefined()
    }
  } finally {
    firstRequestReleased?.()
    globalThis.fetch = originalFetch
  }
})
