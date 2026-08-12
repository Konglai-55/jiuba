import { NextRequest, NextResponse } from 'next/server'
import {
  deletePagePasswordRecord,
  getNavCardRecords,
  getPagePasswordRecords,
  setPagePasswordRecord,
} from '@/lib/s3-data'

export async function GET() {
  try {
    const [passwords, navCards] = await Promise.all([
      getPagePasswordRecords(),
      getNavCardRecords(),
    ])
    const titleById = new Map(navCards.map((card) => [card.id, card.title]))
    return NextResponse.json(
      passwords.map((record) => ({
        id: record.id,
        navCardId: record.navCardId,
        password: '',
        hasPassword: true,
        enabled: record.enabled,
        navCardTitle: titleById.get(record.navCardId) || '',
      }))
    )
  } catch (error) {
    console.error('Error fetching page passwords from S3:', error)
    return NextResponse.json({ error: 'Failed to fetch passwords' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { navCardId, password, enabled } = await request.json()
    if (!navCardId) {
      return NextResponse.json({ error: 'navCardId is required' }, { status: 400 })
    }
    await setPagePasswordRecord(navCardId, password || undefined, Boolean(enabled))
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error saving page password to S3:', error)
    return NextResponse.json({ error: 'Failed to save password' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const navCardId = request.nextUrl.searchParams.get('navCardId')
    if (!navCardId) {
      return NextResponse.json({ error: 'navCardId is required' }, { status: 400 })
    }
    await deletePagePasswordRecord(Number.parseInt(navCardId, 10))
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting page password from S3:', error)
    return NextResponse.json({ error: 'Failed to delete password' }, { status: 500 })
  }
}
