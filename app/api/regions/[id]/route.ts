import { NextRequest, NextResponse } from 'next/server'
import { deleteRegionRecord, updateRegionRecord } from '@/lib/s3-data'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const recordId = Number.parseInt(id, 10)
    const body = await req.json()
    const row = await updateRegionRecord(recordId, {
      ...(body.cityName !== undefined && { cityName: body.cityName }),
      ...(body.districtName !== undefined && { districtName: body.districtName || null }),
      ...(body.enabled !== undefined && { enabled: body.enabled }),
      ...(body.displayOrder !== undefined && { displayOrder: body.displayOrder }),
    })
    if (!row) return NextResponse.json({ error: 'Region not found' }, { status: 404 })
    return NextResponse.json(row)
  } catch (error) {
    console.error('Failed to update region in S3:', error)
    return NextResponse.json({ error: 'Failed to update region' }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    await deleteRegionRecord(Number.parseInt(id, 10))
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to delete region from S3:', error)
    return NextResponse.json({ error: 'Failed to delete region' }, { status: 500 })
  }
}
