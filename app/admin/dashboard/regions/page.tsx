'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft, Plus, Trash2, MapPin, ChevronDown, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

interface NavCard {
  id: number
  title: string
}

interface Region {
  id: number
  navCardId: number | null
  cityName: string
  districtName: string | null
  enabled: number
  displayOrder: number
}

export default function RegionsPage() {
  const router = useRouter()
  const [navCards, setNavCards] = useState<NavCard[]>([])
  const [activeNavCardId, setActiveNavCardId] = useState<number | null>(null)
  const [regions, setRegions] = useState<Region[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [cityName, setCityName] = useState('')
  const [districtName, setDistrictName] = useState('')
  const [saving, setSaving] = useState(false)
  const [expandedCities, setExpandedCities] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (localStorage.getItem('admin_logged_in') !== 'true') {
      router.push('/admin/login')
      return
    }
    fetchNavCards()
  }, [router])

  const fetchNavCards = async () => {
    try {
      const res = await fetch('/api/nav-cards')
      if (res.ok) {
        const data: NavCard[] = await res.json()
        // 只显示 2、3、4 导页（第一个不需要地区管理）
        const filtered = data.filter((c) => c.id !== 1)
        setNavCards(filtered)
        if (filtered.length > 0) {
          setActiveNavCardId(filtered[0].id)
          fetchRegions(filtered[0].id)
        }
      }
    } catch {
      toast.error('加载导页失败')
      setLoading(false)
    }
  }

  const fetchRegions = async (navCardId: number) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/regions?all=true&navCardId=${navCardId}`)
      if (res.ok) {
        const data: Region[] = await res.json()
        setRegions(data)
        const cities = new Set(data.filter((r) => r.districtName).map((r) => r.cityName))
        setExpandedCities(cities)
      }
    } catch {
      toast.error('加载地区失败')
    } finally {
      setLoading(false)
    }
  }

  const handleTabChange = (navCardId: number) => {
    setActiveNavCardId(navCardId)
    setShowAdd(false)
    setCityName('')
    setDistrictName('')
    fetchRegions(navCardId)
  }

  const handleAdd = async () => {
    if (!cityName.trim()) { toast.error('城市名称不能为空'); return }
    if (!activeNavCardId) return
    setSaving(true)
    try {
      const res = await fetch('/api/regions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cityName: cityName.trim(),
          districtName: districtName.trim() || null,
          navCardId: activeNavCardId,
        }),
      })
      if (res.ok) {
        const row = await res.json()
        setRegions((prev) => [...prev, row])
        if (row.districtName) setExpandedCities((prev) => new Set(prev).add(row.cityName))
        setCityName('')
        setDistrictName('')
        setShowAdd(false)
        toast.success('地区已添加')
      } else {
        toast.error('添加失败')
      }
    } catch {
      toast.error('添加失败')
    } finally {
      setSaving(false)
    }
  }

  const handleToggle = async (region: Region) => {
    const newEnabled = region.enabled === 1 ? 0 : 1
    try {
      const res = await fetch(`/api/regions/${region.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: newEnabled }),
      })
      if (res.ok) {
        setRegions((prev) => prev.map((r) => (r.id === region.id ? { ...r, enabled: newEnabled } : r)))
      }
    } catch {
      toast.error('操作失败')
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('确认删除该地区？')) return
    try {
      const res = await fetch(`/api/regions/${id}`, { method: 'DELETE' })
      if (res.ok) {
        setRegions((prev) => prev.filter((r) => r.id !== id))
        toast.success('已删除')
      }
    } catch {
      toast.error('删除失败')
    }
  }

  const toggleExpand = (city: string) => {
    setExpandedCities((prev) => {
      const next = new Set(prev)
      if (next.has(city)) next.delete(city)
      else next.add(city)
      return next
    })
  }

  // 按城市分组
  const grouped = regions.reduce<Record<string, { cityRow: Region | null; districts: Region[] }>>(
    (acc, r) => {
      if (!acc[r.cityName]) acc[r.cityName] = { cityRow: null, districts: [] }
      if (!r.districtName) acc[r.cityName].cityRow = r
      else acc[r.cityName].districts.push(r)
      return acc
    },
    {}
  )

  const enabledCount = regions.filter((r) => r.enabled === 1).length

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/admin/dashboard">
              <Button variant="ghost" size="sm" className="gap-1">
                <ChevronLeft className="w-4 h-4" />
                返回
              </Button>
            </Link>
            <h1 className="text-xl font-bold text-foreground">地区管理</h1>
          </div>
          <div className="text-sm text-muted-foreground">
            已启用 <span className="font-semibold text-primary">{enabledCount}</span> / {regions.length}
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 max-w-2xl">

        {/* 导页 Tab */}
        <div className="flex gap-1 p-1 bg-muted rounded-xl mb-6">
          {navCards.map((nav) => (
            <button
              key={nav.id}
              onClick={() => handleTabChange(nav.id)}
              className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                activeNavCardId === nav.id
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {nav.title}
            </button>
          ))}
        </div>

        {/* 操作栏 */}
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-muted-foreground">城市和区县均可独立开关，关闭后前台不显示</p>
          <Button size="sm" onClick={() => setShowAdd(!showAdd)} className="gap-1.5">
            <Plus className="w-4 h-4" />
            添加地区
          </Button>
        </div>

        {/* 新增表单 */}
        {showAdd && (
          <div className="bg-card border border-border rounded-xl p-4 mb-4 space-y-3">
            <p className="text-sm font-semibold text-foreground">
              为「{navCards.find((n) => n.id === activeNavCardId)?.title}」添加地区
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-muted-foreground mb-1">城市名称 *</label>
                <input
                  type="text"
                  placeholder="如：广州市"
                  value={cityName}
                  onChange={(e) => setCityName(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">区县名称（可选）</label>
                <input
                  type="text"
                  placeholder="如：天河区（留空则为城市）"
                  value={districtName}
                  onChange={(e) => setDistrictName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                  className="w-full px-3 py-2 text-sm border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={() => { setShowAdd(false); setCityName(''); setDistrictName('') }}>
                取消
              </Button>
              <Button size="sm" onClick={handleAdd} disabled={saving}>
                {saving ? '保存中...' : '确认添加'}
              </Button>
            </div>
          </div>
        )}

        {/* 地区列表 */}
        {loading ? (
          <div className="text-center py-12 text-muted-foreground">加载中...</div>
        ) : Object.keys(grouped).length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <MapPin className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p>暂无地区，点击上方「添加地区」开始配置</p>
          </div>
        ) : (
          <div className="space-y-2">
            {Object.entries(grouped).map(([city, { cityRow, districts }]) => {
              const isExpanded = expandedCities.has(city)
              const hasDistricts = districts.length > 0
              const cityEnabled = cityRow?.enabled === 1
              const enabledDistricts = districts.filter((d) => d.enabled === 1).length

              return (
                <div key={city} className="bg-card border border-border rounded-xl overflow-hidden">
                  {/* 城市行 */}
                  <div className={`flex items-center gap-3 px-4 py-3 ${cityEnabled ? 'bg-muted/30' : 'bg-muted/10'}`}>
                    <button
                      onClick={() => hasDistricts && toggleExpand(city)}
                      className={`shrink-0 ${hasDistricts ? 'cursor-pointer' : 'cursor-default opacity-0'}`}
                    >
                      {isExpanded
                        ? <ChevronDown className="w-4 h-4 text-muted-foreground" />
                        : <ChevronRight className="w-4 h-4 text-muted-foreground" />
                      }
                    </button>

                    <MapPin className="w-4 h-4 text-primary shrink-0" />

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-foreground text-sm">{city}</span>
                        {hasDistricts && (
                          <span className="text-xs text-muted-foreground">
                            ({enabledDistricts}/{districts.length} 区县启用)
                          </span>
                        )}
                      </div>
                    </div>

                    {cityRow && (
                      <button
                        onClick={() => handleToggle(cityRow)}
                        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
                          cityEnabled ? 'bg-primary' : 'bg-muted-foreground/30'
                        }`}
                      >
                        <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${
                          cityEnabled ? 'translate-x-6' : 'translate-x-1'
                        }`} />
                      </button>
                    )}

                    <button
                      onClick={() => cityRow && handleDelete(cityRow.id)}
                      className="p-1.5 rounded-lg hover:bg-red-50 text-muted-foreground hover:text-red-500 transition-colors shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* 区县列表 */}
                  {hasDistricts && isExpanded && (
                    <div className="divide-y divide-border/40">
                      {districts.map((d) => (
                        <div
                          key={d.id}
                          className={`flex items-center gap-3 px-4 py-2.5 pl-12 ${d.enabled === 1 ? '' : 'opacity-55'}`}
                        >
                          <span className="flex-1 text-sm text-foreground">{d.districtName}</span>

                          <button
                            onClick={() => handleToggle(d)}
                            className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${
                              d.enabled === 1 ? 'bg-primary' : 'bg-muted-foreground/30'
                            }`}
                          >
                            <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${
                              d.enabled === 1 ? 'translate-x-[18px]' : 'translate-x-0.5'
                            }`} />
                          </button>

                          <button
                            onClick={() => handleDelete(d.id)}
                            className="p-1 rounded-lg hover:bg-red-50 text-muted-foreground hover:text-red-500 transition-colors shrink-0"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
