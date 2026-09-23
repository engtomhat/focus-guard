// Domain normalization and matching (pure, no browser APIs)

export type NormalizeResult =
  | { ok: true; domain: string }
  | { ok: false; error: string }

/**
 * Whether a parsed hostname is a real one: dot-separated labels of letters,
 * digits, "-" and "_", or a bracketed IPv6 address. Checked explicitly because
 * browsers' URL parsers differ: Chrome turns "not a domain" into the hostname
 * "not%20a%20domain" instead of rejecting it.
 */
export function isValidHostname(hostname: string): boolean {
  return /^[a-z0-9_-]+(\.[a-z0-9_-]+)*$/.test(hostname) || /^\[[0-9a-f:.]+\]$/.test(hostname)
}

/** Lowercase and drop trailing dots, the way hostnames should be compared ("Example.COM." -> "example.com") */
export function normalizeHostname(hostname: string): string {
  return hostname.toLowerCase().replace(/\.+$/, "")
}

/**
 * Turn whatever the user typed into the hostname form the browser reports:
 * "https://www.Facebook.com/feed" -> "www.facebook.com", "*.reddit.com" -> "reddit.com",
 * "bücher.de" -> "xn--bcher-kva.de", "localhost:3000" -> "localhost".
 */
export function normalizeDomain(input: string): NormalizeResult {
  const trimmed = input.trim()
  if (!trimmed) {
    return { ok: false, error: "Enter a domain, e.g. example.com" }
  }

  const withoutScheme = trimmed.replace(/^[a-z][a-z0-9+.-]*:\/\//i, "")
  const withoutWildcard = withoutScheme.replace(/^\*\./, "")

  let hostname: string
  try {
    hostname = new URL(`http://${withoutWildcard}`).hostname
  } catch {
    return { ok: false, error: `"${trimmed}" is not a valid domain` }
  }

  const domain = normalizeHostname(hostname)
  if (!isValidHostname(domain)) {
    return { ok: false, error: `"${trimmed}" is not a valid domain` }
  }
  return { ok: true, domain }
}

/** True if the hostname is a blocked domain or one of its subdomains */
export function isHostBlocked(hostname: string, blockedDomains: readonly string[]): boolean {
  const host = normalizeHostname(hostname)
  return blockedDomains.some(domain => host === domain || host.endsWith(`.${domain}`))
}

/** The blocked domain that already covers `domain` (itself or a parent), if any */
export function findCoveringDomain(domain: string, blockedDomains: readonly string[]): string | undefined {
  return blockedDomains.find(blocked => domain === blocked || domain.endsWith(`.${blocked}`))
}
