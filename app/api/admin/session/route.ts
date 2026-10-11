import { NextResponse } from 'next/server'
import { hasAdminSession, setAdminSession } from '@/lib/admin-session'

export async function POST() {
  if (!(await hasAdminSession())) {
    return NextResponse.json({ error: '登录已过期，请重新验证密码' }, {
      status: 401, headers: { 'Cache-Control': 'no-store' },
    })
  }
  await setAdminSession()
  return NextResponse.json({ valid: true }, {
    headers: { 'Cache-Control': 'no-store' },
  })
}
