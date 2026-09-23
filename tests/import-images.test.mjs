import test from "node:test"
import assert from "node:assert/strict"
import { createRequire } from "node:module"
const require = createRequire(import.meta.url)
const sharp = require("sharp")
const { isPublicAddress, resolveImageDestination, fetchRemoteImage, decodeImportImage } = require("../scripts/load-import-module.cjs")("lib/import/remote-images.ts")
test("private, metadata, special IPv4 and nonpublic IPv6 ranges are blocked", () => {
  for (const address of ["127.0.0.1", "0.0.0.0", "10.1.1.1", "100.100.100.200", "169.254.169.254", "172.16.0.1", "192.168.1.1", "192.0.2.1", "198.19.0.1", "224.0.0.1", "255.255.255.255", "::", "::1", "fe80::1", "fc00::1", "::ffff:127.0.0.1", "::ffff:7f00:1", "2002:7f00:1::", "2001:db8::1", "3fff::1"]) {
    assert.equal(isPublicAddress(address), false, address)
  }
  for (const address of ["8.8.8.8", "93.184.216.34", "2606:4700:4700::1111"]) assert.equal(isPublicAddress(address), true)
})
test("all DNS answers must be public and encoded IP/local hosts are rejected", async () => {
  await assert.rejects(resolveImageDestination(new URL("https://example.com/a.png"), async () => [{ address: "8.8.8.8", family: 4 }, { address: "127.0.0.1", family: 4 }]))
  for (const url of ["https://localhost/a", "https://foo.local/a", "https://2130706433/a", "https://0x7f000001/a", "https://[::ffff:7f00:1]/a"]) {
    await assert.rejects(resolveImageDestination(new URL(url)))
  }
  assert.deepEqual(await resolveImageDestination(new URL("https://example.com/a"), async () => [{ address: "8.8.8.8", family: 4 }]), { address: "8.8.8.8", family: 4 })
})
test("redirect loops and protocol downgrade fail; relative redirects resolve", async () => {
  const signal = new AbortController().signal
  let calls = 0
  await assert.rejects(fetchRemoteImage("https://example.com/a", signal, async () => { calls++; return { location: "/again" } }), /omleidingen/)
  assert.equal(calls, 4)
  await assert.rejects(fetchRemoteImage("https://example.com/a", signal, async () => ({ location: "http://example.com/b" })), /HTTPS/)
  let last
  const bytes = await fetchRemoteImage("https://example.com/a", signal, async (url) => {
    last = url.href
    return url.pathname === "/a" ? { location: "/b" } : { bytes: Buffer.from("image") }
  })
  assert.equal(last, "https://example.com/b")
  assert.equal(bytes.toString(), "image")
})
test("real decoding rejects disguised/truncated files and produces managed WebP with exact thumbnail dimensions", async () => {
  await assert.rejects(decodeImportImage(Buffer.from("<svg><script/></svg>")))
  const png = await sharp({ create: { width: 120, height: 80, channels: 3, background: "#385344" } }).png().toBuffer()
  await assert.rejects(decodeImportImage(png.subarray(0, 30)))
  const result = await decodeImportImage(png)
  const image = await sharp(result.original).metadata()
  const preview = await sharp(result.thumbnail).metadata()
  assert.equal(image.format, "webp")
  assert.equal(preview.width, 480)
  assert.equal(preview.height, 320)
})


test("a redirect destination is subject to the same DNS/IP restrictions", async () => {
  await assert.rejects(fetchRemoteImage("https://example.com/a", new AbortController().signal, async (url) => {
    await resolveImageDestination(url, async () => [{ address: "8.8.8.8", family: 4 }])
    return { location: "https://169.254.169.254/latest" }
  }), /Privé/)
})
