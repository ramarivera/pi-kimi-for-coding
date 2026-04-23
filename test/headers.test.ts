import { expect, test } from "bun:test"
import { asciiHeaderValue, createKimiFetchWrapper, getDeviceId, isKimiApiUrl, kimiDeviceModel, kimiHeaders, stripOpenAISDKFingerprintHeaders } from "../src/headers.ts"

test("kimiHeaders emits the expected fingerprint keys", () => {
  const headers = kimiHeaders()
  expect(Object.keys(headers).sort()).toEqual(
    [
      "User-Agent",
      "X-Msh-Device-Id",
      "X-Msh-Device-Model",
      "X-Msh-Device-Name",
      "X-Msh-Os-Version",
      "X-Msh-Platform",
      "X-Msh-Version",
    ].sort(),
  )
})

test("ASCII helper strips non-ascii characters", () => {
  expect(asciiHeaderValue("hést")).toBe("hst")
  expect(asciiHeaderValue("你好")).toBe("unknown")
})

test("device model helper mirrors platform-specific formatting", () => {
  expect(kimiDeviceModel({ system: "Darwin", release: "23.6.0", machine: "arm64", macVersion: "15.4.1" })).toBe(
    "macOS 15.4.1 arm64",
  )
  expect(kimiDeviceModel({ system: "Windows_NT", release: "10.0.26100", machine: "x64" })).toBe("Windows 11 x64")
  expect(kimiDeviceModel({ system: "Linux", release: "6.8.0", machine: "x86_64" })).toBe("Linux 6.8.0 x86_64")
})

test("device id is stable and 32-char lowercase hex", () => {
  const first = getDeviceId()
  const second = getDeviceId()
  expect(first).toMatch(/^[0-9a-f]{32}$/)
  expect(second).toBe(first)
})

test("Kimi URL detection matches auth and API hosts only", () => {
  expect(isKimiApiUrl("https://api.kimi.com/coding/v1/chat/completions")).toBe(true)
  expect(isKimiApiUrl("https://auth.kimi.com/api/oauth/token")).toBe(true)
  expect(isKimiApiUrl("https://api.openai.com/v1/chat/completions")).toBe(false)
})

test("OpenAI SDK fingerprint headers are stripped for Kimi requests", () => {
  const headers = stripOpenAISDKFingerprintHeaders(
    new Headers({
      "x-stainless-lang": "js",
      "x-stainless-runtime": "node",
      "User-Agent": "KimiCLI/1.37.0",
      "X-Msh-Platform": "kimi_cli",
    }),
  )

  expect(headers.get("x-stainless-lang")).toBeNull()
  expect(headers.get("x-stainless-runtime")).toBeNull()
  expect(headers.get("User-Agent")).toBe("KimiCLI/1.37.0")
  expect(headers.get("X-Msh-Platform")).toBe("kimi_cli")
})

test("Kimi fetch wrapper strips OpenAI SDK fingerprint headers only for Kimi hosts", async () => {
  const calls: Array<{ url: string; headers: Record<string, string> }> = []
  const wrapped = createKimiFetchWrapper((async (input: RequestInfo | URL, init?: RequestInit) => {
    calls.push({
      url: input instanceof Request ? input.url : String(input),
      headers: Object.fromEntries(new Headers(init?.headers).entries()),
    })
    return new Response("{}", { status: 200, headers: { "content-type": "application/json" } })
  }) as typeof fetch)

  await wrapped("https://api.kimi.com/coding/v1/chat/completions", {
    headers: {
      "x-stainless-lang": "js",
      "User-Agent": "KimiCLI/1.37.0",
    },
  })
  await wrapped("https://api.openai.com/v1/chat/completions", {
    headers: {
      "x-stainless-lang": "js",
      "User-Agent": "KimiCLI/1.37.0",
    },
  })

  expect(calls[0]?.headers["x-stainless-lang"]).toBeUndefined()
  expect(calls[0]?.headers["user-agent"] ?? calls[0]?.headers["User-Agent"]).toBe("KimiCLI/1.37.0")
  expect(calls[1]?.headers["x-stainless-lang"]).toBe("js")
})
