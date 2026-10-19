'use server'

import { hasAdminSession } from '@/lib/admin-session'

import {
  createContentCardRecord,
  deleteContentCardRecord,
  getContentCardRecords,
  updateContentCardRecord,
} from '@/lib/s3-data'

async function requireAdmin() {
  if (!(await hasAdminSession())) throw new Error('登录已过期，请重新验证密码')
}


export async function createContentCard(data: {
  syncToOtherSite?: boolean
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
  await requireAdmin()
  if (data.syncToOtherSite !== undefined && typeof data.syncToOtherSite !== 'boolean') {
    throw new Error('同步选项无效')
  }
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
  await requireAdmin()
  return updateContentCardRecord(id, data)
}

export async function deleteContentCard(id: number) {
  await requireAdmin()
  await deleteContentCardRecord(id)
  return { success: true }
}

export async function getContentCardsByNavCard(navCardId: number) {
  return getContentCardRecords(navCardId)
}
