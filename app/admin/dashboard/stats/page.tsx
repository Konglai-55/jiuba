'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ChevronLeft, LogOut, BarChart3, TrendingUp, Download } from 'lucide-react'
import { getClickStats, getDailyClickStats } from '@/app/actions/stats'
import { getDownloadStats } from '@/app/actions/downloads'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'

interface ClickStat {
  id: number
  navCardId: number | null
  contentCardId: number | null
  clickCount: number
  lastClickedAt: string
  title?: string
  navCardIdForLink?: number | null
  imageUrl?: string
  region?: string
}

interface DailyStat {
  date: string
  totalClicks: number
}

interface DownloadRecord {
  id: number
  contentCardId: number
  fileUrl: string
  fileName: string
  fileType: string
  downloadedAt: string
}

export default function StatsPage() {
  const router = useRouter()
  const [isAuthed, setIsAuthed] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [clickStats, setClickStats] = useState<ClickStat[]>([])
  const [dailyStats, setDailyStats] = useState<DailyStat[]>([])
  const [downloads, setDownloads] = useState<DownloadRecord[]>([])
  const [activeTab, setActiveTab] = useState<'daily' | 'total' | 'downloads'>('daily')

  useEffect(() => {
    const loggedIn = localStorage.getItem('admin_logged_in') === 'true'
    if (!loggedIn) {
      router.push('/admin/login')
      return
    }
    setIsAuthed(true)
    setIsLoading(false)
    loadStats()
  }, [router])

  const loadStats = async () => {
    const [stats, daily, downloadRecords] = await Promise.all([
      getClickStats(),
      getDailyClickStats(),
      getDownloadStats(),
    ])
    setClickStats(stats as ClickStat[])
    setDailyStats(daily as DailyStat[])
    setDownloads(downloadRecords as DownloadRecord[])
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-foreground">加载中...</div>
      </div>
    )
  }

  if (!isAuthed) return null

  const handleLogout = () => {
    localStorage.removeItem('admin_logged_in')
    router.push('/admin/login')
  }

  const totalClicks = clickStats.reduce((sum, s) => sum + s.clickCount, 0)
  const todayStr = new Date().toISOString().slice(0, 10)
  const todayClicks = dailyStats.find((d) => d.date === todayStr)?.totalClicks ?? 0

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-white">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/admin/dashboard" className="hover:opacity-70 transition-opacity">
              <ChevronLeft className="w-5 h-5" />
            </Link>
            <h1 className="text-2xl font-bold text-foreground">统计分析</h1>
          </div>
          <Button variant="outline" size="sm" onClick={handleLogout} className="gap-2">
            <LogOut className="w-4 h-4" />
            登出
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* 概览卡片 */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white border border-border rounded-xl p-5">
            <p className="text-sm text-muted-foreground mb-1">今日点击</p>
            <p className="text-3xl font-bold text-primary">{todayClicks}</p>
          </div>
          <div className="bg-white border border-border rounded-xl p-5">
            <p className="text-sm text-muted-foreground mb-1">累计点击</p>
            <p className="text-3xl font-bold text-foreground">{totalClicks}</p>
          </div>
          <div className="bg-white border border-border rounded-xl p-5">
            <p className="text-sm text-muted-foreground mb-1">累计下载</p>
            <p className="text-3xl font-bold text-foreground">{downloads.length}</p>
          </div>
        </div>

        {/* Tab 导航 */}
        <div className="flex gap-3 mb-6">
          <button
            onClick={() => setActiveTab('daily')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'daily' ? 'bg-primary text-white' : 'bg-secondary text-foreground hover:bg-secondary/80'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            每日趋势
          </button>
          <button
            onClick={() => setActiveTab('total')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'total' ? 'bg-primary text-white' : 'bg-secondary text-foreground hover:bg-secondary/80'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            卡片排行
          </button>
          <button
            onClick={() => setActiveTab('downloads')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'downloads' ? 'bg-primary text-white' : 'bg-secondary text-foreground hover:bg-secondary/80'
            }`}
          >
            <Download className="w-4 h-4" />
            下载记录
          </button>
        </div>

        {/* 每日趋势图 */}
        {activeTab === 'daily' && (
          <div className="bg-white border border-border rounded-xl p-6">
            <h2 className="text-lg font-bold mb-6 text-foreground">近 30 天每日点击趋势</h2>
            {dailyStats.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <TrendingUp className="w-10 h-10 mb-3 opacity-40" />
                <p className="text-sm">暂无统计数据</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={dailyStats} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 12, fill: '#71717a' }}
                    tickFormatter={(v) => v.slice(5)} // 显示 MM-DD
                  />
                  <YAxis tick={{ fontSize: 12, fill: '#71717a' }} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ borderRadius: 8, border: '1px solid #e4e4e7', fontSize: 13 }}
                    labelFormatter={(v) => `日期：${v}`}
                    formatter={(v: number) => [v, '点击次数']}
                  />
                  <Legend formatter={() => '每日点击数'} />
                  <Line
                    type="monotone"
                    dataKey="totalClicks"
                    stroke="#e85d26"
                    strokeWidth={2.5}
                    dot={{ r: 3, fill: '#e85d26' }}
                    activeDot={{ r: 5 }}
                    name="点击次数"
                  />
                </LineChart>
              </ResponsiveContainer>
            )}

            {/* 每日明细表 */}
            {dailyStats.length > 0 && (
              <div className="mt-6 border-t border-border pt-4">
                <h3 className="text-sm font-semibold text-muted-foreground mb-3">每日明细</h3>
                <div className="space-y-1.5 max-h-60 overflow-y-auto">
                  {[...dailyStats].reverse().map((d) => (
                    <div key={d.date} className="flex items-center justify-between px-3 py-2 rounded-lg bg-secondary/40">
                      <span className="text-sm text-foreground">{d.date}</span>
                      <span className="text-sm font-semibold text-primary">{d.totalClicks} 次</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* 卡片点击排行 */}
        {activeTab === 'total' && (
          <div className="bg-white border border-border rounded-xl p-6">
            <h2 className="text-lg font-bold mb-4 text-foreground">卡片点击排行</h2>
            {clickStats.length === 0 ? (
              <p className="text-muted-foreground text-sm">暂无点击数据</p>
            ) : (
              <div className="space-y-2">
                {[...clickStats]
                  .sort((a, b) => b.clickCount - a.clickCount)
                  .map((stat, index) => {
                    const href =
                      stat.contentCardId && stat.navCardIdForLink
                        ? `/category/${stat.navCardIdForLink}?cardId=${stat.contentCardId}`
                        : stat.navCardId
                        ? `/`
                        : '#'
                    return (
                      <Link
                        key={stat.id}
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 p-3 bg-secondary/40 rounded-lg hover:bg-secondary transition-colors"
                      >
                        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                          index === 0 ? 'bg-yellow-400 text-white' :
                          index === 1 ? 'bg-gray-400 text-white' :
                          index === 2 ? 'bg-orange-400 text-white' :
                          'bg-muted text-muted-foreground'
                        }`}>
                          {index + 1}
                        </span>
                        {/* 图片缩略图 */}
                        {stat.imageUrl ? (
                          <img src={stat.imageUrl} alt="" className="w-10 h-10 rounded-md object-cover shrink-0 border border-border" />
                        ) : (
                          <div className="w-10 h-10 rounded-md bg-secondary shrink-0 border border-border flex items-center justify-center">
                            <BarChart3 className="w-4 h-4 text-muted-foreground" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">
                            {stat.region || stat.title || (stat.navCardId ? `导航卡片 #${stat.navCardId}` : `内容 #${stat.contentCardId}`)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            最后点击：{new Date(stat.lastClickedAt).toLocaleString('zh-CN')}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-xl font-bold text-primary">{stat.clickCount}</p>
                          <p className="text-xs text-muted-foreground">次</p>
                        </div>
                      </Link>
                    )
                  })}
              </div>
            )}
          </div>
        )}

        {/* 下载统计 */}
        {activeTab === 'downloads' && (
          <div className="bg-white border border-border rounded-xl p-6">
            <h2 className="text-lg font-bold mb-4 text-foreground">文件下载记录</h2>
            {downloads.length === 0 ? (
              <p className="text-muted-foreground text-sm">暂无下载记录</p>
            ) : (
              <div className="space-y-2">
                {[...downloads]
                  .sort((a, b) => new Date(b.downloadedAt).getTime() - new Date(a.downloadedAt).getTime())
                  .map((record) => (
                    <div key={record.id} className="flex items-center justify-between p-3 bg-secondary/40 rounded-lg">
                      <div>
                        <p className="text-sm font-medium text-foreground">{record.fileName}</p>
                        <p className="text-xs text-muted-foreground">
                          {record.fileType === 'image' ? '图片' : '视频'} · {new Date(record.downloadedAt).toLocaleString('zh-CN')}
                        </p>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                        record.fileType === 'image' ? 'bg-blue-100 text-blue-600' : 'bg-purple-100 text-purple-600'
                      }`}>
                        {record.fileType === 'image' ? '图片' : '视频'}
                      </span>
                    </div>
                  ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
