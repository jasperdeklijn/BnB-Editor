import fs from "node:fs"
import { createRequire } from "node:module"
import ts from "typescript"

const require = createRequire(import.meta.url)
export function load(file, imports = {}, env = {}) {
  const compiled = ts.transpileModule(fs.readFileSync(file, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
  }).outputText
  const module = { exports: {} }
  Function("module", "exports", "require", "process", compiled)(module, module.exports,
    (name) => name === "server-only" ? {} : name in imports ? imports[name] : require(name), { env })
  return module.exports
}
