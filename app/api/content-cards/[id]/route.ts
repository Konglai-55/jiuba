import { NextResponse } from 'next/server'
import { getContentCardRecords } from '@/lib/s3-data'
import { resolveStoredFileUrl } from '@/lib/storage-url'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const navCardId = Number.parseInt(id, 10)
    if (!Number.isSafeInteger(navCardId)) {
      return NextResponse.json({ error: 'Invalid navigation card id' }, { status: 400 })
    }

    const searchParams = new URL(request.url).searchParams
    const city = searchParams.get('city')
    const district = searchParams.get('district')
    const regionSearch = district || city

    const cards = (await getContentCardRecords(navCardId)).filter(
      (card) => !regionSearch || card.region?.includes(regionSearch)
    )

    return NextResponse.json(
      cards.map((card) => ({
        ...card,
        imageUrl: resolveStoredFileUrl(card.imageUrl),
        videoUrl: resolveStoredFileUrl(card.videoUrl),
      })),
      {
        headers: {
          'Cache-Control': 'public, max-age=30, s-maxage=300, stale-while-revalidate=3600',
        },
      }
    )
  } catch (error) {
    console.error('Failed to fetch content cards from S3:', error)
    return NextResponse.json({ error: 'Failed to fetch content cards' }, { status: 500 })
  }
}
