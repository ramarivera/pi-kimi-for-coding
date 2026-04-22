export const KIMI_CLI_VERSION = "1.37.0"
export const USER_AGENT = `KimiCLI/${KIMI_CLI_VERSION}`

export const OAUTH_HOST = "https://auth.kimi.com"
export const OAUTH_DEVICE_AUTH_URL = `${OAUTH_HOST}/api/oauth/device_authorization`
export const OAUTH_TOKEN_URL = `${OAUTH_HOST}/api/oauth/token`
export const OAUTH_CLIENT_ID = "17e5f671-d194-4dfb-9706-5516cb48c098"
export const OAUTH_SCOPE = "kimi-code"
export const OAUTH_DEVICE_GRANT = "urn:ietf:params:oauth:grant-type:device_code"
export const OAUTH_REFRESH_GRANT = "refresh_token"

export const API_BASE_URL = "https://api.kimi.com/coding/v1"
export const MODEL_ID = "kimi-for-coding"
export const PROVIDER_ID = "kimi-for-coding-oauth"
export const DEFAULT_CONTEXT_WINDOW = 262_144
export const DEFAULT_MAX_TOKENS = 32_768
