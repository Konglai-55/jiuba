export const SITE_DOMAINS = ['98xb.net', '108xb.com'] as const
export type SiteDomain = (typeof SITE_DOMAINS)[number]

export function siteFromHost(host: string): SiteDomain {
  const hostname = host.toLowerCase().split(':')[0].replace(/^www\./, '')
  return hostname === '108xb.com' ? '108xb.com' : '98xb.net'
}

