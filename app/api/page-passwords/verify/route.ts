import { NextRequest, NextResponse } from 'next/server'
import { isPageProtected, verifyPagePasswordRecord } from '@/lib/s3-data'

export async function POST(request: NextRequest) {
  try {
    const { navCardId, password } = await request.json()
    if (!navCardId || !password) {
      return NextResponse.json({ error: 'navCardId and password are required' }, { status: 400 })
    }
    return NextResponse.json(await verifyPagePasswordRecord(navCardId, password))
  } catch (error) {
    console.error('Error verifying page password from S3:', error)
    return NextResponse.json({ error: 'Failed to verify password' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const navCardId = request.nextUrl.searchParams.get('navCardId')
    if (!navCardId) {
      return NextResponse.json({ error: 'navCardId is required' }, { status: 400 })
    }
    return NextResponse.json({ protected: await isPageProtected(Number.parseInt(navCardId, 10)) })
  } catch (error) {
    console.error('Error checking page protection in S3:', error)
    return NextResponse.json({ error: 'Failed to check protection' }, { status: 500 })
  }
}
