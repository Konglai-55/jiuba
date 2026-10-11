import { createHmac, timingSafeEqual } from 'node:crypto'
import { cookies } from 'next/headers'

const COOKIE = 'jiuba_admin_session'
const SESSION_SECONDS = 4 * 60 * 60

function signature(expires: string) {
  const secret = process.env.S3_SECRET_KEY
  if (!secret) throw new Error('S3_SECRET_KEY is not configured')
  return createHmac('sha256', secret).update(`jiuba-admin-session-v1:${expires}`).digest('hex')
}

export async function setAdminSession() {
  const expires = String(Math.floor(Date.now() / 1000) + SESSION_SECONDS)
  ;(await cookies()).set(COOKIE, `${expires}.${signature(expires)}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: SESSION_SECONDS,
  })
}

export async function clearAdminSession() {
  ;(await cookies()).delete(COOKIE)
}

export async function hasAdminSession() {
  const value = (await cookies()).get(COOKIE)?.value
  if (!value) return false
  const [expires, mac, extra] = value.split('.')
  if (extra || !/^\d{10}$/.test(expires || '') || !/^[0-9a-f]{64}$/.test(mac || '')) return false
  if (Number(expires) <= Math.floor(Date.now() / 1000)) return false
  const actual = Buffer.from(mac, 'hex')
  const expected = Buffer.from(signature(expires), 'hex')
  return timingSafeEqual(actual, expected)
}
