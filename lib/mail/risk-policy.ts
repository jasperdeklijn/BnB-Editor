const HIGH_RISK_PATTERNS = [
  /\b(factuur|betaling|incasso|refund|terugbetaling|prijsafspraak)\b/i,
  /\b(opzeggen|annuleren|contract|juridisch|advocaat|aansprakelijk)\b/i,
  /\b(wachtwoord|inlog|gehackt|hack|beveiligingslek|datalek|misbruik|fraude)\b/i,
  /\b(bsn|paspoort|identiteitsbewijs|creditcard)\b/i,
]

export function assessMailRisk(subject: string, body: string) {
  const content = `${subject}\n${body}`.slice(0, 40_000)
  const matched = HIGH_RISK_PATTERNS.filter((pattern) => pattern.test(content))
  return {
    requiresReview: matched.length > 0,
    reasons: matched.length > 0 ? ["Dit onderwerp kan financiële, juridische, privacy- of beveiligingsgevolgen hebben."] : [],
  }
}

export function isAutomatedMail(headers: Record<string, string>, fromAddress: string) {
  const autoSubmitted = headers["auto-submitted"]?.toLowerCase()
  const precedence = headers.precedence?.toLowerCase()
  return Boolean(
    (autoSubmitted && autoSubmitted !== "no") ||
    ["bulk", "junk", "list"].includes(precedence) ||
    /(^|[+._-])(no-?reply|mailer-daemon)(@|[+._-])/i.test(fromAddress),
  )
}
