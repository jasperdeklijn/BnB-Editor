import { readdirSync } from "node:fs"
import { spawnSync } from "node:child_process"
import { resolve } from "node:path"

const testDirectory = resolve("tests")
const testFiles = readdirSync(testDirectory, { withFileTypes: true })
  .filter((entry) => entry.isFile() && entry.name.endsWith(".test.mjs"))
  .map((entry) => resolve(testDirectory, entry.name))
  .sort()

if (testFiles.length === 0) {
  console.error("No test files found in tests/*.test.mjs")
  process.exit(1)
}

const result = spawnSync(process.execPath, ["--test", ...testFiles], {
  stdio: "inherit",
})

if (result.error) throw result.error
process.exit(result.status ?? 1)
