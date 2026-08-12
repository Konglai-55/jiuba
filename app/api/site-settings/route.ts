import { NextRequest, NextResponse } from 'next/server'
import { getSiteSettingsRecord, setSiteSettingRecord } from '@/lib/s3-data'
import { resolveStoredFileUrl } from '@/lib/storage-url'

export async function GET() {
  try {
    const settings = await getSiteSettingsRecord()
    if (settings.siteLogo) {
      settings.siteLogo = resolveStoredFileUrl(settings.siteLogo) || ''
    }
    return NextResponse.json(settings, {
      headers: {
        'Cache-Control': 'public, max-age=30, s-maxage=300, stale-while-revalidate=3600',
      },
    })
  } catch (error) {
    console.error('Error fetching site settings from S3:', error)
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { key, value } = await request.json()
    if (!key || typeof value !== 'string') {
      return NextResponse.json({ error: 'Key and string value are required' }, { status: 400 })
    }
    await setSiteSettingRecord(key, value)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error updating site settings in S3:', error)
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 })
  }
}
