import { NextResponse } from 'next/server'
import { getNavCardRecords } from '@/lib/s3-data'
import { resolveStoredFileUrl } from '@/lib/storage-url'

export async function GET() {
  try {
    const cards = await getNavCardRecords()
    return NextResponse.json(
      cards.map((card) => ({
        ...card,
        imageUrl: resolveStoredFileUrl(card.imageUrl),
      })),
      {
        headers: {
          'Cache-Control': 'public, max-age=30, s-maxage=300, stale-while-revalidate=3600',
        },
      }
    )
  } catch (error) {
    console.error('Failed to fetch nav cards from S3:', error)
    return NextResponse.json({ error: 'Failed to fetch nav cards' }, { status: 500 })
  }
}
