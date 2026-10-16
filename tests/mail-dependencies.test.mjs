import assert from "node:assert/strict"
import test from "node:test"
import nodemailer from "nodemailer"
import { simpleParser } from "mailparser"

test("mail dependencies preserve addresses, Unicode, bodies and attachments through a MIME round trip", async () => {
  // Stream transport composes the message locally without sending email.
  const transport = nodemailer.createTransport({ streamTransport: true, buffer: true, newline: "unix" })
  const info = await transport.sendMail({
    from: { name: "FlexPagina", address: "support@example.test" },
    to: { name: "Renée", address: "guest@example.test" },
    replyTo: "owner@example.test",
    subject: "Reservering – café",
    text: "Je reservering is bevestigd.",
    html: "<p>Je reservering is <strong>bevestigd</strong>.</p>",
    attachments: [{ filename: "bevestiging.txt", content: "Reservering bevestigd", contentType: "text/plain" }],
  })
  const parsed = await simpleParser(info.message)

  assert.equal(parsed.from.value[0].address, "support@example.test")
  assert.equal(parsed.to.value[0].name, "Renée")
  assert.equal(parsed.to.value[0].address, "guest@example.test")
  assert.equal(parsed.replyTo.value[0].address, "owner@example.test")
  assert.equal(parsed.subject, "Reservering – café")
  assert.equal(parsed.text.trim(), "Je reservering is bevestigd.")
  assert.match(parsed.html, /<strong>bevestigd<\/strong>/)
  assert.equal(parsed.attachments.length, 1)
  assert.equal(parsed.attachments[0].filename, "bevestiging.txt")
  assert.equal(parsed.attachments[0].content.toString("utf8"), "Reservering bevestigd")
})

test("HTML-only incoming mail still produces readable plain text", async () => {
  const parsed = await simpleParser([
    "From: guest@example.test",
    "To: support@example.test",
    "Subject: Vraag",
    "Content-Type: text/html; charset=utf-8",
    "",
    '<p>Kan ik <strong>reserveren</strong>?</p><p><a href="https://example.test/contact">Contact</a></p>',
  ].join("\r\n"))

  assert.match(parsed.text, /Kan ik reserveren\?/)
  assert.match(parsed.text, /https:\/\/example\.test\/contact/)
})
