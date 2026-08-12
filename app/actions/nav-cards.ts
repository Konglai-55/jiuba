'use server'

import {
  createNavCardRecord,
  deleteNavCardRecord,
  getNavCardRecords,
  updateNavCardRecord,
} from '@/lib/s3-data'

export async function createNavCard(data: {
  title: string
  description?: string
  imageUrl?: string
  category: string
}) {
  return createNavCardRecord(data)
}

export async function updateNavCard(
  id: number,
  data: {
    title?: string
    description?: string
    imageUrl?: string
    category?: string
    displayOrder?: number
  }
) {
  return updateNavCardRecord(id, data)
}

export async function deleteNavCard(id: number) {
  await deleteNavCardRecord(id)
  return { success: true }
}

export async function getNavCards() {
  return getNavCardRecords()
}
