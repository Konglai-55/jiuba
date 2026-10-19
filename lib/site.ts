import { headers } from 'next/headers'

import { SITE_DOMAINS, siteFromHost, type SiteDomain } from '@/lib/site-host'
export { SITE_DOMAINS, type SiteDomain } from '@/lib/site-host'

export async function currentSite(): Promise<SiteDomain> {
  return siteFromHost((await headers()).get('host') || '')
}

export function visibleSites(record: { sites?: SiteDomain[] }): readonly SiteDomain[] {
  // Records published before the two sites were separated remain on both sites.
  return record.sites ?? SITE_DOMAINS
}
