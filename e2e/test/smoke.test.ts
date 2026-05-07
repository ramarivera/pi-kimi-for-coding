import { expect, test } from "bun:test"
import { spawn } from "node:child_process"
import path from "node:path"

const E2E_DIR = path.resolve(import.meta.dir, "..")
const E2E_AGENT_DIR = path.join(E2E_DIR, ".pi", "agent")
const EXTENSION_PATH = path.join(E2E_DIR, "..", "src", "index.ts")

test("e2e: pi loads the local extension and lists the Kimi model", async () => {
  const proc = spawn("pi", [
    "--no-extensions",
    "--extension", EXTENSION_PATH,
    "--list-models",
    "kimi-for-coding",
  ], {
    cwd: E2E_DIR,
    env: { ...process.env, PI_CODING_AGENT_DIR: E2E_AGENT_DIR },
  })

  let stdout = ""
  let stderr = ""

  proc.stdout.on("data", (data: Buffer) => { stdout += data.toString() })
  proc.stderr.on("data", (data: Buffer) => { stderr += data.toString() })

  const code = await new Promise<number>((resolve) => {
    proc.on("close", (c) => resolve(c ?? 1))
  })

  // pi --list-models writes the table to stderr, not stdout
  expect(stderr).toContain("kimi-for-coding")
  expect(stderr).toContain("kimi-for-coding-oauth")
  expect(code).toBe(0)
})

test("e2e: pi -p with the local extension does not immediately fail with 403", async () => {
  // Run pi -p and give it 8 seconds. A 403 auth/header bug surfaces instantly;
  // a healthy session stays alive waiting for the model (which takes ~14s).
  const proc = spawn("pi", [
    "--no-extensions",
    "--extension", EXTENSION_PATH,
    "-p",
    "--no-session",
    "--no-tools",
    "say hi",
  ], {
    cwd: E2E_DIR,
    env: { ...process.env, PI_CODING_AGENT_DIR: E2E_AGENT_DIR },
  })

  let stdout = ""
  let stderr = ""

  proc.stdout.on("data", (data: Buffer) => { stdout += data.toString() })
  proc.stderr.on("data", (data: Buffer) => { stderr += data.toString() })

  // Wait up to 8 seconds — long enough for a 403 to appear, short enough
  // that we don't block the suite for the full model round-trip.
  await new Promise<void>((resolve) => {
    const timer = setTimeout(() => {
      proc.kill()
      resolve()
    }, 8_000)

    proc.on("close", () => {
      clearTimeout(timer)
      resolve()
    })
  })

  const combined = stdout + stderr

  // If the bug is present, the response contains a 403 from Kimi.
  const has403 = combined.includes("403") && combined.includes("Kimi For Coding is currently only available for Coding Agents")
  expect(has403).toBe(false)
}, 15_000)
