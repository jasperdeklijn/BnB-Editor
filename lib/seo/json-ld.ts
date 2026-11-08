/** JSON embedded in HTML must not contain a literal closing script delimiter. */
export function serializeJsonLd(value: unknown): string {
  return JSON.stringify(value).replace(/</g, "\\u003c")
}
