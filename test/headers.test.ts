import { expect, test } from "bun:test"
import { asciiHeaderValue, getDeviceId, kimiDeviceModel, kimiHeaders } from "../src/headers.ts"

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
