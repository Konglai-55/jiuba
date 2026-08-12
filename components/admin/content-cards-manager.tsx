'use client'

import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Plus, Trash2, Loader2, ImagePlus, X, CheckSquare, Square, MapPin, ChevronDown } from 'lucide-react'
import { createContentCard, deleteContentCard, getContentCardsByNavCard } from '@/app/actions/content-cards'
import { optimizeImageForUpload } from '@/lib/optimize-image'
import { getNavCards } from '@/app/actions/nav-cards'
import { toast } from 'sonner'
interface Region {
  id: number
  cityName: string
  districtName: string | null
  enabled: number
}

interface NavCard {
  id: number
  title: string
}

interface ContentCard {
  id: number
  navCardId: number
  title: string
  description: string | null
  imageUrl: string | null
  videoUrl: string | null
  detail: string | null
  address: string | null
  region: string | null
}

interface UploadItem {
  id: string
  file: File
  preview: string
  progress: number
  status: 'pending' | 'uploading' | 'done' | 'error'
  url?: string
  pathname?: string
  error?: string
}

interface UploadedFile {
  url: string
  pathname: string
}

async function runWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  worker: (item: T) => Promise<R>
) {
  const results: PromiseSettledResult<R>[] = new Array(items.length)
  let cursor = 0
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor++
      try {
        results[index] = { status: 'fulfilled', value: await worker(items[index]) }
      } catch (error) {
        results[index] = { status: 'rejected', reason: error }
      }
    }
  })
  await Promise.all(workers)
  return results
}

