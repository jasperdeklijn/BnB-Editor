type DownloadDocument = {
  title: string
  updatedAt: string
  sections: {
    title: string
    paragraphs?: string[]
    bullets?: string[]
    links?: { href: string; label: string }[]
  }[]
}

// The downloadable archive and the displayed document must contain the same text.
export function renderTermsDownload(document: DownloadDocument, version: string) {
  return [
    document.title,
    `Versie: ${version}`,
    `Laatst bijgewerkt: ${document.updatedAt}`,
    "Let op: dit is een template en moet juridisch gecontroleerd worden voordat het definitief gebruikt wordt.",
    ...document.sections.map((section) => [
      section.title,
      ...(section.paragraphs ?? []),
      ...(section.bullets ?? []).map((bullet) => `- ${bullet}`),
      ...(section.links ?? []).map((link) => `${link.label}: ${link.href}`),
    ].join("\n\n")),
    "",
  ].join("\n\n")
}
