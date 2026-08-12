import { GetObjectCommand } from '@aws-sdk/client-s3'
import { type NextRequest, NextResponse } from 'next/server'
import { getS3Bucket, getS3Client, isAppDataKey } from '@/lib/s3'
import { getPublicFileUrl } from '@/lib/storage-url'

export async function GET(request: NextRequest) {
  try {
    const pathname = request.nextUrl.searchParams.get('pathname')
    if (!pathname) {
      return NextResponse.json({ error: 'Missing pathname' }, { status: 400 })
    }
    if (isAppDataKey(pathname)) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const publicUrl = getPublicFileUrl(pathname)
    if (publicUrl) {
      return NextResponse.redirect(publicUrl, 307)
    }

    const result = await getS3Client().send(
      new GetObjectCommand({
        Bucket: getS3Bucket(),
        Key: pathname,
        Range: request.headers.get('range') || undefined,
        IfNoneMatch: request.headers.get('if-none-match') || undefined,
      })
    )
    if (!result.Body) return new NextResponse('Not found', { status: 404 })

    const headers = new Headers({
      'Content-Type': result.ContentType || 'application/octet-stream',
      'Cache-Control': 'public, max-age=31536000, s-maxage=31536000, immutable',
      'Accept-Ranges': result.AcceptRanges || 'bytes',
      'X-Content-Type-Options': 'nosniff',
    })
    if (result.ContentLength !== undefined) headers.set('Content-Length', String(result.ContentLength))
    if (result.ContentRange) headers.set('Content-Range', result.ContentRange)
    if (result.ETag) headers.set('ETag', result.ETag)
    if (result.LastModified) headers.set('Last-Modified', result.LastModified.toUTCString())

    return new NextResponse(result.Body.transformToWebStream(), {
      status: result.ContentRange ? 206 : 200,
      headers,
    })
  } catch (error) {
    const code =
      typeof error === 'object' && error && '$metadata' in error
        ? (error as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode
        : undefined
    if (code === 304) return new NextResponse(null, { status: 304 })
    if (code === 404) return new NextResponse('Not found', { status: 404 })
    console.error('Error serving file:', error)
    return NextResponse.json({ error: 'Failed to serve file' }, { status: 500 })
  }
}
