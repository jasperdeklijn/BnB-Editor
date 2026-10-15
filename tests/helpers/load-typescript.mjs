import { readFileSync } from "node:fs"
import { createRequire } from "node:module"
import path from "node:path"
import ts from "typescript"

const nativeRequire = createRequire(import.meta.url)

// Load pure template modules with their real local dependencies, without Next.js.
export function loadTypeScript(file) {
  const filename = path.resolve(file)
  const module = { exports: {} }
  const js = ts.transpileModule(readFileSync(filename, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
  }).outputText
  Function("module", "exports", "require", js)(module, module.exports, (id) => {
    if (id.startsWith(".")) return loadTypeScript(path.resolve(path.dirname(filename), `${id}.ts`))
    return nativeRequire(id)
  })
  return module.exports
}
