import { expect, test } from "bun:test"
import {
  API_BASE_URL,
  KIMI_CLI_VERSION,
  MODEL_ID,
  OAUTH_CLIENT_ID,
  OAUTH_DEVICE_AUTH_URL,
  OAUTH_SCOPE,
  OAUTH_TOKEN_URL,
  PROVIDER_ID,
  USER_AGENT,
} from "../src/constants.ts"

test("Kimi constants match the official coding endpoints", () => {
  expect(API_BASE_URL).toBe("https://api.kimi.com/coding/v1")
  expect(OAUTH_DEVICE_AUTH_URL).toBe("https://auth.kimi.com/api/oauth/device_authorization")
  expect(OAUTH_TOKEN_URL).toBe("https://auth.kimi.com/api/oauth/token")
  expect(OAUTH_CLIENT_ID).toBe("17e5f671-d194-4dfb-9706-5516cb48c098")
  expect(OAUTH_SCOPE).toBe("kimi-code")
})

test("provider and model ids are stable", () => {
  expect(PROVIDER_ID).toBe("kimi-for-coding-oauth")
  expect(MODEL_ID).toBe("kimi-for-coding")
})

test("user agent mirrors the Kimi CLI version", () => {
  expect(KIMI_CLI_VERSION).toMatch(/^\d+\.\d+\.\d+$/)
  expect(USER_AGENT).toBe(`KimiCLI/${KIMI_CLI_VERSION}`)
})
