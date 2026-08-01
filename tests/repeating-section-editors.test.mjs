import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import test from "node:test"

const read = (file) => fs.readFileSync(path.resolve(file), "utf8")

test("shared repeating item actions expose accessible reorder, duplicate, and delete controls", () => {
  const actions = read("components/editor/repeating-item-actions.tsx")
  assert.match(actions, /omhoog verplaatsen/)
  assert.match(actions, /omlaag verplaatsen/)
  assert.match(actions, /dupliceren/)
  assert.match(actions, /verwijderen/)
  assert.match(actions, /disabled=\{index === 0\}/)
  assert.match(actions, /disabled=\{index === count - 1\}/)
})

test("rich repeating section editors use the shared controls", () => {
  for (const file of [
    "faq-section.editor.tsx",
    "testimonials-section.editor.tsx",
    "features-section.editor.tsx",
    "pricing-section.editor.tsx",
    "team-section.editor.tsx",
    "footer-section.editor.tsx",
  ]) {
    assert.match(read(`components/sections/${file}`), /RepeatingItemActions/, file)
  }
})

test("FAQ and testimonial editors can add entries and reviews expose rating and image fields", () => {
  const faq = read("components/sections/faq-section.editor.tsx")
  const testimonials = read("components/sections/testimonials-section.editor.tsx")
  assert.match(faq, /Vraag toevoegen/)
  assert.match(testimonials, /Review toevoegen/)
  assert.match(testimonials, /"rating"/)
  assert.match(testimonials, /"image"/)
})

