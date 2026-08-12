'use server'

import {
  getClickEventRecords,
  getContentCardRecords,
  getNavCardRecords,
  recordClickEvent,
} from '@/lib/s3-data'
import { resolveStoredFileUrl } from '@/lib/storage-url'

export async function recordNavCardClick(navCardId: number) {
  try {
    await recordClickEvent({ navCardId })
  } catch (error) {
    console.error('Error recording nav card click:', error)
  }
}

export async function recordContentCardClick(contentCardId: number) {
  try {
    await recordClickEvent({ contentCardId })
  } catch (error) {
    console.error('Error recording content card click:', error)
  }
}

export async function getDailyClickStats() {
  try {
    const events = await getClickEventRecords()
    const totals = new Map<string, number>()
    for (const event of events) {
      totals.set(event.date, (totals.get(event.date) || 0) + 1)
    }

    const result = []
    for (let i = 29; i >= 0; i--) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      const dateString = date.toISOString().slice(0, 10)
      result.push({ date: dateString, totalClicks: totals.get(dateString) || 0 })
    }
    return result
  } catch (error) {
    console.error('Error getting daily click stats:', error)
    return []
  }
}

export async function getClickStats() {
  try {
    const [events, contentCards, navCards] = await Promise.all([
      getClickEventRecords(),
      getContentCardRecords(),
      getNavCardRecords(),
    ])

    const contentById = new Map(contentCards.map((card) => [card.id, card]))
    const navById = new Map(navCards.map((card) => [card.id, card]))
    const groups = new Map<
      string,
      {
        id: number
        navCardId: number | null
        contentCardId: number | null
        clickCount: number
        lastClickedAt: string
      }
    >()

    for (const event of events) {
      const key = event.navCardId ? `nav:${event.navCardId}` : `content:${event.contentCardId}`
      const current = groups.get(key)
      if (current) {
        current.clickCount += 1
        if (event.clickedAt > current.lastClickedAt) current.lastClickedAt = event.clickedAt
      } else {
        groups.set(key, {
          id: event.id,
          navCardId: event.navCardId,
          contentCardId: event.contentCardId,
          clickCount: 1,
          lastClickedAt: event.clickedAt,
        })
      }
    }

    return [...groups.values()].flatMap((stat) => {
      const content = stat.contentCardId ? contentById.get(stat.contentCardId) : undefined
      const nav = stat.navCardId ? navById.get(stat.navCardId) : undefined
      if ((stat.contentCardId && !content) || (stat.navCardId && !nav)) {
        return []
      }
      return [{
        ...stat,
        title: content?.title || nav?.title || '',
        navCardIdForLink: content?.navCardId || null,
        imageUrl: resolveStoredFileUrl(content?.imageUrl || null) || '',
        region: content?.region || '',
      }]
    })
  } catch (error) {
    console.error('Error getting click stats:', error)
    return []
  }
}
