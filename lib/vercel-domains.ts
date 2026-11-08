export type VercelDomainResult = {
  success: boolean
  skipped: boolean
  status: number | null
  error: string | null
  provisioning?: { provider_domain: string; provider_project_id: string }
}

export type ProvisionedDomain = {
  domain: string
  provider_domain: string | null
  provider_project_id: string | null
}

export const DOMAIN_PROVISIONING_COLUMNS = "domain, provider_domain, provider_project_id"

/** Evidence is written only after this application successfully creates a domain. */
export function isTrustedProvisionedDomain(domain: ProvisionedDomain) {
  return !validateDomain(domain.domain) && domain.provider_domain === domain.domain
    && Boolean(domain.provider_project_id && domain.provider_project_id === process.env.VERCEL_PROJECT_ID?.trim())
}

type VercelConfig = {
  token: string
  projectId: string
  teamId: string | null
}

export function normalizeDomain(domain: string | null | undefined) {
  return domain
    ? domain
        .trim()
        .replace(/^https?:\/\//i, "")
        .replace(/^www\./i, "")
        .replace(/\/$/, "")
        .replace(/\.$/, "")
        .toLowerCase()
    : null
}

export function validateDomain(domain: string | null) {
  if (!domain) return "Vul een domeinnaam in."
  if (domain.length > 253 || domain.includes("/") || domain.includes(":") || domain.includes(" ")) {
    return "Vul een geldige domeinnaam zonder protocol, pad of poort in."
  }
  if (domain === "localhost" || /^\d{1,3}(\.\d{1,3}){3}$/.test(domain)) {
    return "Een lokaal adres of IP-adres kan niet als domein worden gekoppeld."
  }
  const platformDomain = (process.env.NEXT_PUBLIC_PLATFORM_DOMAIN || "flexpagina.nl")
    .trim()
    .replace(/^www\./i, "")
    .toLowerCase()
  if (domain === platformDomain || domain.endsWith(`.${platformDomain}`)) {
    return "Het platformdomein kan niet als eigen domein worden gekoppeld."
  }

  const labels = domain.split(".")
  if (
    labels.length < 2 ||
    labels.some((label) => !label || label.length > 63 || !/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(label))
  ) {
    return "Vul een geldige domeinnaam in, bijvoorbeeld mijnbedrijf.nl."
  }

  return null
}

function getVercelConfig(): VercelConfig | null {
  const token = process.env.VERCEL_ACCESS_TOKEN?.trim()
  const projectId = process.env.VERCEL_PROJECT_ID?.trim()
  if (!token || !projectId) return null

  return {
    token,
    projectId,
    teamId: process.env.VERCEL_TEAM_ID?.trim() || null,
  }
}

function projectDomainUrl(config: VercelConfig, domain?: string) {
  const path = domain
    ? `/v9/projects/${encodeURIComponent(config.projectId)}/domains/${encodeURIComponent(domain)}`
    : `/v10/projects/${encodeURIComponent(config.projectId)}/domains`
  const url = new URL(path, "https://api.vercel.com")
  if (config.teamId) url.searchParams.set("teamId", config.teamId)
  return url
}

async function readVercelError(response: Response) {
  const data = await response.json().catch(() => null)
  const message = data?.error?.message || data?.message
  return typeof message === "string" ? message : `Vercel gaf status ${response.status}.`
}

export async function addDomainToVercel(domain: string): Promise<VercelDomainResult> {
  const validationError = validateDomain(domain)
  if (validationError) return { success: false, skipped: false, status: null, error: validationError }
  const config = getVercelConfig()
  if (!config) {
    return {
      success: false,
      skipped: true,
      status: null,
      error: "Vercel-domeinbeheer is niet geconfigureerd.",
    }
  }

  try {
    const response = await fetch(projectDomainUrl(config), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name: domain }),
    })

    if (response.ok) {
      const created = await response.json().catch(() => null)
      if (created?.name !== domain || created?.projectId !== config.projectId) {
        return { success: false, skipped: false, status: 502, error: "De domeintoewijzing kon niet veilig worden bevestigd. Neem contact op met support." }
      }
      return { success: true, skipped: false, status: response.status, error: null,
        provisioning: { provider_domain: domain, provider_project_id: config.projectId } }
    }

    // An existing project domain is not proof that this customer provisioned it.
    // A lost response requires support reconciliation instead of adopting it.

    return {
      success: false,
      skipped: false,
      status: response.status,
      error: await readVercelError(response),
    }
  } catch (error) {
    return {
      success: false,
      skipped: false,
      status: null,
      error: error instanceof Error ? error.message : "Vercel kon niet worden bereikt.",
    }
  }
}

export async function removeDomainFromVercel(record: ProvisionedDomain): Promise<VercelDomainResult> {
  const config = getVercelConfig()
  if (!isTrustedProvisionedDomain(record)) {
    return { success: false, skipped: false, status: 409,
      error: "De oorspronkelijke domeintoewijzing moet eerst door support worden gecontroleerd. Het domein is niet verwijderd." }
  }
  if (!config) {
    return {
      success: false,
      skipped: true,
      status: null,
      error: "Vercel-domeinbeheer is niet geconfigureerd.",
    }
  }

  try {
    const response = await fetch(projectDomainUrl(config, record.domain), {
      method: "DELETE",
      headers: { Authorization: `Bearer ${config.token}` },
    })

    if (response.ok || response.status === 404) {
      return { success: true, skipped: false, status: response.status, error: null }
    }

    return {
      success: false,
      skipped: false,
      status: response.status,
      error: await readVercelError(response),
    }
  } catch (error) {
    return {
      success: false,
      skipped: false,
      status: null,
      error: error instanceof Error ? error.message : "Vercel kon niet worden bereikt.",
    }
  }
}
