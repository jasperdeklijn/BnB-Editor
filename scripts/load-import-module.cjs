/* eslint-disable @typescript-eslint/no-require-imports -- Node CommonJS entry point for the shared TypeScript CLI. */
// Load the actual TypeScript contract for the CLI/tests without a second schema.
const fs = require("node:fs")
const path = require("node:path")
const ts = require("typescript")
const cache = new Map()
module.exports = function load(file) {
  const filename = path.resolve(file)
  if (cache.has(filename)) return cache.get(filename).exports
  const source = fs.readFileSync(filename, "utf8")
  const compiled = ts.transpileModule(source, { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true,
  }, fileName: filename })
  const mod = { exports: {} }
  cache.set(filename, mod)
  Function("module", "exports", "require", compiled.outputText)(mod, mod.exports, (id) => {
    if (id === "server-only") return {}
    if (id.startsWith(".")) return module.exports(path.resolve(path.dirname(filename), id + ".ts"))
    if (id.startsWith("@/")) return module.exports(path.resolve(id.slice(2) + ".ts"))
    return require(id)
  })
  return mod.exports
}

