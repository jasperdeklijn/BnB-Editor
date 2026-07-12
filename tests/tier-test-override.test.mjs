import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import test from "node:test"
import ts from "typescript"
import crypto from "node:crypto"
import process from "node:process"

const sourcePath = path.resolve("lib/tier-test-override.ts")
const source = fs.readFileSync(sourcePath, "utf8")
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  fileName: sourcePath,
})
const module = { exports: {} }
Function("module", "exports", "require", compiled.outputText)(module, module.exports, (specifier) => {
  if (specifier === "server-only") return {}
  if (specifier === "node:crypto") return crypto
  throw new Error(`Unexpected runtime dependency: ${specifier}`)
})

const {
  createTierTestCookieValue,
  isTierTestSwitchEnabled,
  readTierTestPlan,
  TIER_TEST_COOKIE,
} = module.exports

const originalNodeEnv = process.env.NODE_ENV
const originalFlag = process.env.ENABLE_TIER_TEST_SWITCH

test.afterEach(() => {
  if (originalNodeEnv === undefined) delete process.env.NODE_ENV
  else process.env.NODE_ENV = originalNodeEnv
  if (originalFlag === undefined) delete process.env.ENABLE_TIER_TEST_SWITCH
  else process.env.ENABLE_TIER_TEST_SWITCH = originalFlag
})

test("accepts a signed tier override in development", () => {
  process.env.NODE_ENV = "development"
  const value = createTierTestCookieValue("gold")
  assert.equal(readTierTestPlan({ get: (name) => name === TIER_TEST_COOKIE ? { value } : undefined }), "gold")
})

test("rejects a browser-tampered tier override", () => {
  process.env.NODE_ENV = "development"
  const value = createTierTestCookieValue("bronze").replace("bronze", "gold")
  assert.equal(readTierTestPlan({ get: () => ({ value }) }), null)
})

test("production disables the switch even when the environment flag is set", () => {
  process.env.NODE_ENV = "production"
  process.env.ENABLE_TIER_TEST_SWITCH = "true"
  const value = createTierTestCookieValue("gold")
  assert.equal(isTierTestSwitchEnabled(), false)
  assert.equal(readTierTestPlan({ get: () => ({ value }) }), null)
})
