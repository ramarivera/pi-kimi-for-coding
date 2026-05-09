import type { ExtensionAPI } from "@earendil-works/pi-coding-agent"
import type { Api, Model, OAuthCredentials } from "@earendil-works/pi-ai"
import { PROVIDER_ID } from "./constants.ts"
import { loadKimiForCodingConfig } from "./config.ts"
import { createKimiModels, DEFAULT_MODELS, modifyKimiModelsForCredentials } from "./models.ts"
import { loginWithDeviceFlow, refreshKimiCredentials } from "./oauth.ts"
import { streamKimiForCoding } from "./stream.ts"

export { DEFAULT_MODELS, KIMI_K2_6_COST, modifyKimiModelsForCredentials } from "./models.ts"
export {
  DEFAULT_CONFIG,
  DEFAULT_CONFIG_PATH,
  loadKimiForCodingConfig,
  parseKimiForCodingConfig,
  resolveKimiForCodingConfig,
  type KimiForCodingConfig,
} from "./config.ts"
export { applyKimiPayload, normalizeReasoningLevel } from "./payload.ts"
export { streamKimiForCoding } from "./stream.ts"

export default function extension(pi: ExtensionAPI) {
  const config = loadKimiForCodingConfig()
  const provider = {
    baseUrl: config.baseUrl,
    api: config.api,
    models: createKimiModels(config),
    oauth: {
      name: "Kimi For Coding",
      login: loginWithDeviceFlow,
      refreshToken: refreshKimiCredentials,
      getApiKey: (credentials: OAuthCredentials) => credentials.access,
      modifyModels: (models: Array<Model<Api>>, credentials: OAuthCredentials) =>
        modifyKimiModelsForCredentials(models, credentials),
    },
  }

  pi.registerProvider(
    PROVIDER_ID,
    {
      ...provider,
      streamSimple: streamKimiForCoding,
    },
  )
}
