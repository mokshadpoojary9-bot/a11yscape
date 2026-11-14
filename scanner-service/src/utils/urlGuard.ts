import { lookup } from 'node:dns/promises'
import { isIP } from 'node:net'
import ipaddr from 'ipaddr.js'

export class UrlValidationError extends Error {
  readonly statusCode = 400

  constructor(message: string) {
    super(message)
    this.name = 'UrlValidationError'
  }
}

export interface ResolvedAddress {
  address: string
  family: number
}

export type HostResolver = (hostname: string) => Promise<ResolvedAddress[]>

export interface UrlGuardOptions {
  resolver?: HostResolver
  allowedPorts?: number[]
  /** The HTTP redirect/request guard skips the port allow-list but never IP checks. */
  enforcePort?: boolean
}

const BLOCKED_HOSTNAMES = new Set(['localhost', 'localhost.localdomain', 'ip6-localhost', 'ip6-loopback'])
const BLOCKED_SUFFIXES = ['.localhost', '.local', '.internal', '.home.arpa']

export const defaultResolver: HostResolver = async (hostname) => {
  const addresses = await lookup(hostname, { all: true, verbatim: true })
  return addresses.map((entry) => ({ address: entry.address, family: entry.family }))
}

/**
 * Only globally routable unicast addresses are accepted. ipaddr.js classifies
 * loopback, private, link-local, CGNAT, multicast, reserved and documentation
 * ranges, including IPv4-mapped IPv6 forms.
 */
export function isBlockedAddress(address: string): boolean {
  try {
    const parsed = ipaddr.parse(address)
    if (parsed.kind() === 'ipv6') {
      const v6 = parsed as ipaddr.IPv6
      if (v6.isIPv4MappedAddress()) {
        return isBlockedAddress(v6.toIPv4Address().toString())
      }
    }
    return parsed.range() !== 'unicast'
  } catch {
    return true
  }
}

function normalisedHostname(url: URL): string {
  return url.hostname.replace(/^\[|\]$/g, '').replace(/\.$/, '').toLowerCase()
}

function isBlockedHostname(hostname: string): boolean {
  if (!hostname) return true
  if (BLOCKED_HOSTNAMES.has(hostname)) return true
  return BLOCKED_SUFFIXES.some((suffix) => hostname.endsWith(suffix))
}

function effectivePort(url: URL): number {
  if (url.port) return Number(url.port)
  return url.protocol === 'https:' ? 443 : 80
}

/**
 * Validate a user-submitted target.
 *
 * Resolution happens before the browser is launched. The browser request guard
 * repeats the check for every request so server-side redirects cannot reach an
 * internal address. (DNS rebinding between validation and connection is a
 * residual risk inherent to browser-based collection; the request guard limits
 * but cannot fully remove it.)
 */
export async function validateTargetUrl(raw: unknown, options: UrlGuardOptions = {}): Promise<URL> {
  if (typeof raw !== 'string' || raw.trim().length === 0) {
    throw new UrlValidationError('Enter a valid absolute URL.')
  }
  if (raw.length > 2048) {
    throw new UrlValidationError('The URL is too long to scan.')
  }

  let url: URL
  try {
    url = new URL(raw.trim())
  } catch {
    throw new UrlValidationError('Enter a valid absolute URL including http:// or https://.')
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new UrlValidationError('Only http and https websites can be scanned.')
  }
  if (url.username || url.password) {
    throw new UrlValidationError('URLs containing embedded credentials are not allowed.')
  }

  const hostname = normalisedHostname(url)
  if (isBlockedHostname(hostname)) {
    throw new UrlValidationError('Local, private and reserved network targets are not allowed.')
  }

  const enforcePort = options.enforcePort ?? true
  if (enforcePort) {
    const allowed = options.allowedPorts ?? [80, 443]
    if (!allowed.includes(effectivePort(url))) {
      throw new UrlValidationError(
        `Only standard web ports are allowed (${allowed.join(', ')}).`,
      )
    }
  }

  if (isIP(hostname)) {
    if (isBlockedAddress(hostname)) {
      throw new UrlValidationError('Local, private and reserved network targets are not allowed.')
    }
    return url
  }

  const resolver = options.resolver ?? defaultResolver
  let addresses: ResolvedAddress[]
  try {
    addresses = await resolver(hostname)
  } catch {
    throw new UrlValidationError('The target hostname could not be resolved.')
  }
  if (addresses.length === 0) {
    throw new UrlValidationError('The target hostname could not be resolved.')
  }
  if (addresses.some((entry) => isBlockedAddress(entry.address))) {
    throw new UrlValidationError('The target resolves to a private or reserved network address.')
  }

  return url
}

/**
 * Request-time guard for subresources and redirects. Hostname results are
 * cached by the caller for the duration of one scan.
 */
export async function assertPublicRequestUrl(
  rawUrl: string,
  options: UrlGuardOptions = {},
): Promise<void> {
  let url: URL
  try {
    url = new URL(rawUrl)
  } catch {
    throw new UrlValidationError('Blocked a malformed request URL.')
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return

  const hostname = normalisedHostname(url)
  if (isBlockedHostname(hostname)) {
    throw new UrlValidationError('Blocked a local or private network request.')
  }

  if (isIP(hostname)) {
    if (isBlockedAddress(hostname)) {
      throw new UrlValidationError('Blocked a private network request.')
    }
    return
  }

  const resolver = options.resolver ?? defaultResolver
  const addresses = await resolver(hostname)
  if (addresses.length === 0 || addresses.some((entry) => isBlockedAddress(entry.address))) {
    throw new UrlValidationError('Blocked a request to a private or reserved address.')
  }
}
