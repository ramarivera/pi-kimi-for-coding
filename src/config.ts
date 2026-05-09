import { existsSync, readFileSync } from "node:fs"
import { homedir } from "node:os"
import { join } from "node:path"
import { ANTHROPIC_API_BASE_URL, DEFAULT_PROTOCOL, OPENAI_API_BASE_URL } from "./constants.ts"

export type KimiProtocol = "anthropic" | "openai"

export interface KimiForCodingConfig {
  protocol: KimiProtocol
}

export interface ResolvedKimiForCodingConfig extends KimiForCodingConfig {
  api: "anthropic-messages" | "openai-completions"
  baseUrl: string
  configPath: string
}

export const DEFAULT_CONFIG_PATH = join(homedir(), ".pi", "agent", "pi-kimi-for-coding.jsonc")

export const DEFAULT_CONFIG: KimiForCodingConfig = {
  // Kimi Code docs list both protocols:
  // https://www.kimi.com/code/docs/en/
  // "Anthropic Compatible" is `https://api.kimi.com/coding/`.
  // Kimi support told us on 2026-05-09 that OpenAI-compatible Kimi Code
  // is whitelist-restricted, so default to the Anthropic-compatible path.
  protocol: DEFAULT_PROTOCOL,
}

function stripJsonComments(input: string) {
  let output = ""
  let inString = false
  let escaped = false
  let inLineComment = false
  let inBlockComment = false

  for (let index = 0; index < input.length; index++) {
    const char = input[index]
    const next = input[index + 1]

    if (inLineComment) {
      if (char === "\n" || char === "\r") {
        inLineComment = false
        output += char
      }
      continue
    }

    if (inBlockComment) {
      if (char === "*" && next === "/") {
        inBlockComment = false
        index++
      }
      continue
    }

    if (inString) {
      output += char
      if (escaped) {
        escaped = false
      } else if (char === "\\") {
        escaped = true
      } else if (char === '"') {
        inString = false
      }
      continue
    }

    if (char === '"') {
      inString = true
      output += char
      continue
    }

    if (char === "/" && next === "/") {
      inLineComment = true
      index++
      continue
    }

    if (char === "/" && next === "*") {
      inBlockComment = true
      index++
      continue
    }

    output += char
  }

  return output
}

export function parseKimiForCodingConfig(input: string): KimiForCodingConfig {
  const parsed = JSON.parse(stripJsonComments(input)) as Partial<KimiForCodingConfig>
  if (parsed.protocol !== "anthropic" && parsed.protocol !== "openai") {
    throw new Error('pi-kimi-for-coding config protocol must be "anthropic" or "openai"')
  }
  return { protocol: parsed.protocol }
}

export function resolveKimiForCodingConfig(config: KimiForCodingConfig, configPath = DEFAULT_CONFIG_PATH) {
  return {
    ...config,
    api: config.protocol === "anthropic" ? "anthropic-messages" : "openai-completions",
    baseUrl: config.protocol === "anthropic" ? ANTHROPIC_API_BASE_URL : OPENAI_API_BASE_URL,
    configPath,
  } satisfies ResolvedKimiForCodingConfig
}

export function loadKimiForCodingConfig(configPath = process.env.PI_KIMI_FOR_CODING_CONFIG ?? DEFAULT_CONFIG_PATH) {
  if (!existsSync(configPath)) {
    return resolveKimiForCodingConfig(DEFAULT_CONFIG, configPath)
  }

  return resolveKimiForCodingConfig(parseKimiForCodingConfig(readFileSync(configPath, "utf8")), configPath)
}
