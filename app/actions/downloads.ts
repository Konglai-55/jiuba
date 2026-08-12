'use server'

import { createDownloadRecord, getDownloadRecords } from '@/lib/s3-data'

export async function recordDownload(
  contentCardId: number,
  fileUrl: string,
  fileName: string,
  fileType: 'image' | 'video'
) {
  try {
    await createDownloadRecord({ contentCardId, fileUrl, fileName, fileType })
    return { success: true }
  } catch (error) {
    console.error('Error recording download:', error)
    return { success: false, error: 'Download record failed' }
  }
}

export async function getDownloadStats() {
  try {
    return await getDownloadRecords()
  } catch (error) {
    console.error('Error getting download stats:', error)
    return []
  }
}
