import type { ExtensionAPI } from "@mariozechner/pi-coding-agent"
import type { OAuthCredentials } from "@mariozechner/pi-ai"
import { API_BASE_URL, PROVIDER_ID } from "./constants.ts"
import { DEFAULT_MODELS, modifyKimiModelsForCredentials } from "./models.ts"
import { loginWithDeviceFlow, refreshKimiCredentials } from "./oauth.ts"
import { streamKimiForCoding } from "./stream.ts"

export { DEFAULT_MODELS, KIMI_K2_6_COST, modifyKimiModelsForCredentials } from "./models.ts"
export { applyKimiPayload, normalizeReasoningLevel } from "./payload.ts"
export { streamKimiForCoding } from "./stream.ts"

export default function extension(pi: ExtensionAPI) {
  pi.registerProvider(PROVIDER_ID, {
    baseUrl: API_BASE_URL,
    api: "openai-completions",
    models: DEFAULT_MODELS,
    oauth: {
      name: "Kimi For Coding",
      login: loginWithDeviceFlow,
      refreshToken: refreshKimiCredentials,
      getApiKey: (credentials: OAuthCredentials) => credentials.access,
      modifyModels: (models, credentials) => modifyKimiModelsForCredentials(models as never, credentials),
    },
    streamSimple: streamKimiForCoding,
  })
}
