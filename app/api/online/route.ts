import { NextRequest, NextResponse } from 'next/server'

const ACTIVE_WINDOW_MS = 90_000
const visitors = new Map<string, number>()

function removeExpiredVisitors(now: number) {
  for (const [visitorId, lastSeenAt] of visitors) {
    if (now - lastSeenAt > ACTIVE_WINDOW_MS) {
      visitors.delete(visitorId)
    }
  }
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null)
  const visitorId = typeof body?.visitorId === 'string' ? body.visitorId : ''

  if (!visitorId || visitorId.length > 100) {
    return NextResponse.json({ error: 'Invalid visitor id' }, { status: 400 })
  }

  const now = Date.now()
  removeExpiredVisitors(now)
  visitors.set(visitorId, now)

  return NextResponse.json(
    { online: visitors.size },
    { headers: { 'Cache-Control': 'no-store' } }
  )
}
