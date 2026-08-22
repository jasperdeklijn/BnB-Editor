import assert from "node:assert/strict"
import fs from "node:fs"
import test from "node:test"

const network = fs.readFileSync("components/admin/agent-network.tsx", "utf8")
const dashboard = fs.readFileSync("components/admin/agent-team-dashboard.tsx", "utf8")

test("agent network is connected to the operational dashboard", () => {
  assert.match(dashboard, /<AgentNetwork settings=\{settings\} jobs=\{jobs\} \/>/)
  assert.match(network, /Agent-spinnenweb/)
  assert.match(network, /manager.*centraal/i)
})

test("connections only render for genuine active handoffs", () => {
  assert.match(network, /ACTIVE_JOB_STATUSES/)
  assert.match(network, /support\.activeConnection && <line/)
  assert.match(network, /marketing\.activeConnection && <line/)
  assert.match(network, /operations\.activeConnection && <line/)
  assert.doesNotMatch(network, /animate-pulse|animate-spin/)
})

test("agent nodes remain keyboard accessible and have a mobile list fallback", () => {
  assert.match(network, /type="button"/)
  assert.match(network, /aria-pressed=\{selected\}/)
  assert.match(network, /aria-live="polite"/)
  assert.match(network, /md:hidden/)
  assert.match(network, /hidden h-\[460px\].*md:block/)
})
