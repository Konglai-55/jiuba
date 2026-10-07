'use server'

import {
  createContentCardRecord,
  deleteContentCardRecord,
  getContentCardRecords,
  updateContentCardRecord,
} from '@/lib/s3-data'

export async function createContentCard(data: {
  navCardId: number
  title: string
  description?: string
  imageUrl?: string
  videoUrl?: string
  detail?: string
  address?: string
  region?: string
  displayOrder?: number
}) {
  return createContentCardRecord(data)
}

export async function updateContentCard(
  id: number,
  data: {
    title?: string
    description?: string
    imageUrl?: string
    videoUrl?: string
    detail?: string
    address?: string
    region?: string
    displayOrder?: number
  }
) {
  return updateContentCardRecord(id, data)
}

export async function deleteContentCard(id: number) {
  await deleteContentCardRecord(id)
  return { success: true }
}

export async function getContentCardsByNavCard(navCardId: number) {
  return getContentCardRecords(navCardId)
}
