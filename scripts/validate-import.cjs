/* eslint-disable @typescript-eslint/no-require-imports -- Node CommonJS entry point for the shared TypeScript CLI. */
const fs = require("node:fs")
const { parseImport, normalizeImport, MAX_IMPORT_BYTES } = require("./load-import-module.cjs")("lib/import/schema.ts")
try {
  const file = process.argv[2]
  if (!file) throw new Error("Gebruik: npm run validate-import -- pad/naar/bestand.json")
  if (fs.statSync(file).size > MAX_IMPORT_BYTES) throw new Error("bestand: Maximaal 2 MB.")
  const doc = parseImport(fs.readFileSync(file, "utf8"))
  const design = normalizeImport(doc, require("node:crypto").randomUUID)
  console.log(`Geldig FlexPagina v1-bestand: ${design.sections.length} bewerkbare secties.`)
} catch (error) {
  console.error(error instanceof Error ? error.message : "Validatie mislukt.")
  process.exitCode = 1
}

