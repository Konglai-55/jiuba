import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'node:crypto'
import { PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { hasAdminSession } from '@/lib/admin-session'
import { getS3Bucket, getS3Client } from '@/lib/s3'
import { deleteUploadedMedia } from '@/lib/s3-data'
import { getPublicFileUrl } from '@/lib/storage-url'

const MEDIA_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'video/mp4': 'mp4',
  'video/webm': 'webm',
}
const MAX_UPLOAD_BYTES = 50 * 1024 * 1024

export async function POST(request: NextRequest) {
  if (!(await hasAdminSession())) {
    return NextResponse.json({ error: '登录已过期，请重新登录' }, { status: 401 })
  }
  try {
    const payload = await request.json().catch(() => null)
    const type = payload?.type
    const size = payload?.size
    if (typeof type !== 'string' || !MEDIA_TYPES[type] ||
        !Number.isSafeInteger(size) || size <= 0 || size > MAX_UPLOAD_BYTES) {
      return NextResponse.json({ error: '文件类型或大小无效（最大 50MB）' }, { status: 400 })
    }

    const pathname = `media/${Date.now()}-${randomUUID()}.${MEDIA_TYPES[type]}`
    const url = getPublicFileUrl(pathname)
    if (!url) throw new Error('S3_PUBLIC_BASE_URL is not configured')
    const uploadUrl = await getSignedUrl(
      getS3Client(),
      new PutObjectCommand({ Bucket: getS3Bucket(), Key: pathname, ContentType: type }),
      { expiresIn: 300 }
    )
    return NextResponse.json({ pathname, url, uploadUrl, storage: 's3' }, {
      headers: { 'Cache-Control': 'no-store' },
    })
  } catch (error) {
    console.error('Upload signing error:', error instanceof Error ? error.message : error)
    return NextResponse.json({ error: '生成上传地址失败' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  if (!(await hasAdminSession())) {
    return NextResponse.json({ error: '登录已过期，请重新登录' }, { status: 401 })
  }
  try {
    const pathname = request.nextUrl.searchParams.get('pathname')
    const type = request.headers.get('content-type')?.split(';', 1)[0].trim() || ''
    const declaredSize = Number(request.headers.get('content-length') || 0)
    if (!pathname || !/^media\/\d{13}-[0-9a-f-]{36}\.(?:jpg|png|webp|mp4|webm)$/i.test(pathname)) {
      return NextResponse.json({ error: '无效的文件路径' }, { status: 400 })
    }
    if (!MEDIA_TYPES[type] || (declaredSize > 0 && declaredSize > MAX_UPLOAD_BYTES)) {
      return NextResponse.json({ error: '文件类型或大小无效（最大 50MB）' }, { status: 400 })
    }
    const body = Buffer.from(await request.arrayBuffer())
    if (body.length === 0 || body.length > MAX_UPLOAD_BYTES) {
      return NextResponse.json({ error: '文件类型或大小无效（最大 50MB）' }, { status: 400 })
    }
    await getS3Client().send(
      new PutObjectCommand({
        Bucket: getS3Bucket(),
        Key: pathname,
        Body: body,
        ContentType: type,
        ContentLength: body.length,
      }),
      { abortSignal: AbortSignal.timeout(120_000) }
    )
    return NextResponse.json({ success: true }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    console.error('Proxy upload error:', error instanceof Error ? error.message : error)
    return NextResponse.json({ error: '上传文件失败' }, { status: 502 })
  }
}

export async function DELETE(request: NextRequest) {
  if (!(await hasAdminSession())) {
    return NextResponse.json({ error: '登录已过期，请重新登录' }, { status: 401 })
  }
  try {
    const pathname = request.nextUrl.searchParams.get('pathname')
    if (!pathname || !/^media\/\d{13}-[0-9a-f-]{36}\.(?:jpg|png|webp|mp4|webm)$/i.test(pathname)) {
      return NextResponse.json({ error: '无效的文件路径' }, { status: 400 })
    }
    await deleteUploadedMedia(pathname)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Upload cleanup error:', error instanceof Error ? error.message : error)
    return NextResponse.json({ error: '清理上传文件失败' }, { status: 500 })
  }
}
