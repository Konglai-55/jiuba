import { NextResponse } from 'next/server'
import { checkS3DataStore } from '@/lib/s3-data'

export async function GET() {
  try {
    await checkS3DataStore()
    return NextResponse.json({ success: true, storage: 's3', message: 'S3 data store connected' })
  } catch (error) {
    console.error('S3 data store connection failed:', error)
    return NextResponse.json({ success: false, storage: 's3', error: String(error) }, { status: 500 })
  }
}
