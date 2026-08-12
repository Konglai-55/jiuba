'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Settings } from 'lucide-react'

interface NavCard {
  id: number
  title: string
  description: string
  imageUrl: string | null
  category: string
}

interface SiteSettings {
  homeTitle: string
  homeSubtitle: string
  siteName: string
  siteLogo: string
}

export default function Home() {
  const [navCards, setNavCards] = useState<NavCard[]>([])
  const [siteSettings, setSiteSettings] = useState<SiteSettings>({
    homeTitle: '发现优质酒馆',
    homeSubtitle: '探索各地特色酒吧，品味独特体验',
    siteName: '酒馆推介',
    siteLogo: '',
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        // 并行获取导航卡片和站点设置
        const [navRes, settingsRes] = await Promise.all([
          fetch('/api/nav-cards'),
          fetch('/api/site-settings'),
        ])
        
        if (navRes.ok) {
          const data = await navRes.json()
          setNavCards(data)
        }
        
        if (settingsRes.ok) {
          const settings = await settingsRes.json()
          if (settings.homeTitle) {
            setSiteSettings(settings)
          }
        }
      } catch (error) {
        console.error('Failed to fetch data:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground">加载中...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* 移动端头部 */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/50">
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {siteSettings.siteLogo ? (
              <img
                src={siteSettings.siteLogo}
                alt="logo"
                className="w-8 h-8 rounded-lg object-cover"
              />
            ) : (
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-sm">
                  {(siteSettings.siteName || '酒')[0]}
                </span>
              </div>
            )}
            <span className="font-semibold text-lg">{siteSettings.siteName || '酒馆推介'}</span>
          </div>
          <Link 
            href="/admin" 
            className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center active:scale-95 transition-transform"
          >
            <Settings className="w-4 h-4 text-muted-foreground" />
          </Link>
        </div>
      </header>

      {/* 主要内容区 */}
      <main className="px-4 pb-8">
        {/* 欢迎区域 */}
        <div className="py-6">
          <h1 className="text-2xl font-bold text-foreground mb-1">{siteSettings.homeTitle}</h1>
          <p className="text-sm text-muted-foreground">{siteSettings.homeSubtitle}</p>
        </div>

        {/* 卡片网格 - 移动端2列，所有卡片大小一致 */}
        <div className="grid grid-cols-2 gap-3">
          {navCards.map((card, index) => (
            <Link key={card.id} href={`/category/${card.id}`} className="block">
              <div className="active:scale-[0.98] transition-transform">
                {/* 图片区域 */}
                <div className="relative overflow-hidden rounded-2xl bg-muted aspect-square border border-border/50">
                  {card.imageUrl ? (
                    <img
                      src={card.imageUrl}
                      alt={card.title}
                      className="absolute inset-0 w-full h-full object-cover"
                      loading={index < 2 ? 'eager' : 'lazy'}
                      fetchPriority={index < 2 ? 'high' : 'auto'}
                      decoding="async"
                    />
                  ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-accent/10 to-muted" />
                  )}
                  {/* 右上角箭头 */}
                  <div className="absolute top-2.5 right-2.5">
                    <div className="w-6 h-6 rounded-full bg-black/20 backdrop-blur-sm flex items-center justify-center">
                      <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                </div>
                {/* 标题在卡片下方 */}
                <div className="pt-2 pb-1 px-0.5">
                  <h3 className="text-sm font-semibold text-foreground text-center leading-tight">
                    {card.title}
                  </h3>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* 空状态 */}
        {navCards.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <p className="text-muted-foreground text-sm">暂无数据</p>
            <p className="text-muted-foreground/60 text-xs mt-1">请在后台添加分类卡片</p>
          </div>
        )}
      </main>

      {/* 底部安全区域 */}
      <div className="h-safe-area-inset-bottom" />
    </div>
  )
}
