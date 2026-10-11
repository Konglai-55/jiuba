import { createReadStream } from 'node:fs'
import { stat } from 'node:fs/promises'
import { Readable } from 'node:stream'
import { localMediaPath, localMediaContentType } from '@/lib/local-media'
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

    const localPath = localMediaPath(pathname)
    if (localPath) {
      try {
        const info = await stat(localPath)
        if (!info.isFile()) return new NextResponse('Not found', { status: 404 })
        const range = request.headers.get('range')
        const match = range?.match(/^bytes=(\d*)-(\d*)$/)
        let start = 0
        let end = info.size - 1
        if (range) {
          if (!match) return new NextResponse(null, { status: 416, headers: { 'Content-Range': 'bytes */' + info.size } })
          start = match[1] ? Number(match[1]) : Math.max(0, info.size - Number(match[2]))
          end = match[1] && match[2] ? Math.min(end, Number(match[2])) : end
          if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start > end || start >= info.size) {
            return new NextResponse(null, { status: 416, headers: { 'Content-Range': 'bytes */' + info.size } })
          }
        }
        const headers = new Headers({
          'Content-Type': localMediaContentType(pathname),
          'Cache-Control': 'public, max-age=31536000, immutable',
          'Accept-Ranges': 'bytes',
          'Content-Length': String(end - start + 1),
          'X-Content-Type-Options': 'nosniff',
        })
        if (range) headers.set('Content-Range', 'bytes ' + start + '-' + end + '/' + info.size)
        const stream = Readable.toWeb(createReadStream(localPath, { start, end })) as ReadableStream<Uint8Array>
        return new NextResponse(stream, { status: range ? 206 : 200, headers })
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
      }
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
