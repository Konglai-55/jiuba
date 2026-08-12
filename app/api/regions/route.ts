import { NextRequest, NextResponse } from 'next/server'
import { createRegionRecord, getRegionRecords } from '@/lib/s3-data'

export async function GET(req: NextRequest) {
  try {
    const navCardIdValue = req.nextUrl.searchParams.get('navCardId')
    const navCardId = navCardIdValue ? Number.parseInt(navCardIdValue, 10) : undefined
    const rows = await getRegionRecords({
      includeDisabled: req.nextUrl.searchParams.get('all') === 'true',
      navCardId: Number.isSafeInteger(navCardId) ? navCardId : undefined,
    })
    return NextResponse.json(rows)
  } catch (error) {
    console.error('Failed to fetch regions from S3:', error)
    return NextResponse.json({ error: 'Failed to fetch regions' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { cityName, districtName, displayOrder, navCardId } = await req.json()
    if (!cityName?.trim()) {
      return NextResponse.json({ error: '城市名称不能为空' }, { status: 400 })
    }

    const row = await createRegionRecord({
      cityName: cityName.trim(),
      districtName: districtName?.trim() || null,
      displayOrder: displayOrder ?? 0,
      navCardId: navCardId ?? null,
    })
    return NextResponse.json(row)
  } catch (error) {
    console.error('Failed to create region in S3:', error)
    return NextResponse.json({ error: 'Failed to create region' }, { status: 500 })
  }
}
