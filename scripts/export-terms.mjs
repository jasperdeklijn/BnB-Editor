import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs"
import { resolve } from "node:path"
import ts from "typescript"

function load(file, dependencies = {}) {
  const { outputText } = ts.transpileModule(readFileSync(file, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  })
  const module = { exports: {} }
  Function("module", "exports", "require", outputText)(module, module.exports, (key) => {
    if (!(key in dependencies)) throw new Error(`Unexpected import: ${key}`)
    return dependencies[key]
  })
  return module.exports
}

const platform = load("lib/platform.ts")
const { termsDocument } = load("lib/legal/terms.ts", { "@/lib/platform": platform })
const { TERMS_VERSION, TERMS_DOWNLOAD_PATH } = load("lib/legal/terms-version.ts")
const { renderTermsDownload } = load("lib/legal/terms-download.ts")
const file = resolve(`public${TERMS_DOWNLOAD_PATH}`)
const content = renderTermsDownload(termsDocument, TERMS_VERSION)
if (existsSync(file)) {
  if (readFileSync(file, "utf8").replace(/\r\n/g, "\n") !== content) {
    throw new Error("Do not overwrite an existing terms archive. Publish a new version instead.")
  }
} else {
  mkdirSync(resolve("public/legal/versions"), { recursive: true })
  writeFileSync(file, content)
}
console.log(`Terms archive: ${file}`)
