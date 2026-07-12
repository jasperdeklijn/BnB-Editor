import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import test from "node:test"
import ts from "typescript"
import process from "node:process"

const sourcePath = path.resolve("lib/plan-enforcement.ts")
const source = fs.readFileSync(sourcePath, "utf8")
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  fileName: sourcePath,
})
const module = { exports: {} }
Function("module", "exports", "require", compiled.outputText)(module, module.exports, () => {
  throw new Error("plan-enforcement.ts must remain runtime dependency-free")
})

const { getPlanEnforcementMode, shouldEnforcePlanEntitlements } = module.exports
const originalMode = process.env.PLAN_ENFORCEMENT_MODE

test.afterEach(() => {
  if (originalMode === undefined) delete process.env.PLAN_ENFORCEMENT_MODE
  else process.env.PLAN_ENFORCEMENT_MODE = originalMode
})

test("defaults to hard enforcement", () => {
  delete process.env.PLAN_ENFORCEMENT_MODE
  assert.equal(getPlanEnforcementMode(), "enforce")
  assert.equal(shouldEnforcePlanEntitlements(), true)
})

test("warn mode records violations without blocking rollout", () => {
  process.env.PLAN_ENFORCEMENT_MODE = "warn"
  assert.equal(getPlanEnforcementMode(), "warn")
  assert.equal(shouldEnforcePlanEntitlements(), false)
})

test("off is an explicit rollback mode and invalid values fail closed", () => {
  process.env.PLAN_ENFORCEMENT_MODE = "off"
  assert.equal(shouldEnforcePlanEntitlements(), false)
  process.env.PLAN_ENFORCEMENT_MODE = "invalid"
  assert.equal(getPlanEnforcementMode(), "enforce")
})
