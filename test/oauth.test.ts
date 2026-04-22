import { afterEach, expect, test } from "bun:test"
import { OAUTH_CLIENT_ID, OAUTH_DEVICE_AUTH_URL, OAUTH_SCOPE, OAUTH_TOKEN_URL } from "../src/constants.ts"
import { listModels, pollDeviceToken, refreshToken, startDeviceAuth } from "../src/oauth.ts"
import { installFetchMock, parseForm } from "./fetch-mock.ts"

let mock: ReturnType<typeof installFetchMock> | undefined

afterEach(() => {
  mock?.restore()
  mock = undefined
})

test("startDeviceAuth posts client_id and scope to the device endpoint", async () => {
  mock = installFetchMock(() => ({
    body: {
      device_code: "dc",
      user_code: "USER-1234",
      verification_uri: "https://auth.kimi.com/device",
      verification_uri_complete: "https://auth.kimi.com/device?u=USER-1234",
      expires_in: 600,
      interval: 5,
    },
  }))

  const device = await startDeviceAuth()

  expect(device.user_code).toBe("USER-1234")
  expect(mock.calls[0]?.url).toBe(OAUTH_DEVICE_AUTH_URL)
  expect(parseForm(mock.calls[0]?.body)).toEqual({
    client_id: OAUTH_CLIENT_ID,
    scope: OAUTH_SCOPE,
  })
})

test("refreshToken posts refresh_token grant data", async () => {
  mock = installFetchMock(() => ({
    body: { access_token: "a2", refresh_token: "r2", token_type: "Bearer", expires_in: 900 },
  }))

  const tokens = await refreshToken("r1")

  expect(tokens.access_token).toBe("a2")
  expect(mock.calls[0]?.url).toBe(OAUTH_TOKEN_URL)
  expect(parseForm(mock.calls[0]?.body)).toMatchObject({
    client_id: OAUTH_CLIENT_ID,
    refresh_token: "r1",
  })
})

test("pollDeviceToken retries authorization_pending and then succeeds", async () => {
  mock = installFetchMock((_, index) => {
    if (index === 0) return { status: 400, body: { error: "authorization_pending" } }
    return { body: { access_token: "A", refresh_token: "R", token_type: "Bearer", expires_in: 900 } }
  })

  const token = await pollDeviceToken({
    device_code: "dc",
    user_code: "U",
    verification_uri: "https://auth.kimi.com/device",
    expires_in: 10,
    interval: 1,
  })

  expect(token.access_token).toBe("A")
  expect(mock.calls).toHaveLength(2)
})

test("listModels returns the server-provided model list", async () => {
  mock = installFetchMock(() => ({
    body: {
      data: [{ id: "kimi-for-coding", display_name: "Kimi For Coding", context_length: 262144 }],
    },
  }))

  const models = await listModels("token-1")

  expect(models).toEqual([{ id: "kimi-for-coding", display_name: "Kimi For Coding", context_length: 262144 }])
})
