import assert from "node:assert/strict"
import test from "node:test"
import { loadTypeScript } from "./helpers/load-typescript.mjs"

const { renderFlexPaginaEmail } = loadTypeScript("lib/mail/template.ts")

test("email escapes customer content and preserves personal links and paragraphs", () => {
  const html = renderFlexPaginaEmail({
    title: '<img src=x onerror="alert(1)">',
    text: 'Hello <script>bad()</script> & friends\r\nSecond line\r\n\r\nhttps://example.test/aanvraag?x=1&y=2#access=secret',
  })
  assert.doesNotMatch(html, /<script>|<img src=x/)
  assert.match(html, /&lt;script&gt;bad\(\)&lt;\/script&gt; &amp; friends<br>Second line/)
  assert.match(html, /href="https:\/\/example.test\/aanvraag\?x=1&amp;y=2#access=secret"/)
  assert.match(html, /logo_klein\.png/)
  assert.match(html, /background:#24382d/)
  assert.match(html, /Verzonden via/)
})

test("email actions reject unsafe URLs and escape labels", () => {
  const html = renderFlexPaginaEmail({ action: { label: "<Open>", url: "https://example.test/#access=secret" } })
  assert.match(html, /href="https:\/\/example.test\/#access=secret"/)
  assert.match(html, /&lt;Open&gt;/)
  for (const url of ['javascript:alert(1)', 'data:text/html,hello', '/relative']) {
    assert.doesNotMatch(renderFlexPaginaEmail({ action: { label: "Unsafe action", url } }), /Unsafe action/)
  }
})

test("email chrome follows all supported recipient languages with a Dutch fallback", () => {
  for (const [locale, footer] of [["nl-NL", "Verzonden via"], ["en-GB", "Sent via"], ["de-DE", "Gesendet über"], ["fr-FR", "Envoyé via"]]) {
    const html = renderFlexPaginaEmail({ locale, text: "Message" })
    assert.ok(html.includes(`lang="${locale}"`))
    assert.ok(html.includes(footer))
  }
  assert.match(renderFlexPaginaEmail({ locale: '"><script>' }), /lang="nl-NL"/)
})
