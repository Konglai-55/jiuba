'use client'

import { useEffect, useState } from 'react'

const HEARTBEAT_INTERVAL_MS = 30_000

function createVisitorId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }

  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    const values = new Uint32Array(4)
    crypto.getRandomValues(values)
    return Array.from(values, (value) => value.toString(16).padStart(8, '0')).join('')
  }

  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`
}

function getVisitorId() {
  const storageKey = 'online_visitor_id'
  let visitorId = localStorage.getItem(storageKey)

  if (!visitorId) {
    visitorId = createVisitorId()
    localStorage.setItem(storageKey, visitorId)
  }

  return visitorId
}

export function OnlineCount() {
  const [online, setOnline] = useState<number | null>(null)

  useEffect(() => {
    let stopped = false
    const visitorId = getVisitorId()

    const sendHeartbeat = async () => {
      if (document.visibilityState === 'hidden') return

      try {
        const response = await fetch('/api/online', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ visitorId }),
          cache: 'no-store',
        })
        if (response.ok && !stopped) {
          const data = await response.json()
          setOnline(data.online)
        }
      } catch {
        // Keep the last known count when a heartbeat temporarily fails.
      }
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void sendHeartbeat()
      }
    }

    void sendHeartbeat()
    const timer = window.setInterval(sendHeartbeat, HEARTBEAT_INTERVAL_MS)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      stopped = true
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [])

  if (online === null) return null

  return (
    <span
      className="inline-flex shrink-0 items-center gap-1 text-[10px] font-normal text-muted-foreground/60"
      title="最近 90 秒内活跃人数"
    >
      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500/60" />
      {online} 人在线
    </span>
  )
}
