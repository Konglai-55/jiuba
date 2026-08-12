const publicBaseUrl = process.env.S3_PUBLIC_BASE_URL || process.env.CDN_BASE_URL

export function getPublicFileUrl(pathname: string) {
  if (!publicBaseUrl) {
    return null
  }

  const encodedPath = pathname
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/')

  return `${publicBaseUrl.replace(/\/+$/, '')}/${encodedPath}`
}

export function resolveStoredFileUrl(url: string | null) {
  if (!url || !publicBaseUrl) {
    return url
  }

  try {
    const parsedUrl = new URL(url, 'http://local')
    if (parsedUrl.pathname !== '/api/file') {
      return url
    }

    const pathname = parsedUrl.searchParams.get('pathname')
    return pathname ? getPublicFileUrl(pathname) : url
  } catch {
    return url
  }
}
