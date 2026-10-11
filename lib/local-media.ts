import path from 'node:path'

export const LOCAL_MEDIA_DIR = '/srv/www/jiuba/.dreampanel/shared/media'

export function localMediaPath(key: string): string | null {
  const match = /^media\/(\d{13}-[0-9a-f-]{36}\.(?:jpg|png|webp|mp4|webm))$/i.exec(key)
  return match ? path.join(LOCAL_MEDIA_DIR, match[1]) : null
}

export function localMediaContentType(key: string): string {
  const extension = key.split('.').pop()?.toLowerCase()
  return ({ jpg: 'image/jpeg', png: 'image/png', webp: 'image/webp', mp4: 'video/mp4', webm: 'video/webm' } as Record<string, string>)[extension || ''] || 'application/octet-stream'
}
