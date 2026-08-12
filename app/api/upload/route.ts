import { PutObjectCommand } from '@aws-sdk/client-s3'
import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'node:crypto'
import { getS3Bucket, getS3Client } from '@/lib/s3'
import { deleteUploadedMedia } from '@/lib/s3-data'
import { getPublicFileUrl } from '@/lib/storage-url'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file')
    if (!(file instanceof File)) {
      return NextResponse.json({ error: '没有提供文件' }, { status: 400 })
    }

    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/webm']
    if (!validTypes.includes(file.type)) {
      return NextResponse.json(
        { error: '仅支持 JPG、PNG、WebP 图片和 MP4、WebM 视频' },
        { status: 400 }
      )
    }

    if (file.size > 50 * 1024 * 1024) {
      return NextResponse.json({ error: '文件大小不能超过 50MB' }, { status: 400 })
    }

    const extension = file.name.split('.').pop()?.toLowerCase() || 'bin'
    const fileName = `media/${Date.now()}-${randomUUID()}.${extension}`
    const body = Buffer.from(await file.arrayBuffer())

    await getS3Client().send(
      new PutObjectCommand({
        Bucket: getS3Bucket(),
        Key: fileName,
        Body: body,
        ContentType: file.type,
        CacheControl: 'public, max-age=31536000, immutable',
      })
    )

    return NextResponse.json({
      pathname: fileName,
      url: getPublicFileUrl(fileName) || `/api/file?pathname=${encodeURIComponent(fileName)}`,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Upload failed'
    console.error('Upload error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const pathname = request.nextUrl.searchParams.get('pathname')
    if (!pathname) {
      return NextResponse.json({ error: '缺少文件路径' }, { status: 400 })
    }
    await deleteUploadedMedia(pathname)
    return NextResponse.json({ success: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Delete failed'
    console.error('Upload cleanup error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