export default function ContentCardsManager() {
  const [navCards, setNavCards] = useState<NavCard[]>([])
  const [contentCards, setContentCards] = useState<ContentCard[]>([])
  const [selectedNavCard, setSelectedNavCard] = useState<string>('')
  const [loading, setLoading] = useState(true)

  // 地区数据（从 API 加载）
  const [allRegions, setAllRegions] = useState<Region[]>([])
  const cities = Array.from(new Map(allRegions.map((r) => [r.cityName, r])).values())
  const getDistricts = (cityName: string) => allRegions.filter((r) => r.cityName === cityName && r.districtName)

  // 上传面板状态
  const [panelOpen, setPanelOpen] = useState(false)
  const [selectedCity, setSelectedCity] = useState<string>('')
  const [selectedDistrict, setSelectedDistrict] = useState<string>('')
  const [customLabel, setCustomLabel] = useState<string>('')
  const [uploadItems, setUploadItems] = useState<UploadItem[]>([])
  const [saving, setSaving] = useState(false)

  // 批量选择状态
  const [selectMode, setSelectMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [deleting, setDeleting] = useState(false)

  // 按地区快速删除面板
  const [regionPanelOpen, setRegionPanelOpen] = useState(false)
  const [deletingRegion, setDeletingRegion] = useState<string | null>(null)

  // 从当前图片列表派生地区分组
  const regionGroups = contentCards.reduce<Record<string, number[]>>((acc, card) => {
    const key = card.region || '未分配地区'
    if (!acc[key]) acc[key] = []
    acc[key].push(card.id)
    return acc
  }, {})

  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const fetchInit = async () => {
      try {
        const cards = await getNavCards()
        setNavCards(cards)
        if (cards.length > 0) setSelectedNavCard(String(cards[0].id))
      } catch {
        toast.error('加载数据失败')
      }
    }
    fetchInit()
  }, [])

  // 切换导页时重新加载对应地区
  useEffect(() => {
    if (!selectedNavCard) return
    fetch(`/api/regions?all=true&navCardId=${selectedNavCard}`)
      .then((r) => r.ok ? r.json() : [])
      .then(setAllRegions)
      .catch(() => {})
  }, [selectedNavCard])

  // 切换导页时加载对应内容卡片
  useEffect(() => {
    if (!selectedNavCard) return
    setLoading(true)
    getContentCardsByNavCard(parseInt(selectedNavCard))
      .then(setContentCards)
      .catch(() => toast.error('加载内容失败'))
      .finally(() => setLoading(false))
  }, [selectedNavCard])

  // 拼接地区存储名称（城市名 + 区县名 + 自定义文字）
  const resolveRegion = () => {
    const base = selectedCity
      ? selectedDistrict
        ? `${selectedCity} ${selectedDistrict}`
        : selectedCity
      : ''
    const suffix = customLabel.trim()
    if (!base && !suffix) return ''
    if (!base) return suffix
    if (!suffix) return base
    return `${base} ${suffix}`
  }

  // 选择文件后生成预览并加入队列
  const handleFilesSelected = (files: FileList | null) => {
    if (!files || files.length === 0) return
    const newItems: UploadItem[] = Array.from(files).map((file) => ({
      id: `${Date.now()}-${Math.random()}`,
      file,
      preview: URL.createObjectURL(file),
      progress: 0,
      status: 'pending',
    }))
    setUploadItems((prev) => [...prev, ...newItems])
  }

  // 上传单个文件，返回 url
  const uploadFile = async (item: UploadItem): Promise<UploadedFile> => {
    const file = await optimizeImageForUpload(item.file)

    return new Promise((resolve, reject) => {
      const data = new FormData()
      data.append('file', file)
      const xhr = new XMLHttpRequest()

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          const progress = Math.round((e.loaded / e.total) * 100)
          setUploadItems((prev) =>
            prev.map((i) => (i.id === item.id ? { ...i, progress, status: 'uploading' } : i))
          )
        }
      }

      xhr.onload = () => {
        try {
          const json = JSON.parse(xhr.responseText)
          if (xhr.status >= 200 && xhr.status < 300 && json.url && json.pathname) {
            setUploadItems((prev) =>
              prev.map((i) =>
                i.id === item.id
                  ? {
                      ...i,
                      progress: 100,
                      status: 'done',
                      url: json.url,
                      pathname: json.pathname,
                      error: undefined,
                    }
                  : i
              )
            )
            resolve({ url: json.url, pathname: json.pathname })
          } else {
            const errMsg = json?.error || '上传失败'
            setUploadItems((prev) =>
              prev.map((i) => (i.id === item.id ? { ...i, status: 'error', error: errMsg } : i))
            )
            reject(new Error(errMsg))
          }
        } catch {
          setUploadItems((prev) =>
            prev.map((i) => (i.id === item.id ? { ...i, status: 'error', error: '响应解析失败' } : i))
          )
          reject(new Error('响应解析失败'))
        }
      }

      xhr.onerror = () => {
        setUploadItems((prev) =>
          prev.map((i) => (i.id === item.id ? { ...i, status: 'error', error: '网络错误' } : i))
        )
        reject(new Error('网络错误'))
      }

      xhr.ontimeout = () => {
        setUploadItems((prev) =>
          prev.map((i) =>
            i.id === item.id ? { ...i, status: 'error', error: '上传超时，请重试' } : i
          )
        )
        reject(new Error('上传超时，请重试'))
      }

      xhr.timeout = 120_000
      xhr.open('POST', '/api/upload')
      xhr.send(data)
    })
  }

  const cleanupUploadedFile = async (pathname: string) => {
    const response = await fetch(`/api/upload?pathname=${encodeURIComponent(pathname)}`, {
      method: 'DELETE',
    })
    if (!response.ok) {
      const body = await response.json().catch(() => null)
      throw new Error(body?.error || '清理上传文件失败')
    }
  }

  // 限制并发，逐个完成“上传文件 + 保存内容记录”。
  const handleSaveAll = async () => {
    if (!selectedNavCard) {
      toast.error('请先选择分类')
      return
    }
    if (uploadItems.length === 0) {
      toast.error('请先选择图片')
      return
    }

    setSaving(true)
    const region = resolveRegion()
    const successfulIds = new Set<string>()

    const results = await runWithConcurrency(uploadItems, 3, async (item) => {
      let uploaded: UploadedFile | null =
        item.url && item.pathname ? { url: item.url, pathname: item.pathname } : null
      try {
        uploaded ||= await uploadFile(item)
        const newCard = await createContentCard({
          navCardId: parseInt(selectedNavCard),
          title: item.file.name,
          imageUrl: uploaded.url,
          region,
        })
        setContentCards((prev) => [...prev, newCard])
        successfulIds.add(item.id)
        return newCard
      } catch (error) {
        if (uploaded?.pathname) {
          await cleanupUploadedFile(uploaded.pathname).catch((cleanupError) => {
            console.error('Failed to clean up orphaned upload:', cleanupError)
          })
        }
        const message = error instanceof Error ? error.message : '保存失败'
        setUploadItems((prev) =>
          prev.map((current) =>
            current.id === item.id
              ? {
                  ...current,
                  status: 'error',
                  progress: 0,
                  url: undefined,
                  pathname: undefined,
                  error: message,
                }
              : current
          )
        )
        throw error
      }
    })

    const successCount = results.filter((result) => result.status === 'fulfilled').length
    const failureCount = results.length - successCount
    uploadItems
      .filter((item) => successfulIds.has(item.id))
      .forEach((item) => URL.revokeObjectURL(item.preview))
    setUploadItems((prev) => prev.filter((item) => !successfulIds.has(item.id)))
    setSaving(false)

    if (successCount > 0) {
      toast.success(`成功保存 ${successCount} 张图片`)
    }
    if (failureCount > 0) {
      toast.error(`${failureCount} 张图片失败，已保留在列表中，可查看原因后重试`)
      return
    }

    closePanel()
  }

  const closePanel = () => {
    uploadItems.forEach((item) => URL.revokeObjectURL(item.preview))
    setPanelOpen(false)
    setUploadItems([])
    setSelectedCity('')
    setSelectedDistrict('')
    setCustomLabel('')
  }

  const removeItem = (id: string) => {
    setUploadItems((prev) => {
      const item = prev.find((i) => i.id === id)
      if (item) URL.revokeObjectURL(item.preview)
      return prev.filter((i) => i.id !== id)
    })
  }

  const toggleSelectMode = () => {
    setSelectMode((v) => !v)
    setSelectedIds(new Set())
  }

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleSelectAll = () => {
    if (selectedIds.size === contentCards.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(contentCards.map((c) => c.id)))
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('确认删除此图片？')) return
    try {
      await deleteContentCard(id)
      setContentCards((prev) => prev.filter((c) => c.id !== id))
      toast.success('已删除')
    } catch {
      toast.error('删除失败')
    }
  }

  const handleDeleteRegion = async (region: string) => {
    const ids = regionGroups[region]
    if (!ids || ids.length === 0) return
    if (!confirm(`确认删除「${region}」下全部 ${ids.length} 张图片？此操作不可恢复。`)) return
    setDeletingRegion(region)
    let successCount = 0
    for (const id of ids) {
      try {
        await deleteContentCard(id)
        successCount++
      } catch {
        // 忽略单条失败
      }
    }
    setContentCards((prev) => prev.filter((c) => !ids.includes(c.id)))
    setDeletingRegion(null)
    toast.success(`已删除「${region}」下 ${successCount} 张图片`)
  }

  const handleBatchDelete = async () => {
    if (selectedIds.size === 0) return
    if (!confirm(`确认删除选中的 ${selectedIds.size} 张图片？此操作不可恢复。`)) return
    setDeleting(true)
    let successCount = 0
    for (const id of selectedIds) {
      try {
        await deleteContentCard(id)
        successCount++
      } catch {
        // 忽略单条失败
      }
    }
    setContentCards((prev) => prev.filter((c) => !selectedIds.has(c.id)))
    setSelectedIds(new Set())
    setSelectMode(false)
    setDeleting(false)
    toast.success(`已删除 ${successCount} 张图片`)
  }

  const isUploading = uploadItems.some((i) => i.status === 'uploading')

  return (
    <div>
      {/* 分类选择 */}
      <div className="mb-6">
        <label className="block text-sm font-medium mb-2">选择分类</label>
        <Select value={selectedNavCard} onValueChange={setSelectedNavCard}>
          <SelectTrigger>
            <SelectValue placeholder="选择要管理的分类" />
          </SelectTrigger>
          <SelectContent>
            {navCards.map((card) => (
              <SelectItem key={card.id} value={String(card.id)}>
                {card.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedNavCard && (
        <>
          {/* 头部操作栏 */}
          <div className="mb-6 flex justify-between items-center gap-3">
            <h2 className="text-xl font-semibold shrink-0">
              图片列表
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                共 {contentCards.length} 张
              </span>
            </h2>
            <div className="flex items-center gap-2">
              {selectMode ? (
                <>
                  <span className="text-sm text-muted-foreground whitespace-nowrap">
                    已选 {selectedIds.size} 张
                  </span>
                  <Button variant="outline" size="sm" onClick={toggleSelectAll}>
                    {selectedIds.size === contentCards.length ? '取消全选' : '全选'}
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    className="gap-1.5"
                    disabled={selectedIds.size === 0 || deleting}
                    onClick={handleBatchDelete}
                  >
                    {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                    删除 {selectedIds.size > 0 ? selectedIds.size : ''} 张
                  </Button>
                  <Button variant="ghost" size="sm" onClick={toggleSelectMode} disabled={deleting}>
                    取消
                  </Button>
                </>
              ) : (
                <>
                  {contentCards.length > 0 && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1.5"
                        onClick={() => setRegionPanelOpen((v) => !v)}
                      >
                        <MapPin className="w-4 h-4" />
                        按地区删除
                        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${regionPanelOpen ? 'rotate-180' : ''}`} />
                      </Button>
                      <Button variant="outline" size="sm" className="gap-1.5" onClick={toggleSelectMode}>
                        <CheckSquare className="w-4 h-4" />
                        批量删除
                      </Button>
                    </>
                  )}
                  <Button className="gap-2" onClick={() => setPanelOpen(true)}>
                    <Plus className="w-4 h-4" />
                    上传图片
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* 按地区快速删除面板 */}
          {regionPanelOpen && !selectMode && (
            <div className="mb-6 border border-border rounded-xl overflow-hidden">
              <div className="bg-muted/50 px-4 py-2.5 flex items-center justify-between border-b border-border">
                <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <MapPin className="w-4 h-4 text-primary" />
                  按地区快速删除
                </div>
                <span className="text-xs text-muted-foreground">{Object.keys(regionGroups).length} 个地区</span>
              </div>
              <div className="divide-y divide-border">
                {Object.entries(regionGroups)
                  .sort(([a], [b]) => a.localeCompare(b, 'zh'))
                  .map(([region, ids]) => (
                    <div key={region} className="flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-sm font-medium text-foreground truncate">{region}</span>
                        <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full shrink-0">
                          {ids.length} 张
                        </span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="gap-1.5 text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0 ml-3"
                        disabled={deletingRegion === region}
                        onClick={() => handleDeleteRegion(region)}
                      >
                        {deletingRegion === region
                          ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          : <Trash2 className="w-3.5 h-3.5" />
                        }
                        {deletingRegion === region ? '删除中...' : '删除全部'}
                      </Button>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* 上传面板 */}
          {panelOpen && (
            <div className="mb-6 border border-border rounded-xl p-5 bg-card space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-foreground">批量上传图片</h3>
                <button onClick={closePanel} className="text-muted-foreground hover:text-foreground">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* 地区选择 + 自定义文字 */}
              <div className="flex gap-2">
                <select
                  value={selectedCity}
                  onChange={(e) => {
                    setSelectedCity(e.target.value)
                    setSelectedDistrict('')
                  }}
                  className="flex-1 min-w-0 px-3 py-2 border border-input rounded-md text-sm bg-background"
                >
                  <option value="">选择城市（可选）</option>
                  {cities.map((city) => (
                    <option key={city.cityName} value={city.cityName}>
                      {city.cityName}
                    </option>
                  ))}
                </select>
                <select
                  value={selectedDistrict}
                  onChange={(e) => setSelectedDistrict(e.target.value)}
                  disabled={!selectedCity}
                  className="flex-1 min-w-0 px-3 py-2 border border-input rounded-md text-sm bg-background disabled:opacity-50"
                >
                  <option value="">选择区县（可选）</option>
                  {getDistricts(selectedCity).map((d) => (
                    <option key={d.id} value={d.districtName!}>
                      {d.districtName}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  value={customLabel}
                  onChange={(e) => setCustomLabel(e.target.value)}
                  placeholder="自定义文字（可选）"
                  className="w-32 shrink-0 px-3 py-2 border border-input rounded-md text-sm bg-background placeholder:text-muted-foreground"
                />
              </div>
              {/* 实时预览拼接结果 */}
              {resolveRegion() && (
                <p className="text-xs text-muted-foreground -mt-1">
                  地区标签预览：<span className="font-medium text-foreground">{resolveRegion()}</span>
                </p>
              )}

              {/* 拖拽/点击上传区域 */}
              <div
                className="border-2 border-dashed border-border rounded-xl p-8 text-center cursor-pointer hover:border-primary hover:bg-primary/5 transition-colors"
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault()
                  handleFilesSelected(e.dataTransfer.files)
                }}
              >
                <ImagePlus className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm font-medium text-foreground">点击选择或拖拽图片到此处</p>
                <p className="text-xs text-muted-foreground mt-1">支持 JPG、PNG、WebP，可多选</p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                className="hidden"
                onChange={(e) => handleFilesSelected(e.target.files)}
              />

              {/* 待上传预览列表 */}
              {uploadItems.length > 0 && (
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
                  {uploadItems.map((item) => (
                    <div key={item.id} className="relative group aspect-square">
                      <img
                        src={item.preview}
                        alt={item.file.name}
                        className="w-full h-full object-cover rounded-lg border border-border"
                      />
                      {/* 进度遮罩 */}
                      {(item.status === 'uploading' || item.status === 'pending') && (
                        <div className="absolute inset-0 bg-black/40 rounded-lg flex flex-col items-center justify-center">
                          {item.status === 'uploading' ? (
                            <>
                              <Loader2 className="w-5 h-5 text-white animate-spin mb-1" />
                              <span className="text-white text-xs font-medium">{item.progress}%</span>
                            </>
                          ) : (
                            <span className="text-white text-xs">待上传</span>
                          )}
                        </div>
                      )}
                      {item.status === 'done' && (
                        <div className="absolute inset-0 bg-green-500/20 rounded-lg flex items-center justify-center">
                          <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
                            <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                        </div>
                      )}
                      {item.status === 'error' && (
                        <div className="absolute inset-0 bg-red-500/20 rounded-lg flex items-center justify-center">
                          <span
                            className="text-red-600 text-xs font-medium px-1 text-center line-clamp-3"
                            title={item.error}
                          >
                            {item.error || '失败'}
                          </span>
                        </div>
                      )}
                      {/* 删除按钮 */}
                      {item.status !== 'uploading' && (
                        <button
                          onClick={() => removeItem(item.id)}
                          className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 text-white hidden group-hover:flex items-center justify-center shadow"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* 底部操作 */}
              <div className="flex justify-end gap-3 pt-2">
                <Button variant="outline" onClick={closePanel} disabled={isUploading || saving}>
                  取消
                </Button>
                <Button
                  onClick={handleSaveAll}
                  disabled={uploadItems.length === 0 || isUploading || saving}
                  className="gap-2"
                >
                  {(isUploading || saving) && <Loader2 className="w-4 h-4 animate-spin" />}
                  {saving ? '保存中...' : isUploading ? '上传中...' : `保存全部 (${uploadItems.length})`}
                </Button>
              </div>
            </div>
          )}

          {/* 图片网格 */}
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : contentCards.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <ImagePlus className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">暂无图片，点击"上传图片"开始</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {contentCards.map((card) => {
                const isSelected = selectedIds.has(card.id)
                return (
                  <div
                    key={card.id}
                    className={`relative group aspect-square cursor-pointer ${selectMode ? 'select-none' : ''}`}
                    onClick={() => selectMode && toggleSelect(card.id)}
                  >
                    {card.imageUrl ? (
                      <img
                        src={card.imageUrl}
                        alt={card.title}
                        className={`w-full h-full object-cover rounded-xl border-2 transition-all ${
                          isSelected ? 'border-primary opacity-80' : 'border-border'
                        }`}
                      />
                    ) : (
                      <div className={`w-full h-full rounded-xl border-2 bg-secondary flex items-center justify-center ${
                        isSelected ? 'border-primary' : 'border-border'
                      }`}>
                        <ImagePlus className="w-6 h-6 text-muted-foreground" />
                      </div>
                    )}
                    {/* 地区标签 */}
                    {card.region && (
                      <div className="absolute bottom-0 left-0 right-0 px-2 py-1 bg-black/50 rounded-b-xl">
                        <p className="text-white text-xs truncate">{card.region}</p>
                      </div>
                    )}
                    {/* 批量选择模式：勾选图标 */}
                    {selectMode && (
                      <div className={`absolute top-1.5 left-1.5 w-6 h-6 rounded-full flex items-center justify-center shadow ${
                        isSelected ? 'bg-primary text-primary-foreground' : 'bg-white/80 text-muted-foreground'
                      }`}>
                        {isSelected
                          ? <CheckSquare className="w-4 h-4" />
                          : <Square className="w-4 h-4" />
                        }
                      </div>
                    )}
                    {/* 单张删除按钮（非批量模式） */}
                    {!selectMode && (
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDelete(card.id) }}
                        className="absolute top-1.5 right-1.5 w-7 h-7 rounded-full bg-red-500 text-white hidden group-hover:flex items-center justify-center shadow-md"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}
    </div>
  )
}
