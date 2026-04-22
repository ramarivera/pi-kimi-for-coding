type MockResponse = {
  status?: number
  body?: unknown
  bodyText?: string
  headers?: Record<string, string>
}

type MockCall = {
  url: string
  method: string
  headers: Record<string, string>
  body?: BodyInit | null
  hasSignal: boolean
}

export function parseForm(body: BodyInit | null | undefined) {
  const text = typeof body === "string" ? body : ""
  return Object.fromEntries(new URLSearchParams(text).entries())
}

export function installFetchMock(responder: (call: MockCall, index: number) => MockResponse | Promise<MockResponse>) {
  const originalFetch = globalThis.fetch
  const calls: MockCall[] = []

  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const request = input instanceof Request ? input : undefined
    const headers = new Headers(request?.headers)
    new Headers(init?.headers).forEach((value, key) => headers.set(key, value))

    const call: MockCall = {
      url: request?.url ?? String(input),
      method: init?.method ?? request?.method ?? "GET",
      headers: Object.fromEntries(headers.entries()),
      body: init?.body,
      hasSignal: Boolean(init?.signal),
    }

    calls.push(call)
    const response = await responder(call, calls.length - 1)
    return new Response(response.bodyText ?? JSON.stringify(response.body ?? {}), {
      status: response.status ?? 200,
      headers: {
        "content-type": "application/json",
        ...(response.headers ?? {}),
      },
    })
  }) as typeof fetch

  return {
    calls,
    restore() {
      globalThis.fetch = originalFetch
    },
  }
}
