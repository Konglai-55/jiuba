'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import {
  ChevronLeft,
  ChevronRight,
  MapPin,
  Download,
  X,
} from 'lucide-react'
import { recordContentCardClick } from '@/app/actions/stats'
import { recordDownload } from '@/app/actions/downloads'
interface Region {
  id: number
  cityName: string
  districtName: string | null
  enabled: number
}

interface ContentCard {
  id: number
  imageUrl: string | null
  region: string | null
}

interface NavCard {
  id: number
  title: string
}

type Step = 'select-city' | 'select-district' | 'images'

export default function CategoryPage() {
  const params = useParams()
  const id = params.id as string

  const [navCard, setNavCard] = useState<NavCard | null>(null)
  const [contentCards, setContentCards] = useState<ContentCard[]>([])
  const [loading, setLoading] = useState(true)
  const [imagesLoading, setImagesLoading] = useState(false)

  const [step, setStep] = useState<Step>('select-city')
  const [selectedCity, setSelectedCity] = useState<string>('')
  const [selectedDistrict, setSelectedDistrict] = useState<string>('')
  const [allRegions, setAllRegions] = useState<Region[]>([])

  // 从数据库地区数据派生城市列表和区县列表
  const cities = Array.from(new Map(allRegions.map((r) => [r.cityName, r])).values())
  const getDistricts = (cityName: string) => allRegions.filter((r) => r.cityName === cityName && r.districtName)

  // 图片预览
  const [previewCard, setPreviewCard] = useState<ContentCard | null>(null)
  const swipeStartX = useRef<number | null>(null)

  // 密码保护
  const [passwordRequired, setPasswordRequired] = useState(false)
  const [passwordVerified, setPasswordVerified] = useState(false)
  const [passwordInput, setPasswordInput] = useState('')
  const [passwordError, setPasswordError] = useState('')

  useEffect(() => {
    const init = async () => {
      try {
        const [navRes, regionsRes] = await Promise.all([
          fetch(`/api/nav-cards`),
          fetch(`/api/regions?navCardId=${id}`),
        ])
        if (navRes.ok) {
          const navData = await navRes.json()
          setNavCard(navData.find((c: NavCard) => c.id === parseInt(id)) || null)
        }
        if (regionsRes.ok) {
          setAllRegions(await regionsRes.json())
        }

        // 第一个导页不需要选地区，直接加载全部图片
        if (id === '1') {
          setStep('images')
          const res = await fetch(`/api/content-cards/${id}`)
          if (res.ok) setContentCards(await res.json())
        }

        const passwordCheckRes = await fetch(`/api/page-passwords/verify?navCardId=${id}`)
        if (passwordCheckRes.ok) {
          const { protected: isProtected } = await passwordCheckRes.json()
          if (isProtected) {
            const verified = sessionStorage.getItem(`page_password_verified_${id}`) === 'true'
            if (!verified) {
              setPasswordRequired(true)
              setLoading(false)
              return
            }
            setPasswordVerified(true)
          }
        }
      } catch (error) {
        console.error('Error init:', error)
      } finally {
        setLoading(false)
      }
    }

    if (!passwordRequired || passwordVerified) init()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, passwordRequired, passwordVerified])

  const fetchImages = async (cityId: string, districtId: string) => {
    setImagesLoading(true)
    try {
      const url = new URL(`/api/content-cards/${id}`, window.location.origin)
      if (cityId) url.searchParams.append('city', cityId)
      if (districtId) url.searchParams.append('district', districtId)
      const res = await fetch(url)
      if (res.ok) setContentCards(await res.json())
    } catch (error) {
      console.error('Error fetching images:', error)
    } finally {
      setImagesLoading(false)
    }
  }

  const handleSelectCity = (cityId: string) => {
    setSelectedCity(cityId)
    setSelectedDistrict('')
    setStep('select-district')
  }

  const handleSelectDistrict = async (districtId: string) => {
    setSelectedDistrict(districtId)
    await fetchImages(selectedCity, districtId)
    setStep('images')
  }

  const handleSkipDistrict = async () => {
    setSelectedDistrict('')
    await fetchImages(selectedCity, '')
    setStep('images')
  }

  const handleOpenPreview = async (card: ContentCard) => {
    try { await recordContentCardClick(card.id) } catch {}
    setPreviewCard(card)
  }

  const previewIndex = previewCard
    ? contentCards.findIndex((card) => card.id === previewCard.id)
    : -1
  const canShowPrevious = previewIndex > 0
  const canShowNext = previewIndex >= 0 && previewIndex < contentCards.length - 1

  const showPreviewAt = (index: number) => {
    const card = contentCards[index]
    if (!card) return

    setPreviewCard(card)
    void recordContentCardClick(card.id).catch(() => {})
  }

  const showPreviousPreview = () => {
    if (canShowPrevious) showPreviewAt(previewIndex - 1)
  }

  const showNextPreview = () => {
    if (canShowNext) showPreviewAt(previewIndex + 1)
  }

  useEffect(() => {
    if (!previewCard) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowLeft') showPreviousPreview()
      if (event.key === 'ArrowRight') showNextPreview()
      if (event.key === 'Escape') setPreviewCard(null)
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [previewCard, previewIndex, canShowPrevious, canShowNext])

  const handleDownload = async (card: ContentCard) => {
    const fileUrl = card.imageUrl || ''
    if (!fileUrl) return
    const ext = fileUrl.split('.').pop()?.split('?')[0] || 'jpg'
    const fileName = `image_${card.id}.${ext}`
    try { await recordDownload(card.id, fileUrl, fileName, 'image') } catch {}
    const link = document.createElement('a')
    link.href = fileUrl
    link.download = fileName
    link.click()
  }

  const handlePasswordSubmit = async () => {
    try {
      const res = await fetch('/api/page-passwords/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ navCardId: parseInt(id), password: passwordInput }),
      })
      if (res.ok) {
        const { valid } = await res.json()
        if (valid) {
          sessionStorage.setItem(`page_password_verified_${id}`, 'true')
          setPasswordVerified(true)
          setPasswordRequired(false)
          setPasswordError('')
        } else {
          setPasswordError('密码错误，请重试')
        }
      } else {
        setPasswordError('验证失败，请重试')
      }
    } catch {
      setPasswordError('验证失败，请重试')
    }
  }

  const getRegionLabel = () => {
    if (!selectedCity) return ''
    if (!selectedDistrict) return selectedCity
    return `${selectedCity} ${selectedDistrict}`
  }

  // ── 加载中 ────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  // ── 密码验证 ──────────────────────────────────────────
  if (passwordRequired && !passwordVerified) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <header className="px-4 py-3 flex items-center gap-3 border-b border-border/50">
          <Link href="/" className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center">
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-lg font-semibold">{navCard?.title || '分类详情'}</h1>
        </header>
        <div className="flex-1 flex items-center justify-center px-6">
          <div className="w-full max-w-sm space-y-6">
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h2 className="text-xl font-bold mb-2">需要密码访问</h2>
              <p className="text-sm text-muted-foreground">请输入密码以查看此页面内容</p>
            </div>
            <div className="space-y-3">
              <input
                type="password"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handlePasswordSubmit()}
                placeholder="请��入访问密码"
                className="w-full px-4 py-3 bg-secondary border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
              {passwordError && <p className="text-sm text-red-500 text-center">{passwordError}</p>}
              <button
                onClick={handlePasswordSubmit}
                className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-medium"
              >
                确认
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ── 第一步：选择城市 ────────────────────────────────────
  if (step === 'select-city') {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <header className="sticky top-0 z-10 bg-background border-b border-border/50">
          <div className="px-4 py-3 flex items-center gap-3">
            <Link href="/" className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center active:scale-95 transition-transform">
              <ChevronLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-base font-semibold text-foreground">{navCard?.title || '分类详情'}</h1>
              <p className="text-xs text-muted-foreground">选择城市</p>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          <div className="px-4 py-4">
            <p className="text-sm text-muted-foreground mb-4">请选择你所在的城市，以查看当地的酒馆资源</p>
            <div className="grid grid-cols-3 gap-2">
              {cities.map((city) => (
                <button
                  key={city.cityName}
                  onClick={() => handleSelectCity(city.cityName)}
                  className="flex flex-col items-center justify-center py-4 px-2 bg-secondary rounded-xl border border-border/50 active:scale-95 transition-transform hover:border-primary/50 hover:bg-primary/5"
                >
                  <MapPin className="w-5 h-5 text-primary mb-1.5" />
                  <span className="text-xs font-medium text-foreground text-center leading-tight">
                    {city.cityName.replace('市', '')}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </main>
      </div>
    )
  }

  // ── 第二步：选择区县 ────────────────────────────────────
  if (step === 'select-district') {
    const districts = getDistricts(selectedCity)

    return (
      <div className="min-h-screen bg-background flex flex-col">
        <header className="sticky top-0 z-10 bg-background border-b border-border/50">
          <div className="px-4 py-3 flex items-center gap-3">
            <button
              onClick={() => setStep('select-city')}
              className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center active:scale-95 transition-transform"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-base font-semibold text-foreground">{selectedCity}</h1>
              <p className="text-xs text-muted-foreground">选择区县</p>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          <div className="px-4 py-4 space-y-2">
            {/* 查看全城市 */}
            <button
              onClick={handleSkipDistrict}
              className="w-full flex items-center justify-between px-4 py-4 bg-primary/5 border border-primary/20 rounded-xl active:scale-[0.98] transition-transform"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
                  <MapPin className="w-4 h-4 text-primary" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-semibold text-foreground">全部 {selectedCity}</p>
                  <p className="text-xs text-muted-foreground">查看该城市所有区域</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </button>

            <p className="text-xs text-muted-foreground px-1 pt-2 pb-1">或选择具体区县</p>

            <div className="grid grid-cols-3 gap-2">
              {districts.map((district) => (
                <button
                  key={district.id}
                  onClick={() => handleSelectDistrict(district.districtName!)}
                  className="flex flex-col items-center justify-center py-4 px-2 bg-secondary rounded-xl border border-border/50 active:scale-95 transition-transform hover:border-primary/50 hover:bg-primary/5"
                >
                  <span className="text-xs font-medium text-foreground text-center leading-tight">
                    {district.districtName}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </main>
      </div>
    )
  }

  // ── 第三步：图片展示 ────────────────────────────────────
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 bg-background border-b border-border/50">
        <div className="px-4 py-3 flex items-center gap-3">
          {id === '1' ? (
            <Link href="/" className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center active:scale-95 transition-transform">
              <ChevronLeft className="w-5 h-5" />
            </Link>
          ) : (
            <button
              onClick={() => setStep('select-district')}
              className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center active:scale-95 transition-transform"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          )}
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-semibold text-foreground truncate">{navCard?.title}</h1>
            {id !== '1' && (
              <button
                onClick={() => setStep('select-city')}
                className="flex items-center gap-1 text-xs text-primary mt-0.5"
              >
                <MapPin className="w-3 h-3" />
                <span>{getRegionLabel()}</span>
                <span className="text-muted-foreground ml-0.5">· 切换</span>
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="pb-10">
        {imagesLoading ? (
          <div className="flex items-center justify-center py-24">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : contentCards.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 px-4">
            <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mb-4">
              <MapPin className="w-7 h-7 text-muted-foreground" />
            </div>
            <p className="text-foreground font-medium mb-1">暂无内容</p>
            <p className="text-sm text-muted-foreground text-center">该地区暂时没有酒馆资源</p>
            {id !== '1' && (
              <button
                onClick={() => setStep('select-city')}
                className="mt-6 px-6 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-medium"
              >
                重新选择地区
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2 p-3">
            {contentCards.map((card) => (
              <button
                key={card.id}
                onClick={() => handleOpenPreview(card)}
                className="relative aspect-square overflow-hidden rounded-xl bg-secondary active:opacity-80 transition-opacity shadow-sm"
              >
                {card.imageUrl ? (
                  <img
                    src={card.imageUrl}
                    alt={card.region || '图片'}
                    className="w-full h-full object-cover"
                    loading="lazy"
                    decoding="async"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-secondary">
                    <svg className="w-8 h-8 text-muted-foreground/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                )}
                {card.region && (
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent px-2 py-2 rounded-b-xl">
                    <p className="text-white text-xs truncate font-medium">{card.region}</p>
                  </div>
                )}
              </button>
            ))}
          </div>
        )}
      </main>

      {/* 图片全屏预览 */}
      {previewCard && (
        <div
          className="fixed inset-0 z-50 bg-black flex flex-col"
          onTouchStart={(event) => {
            swipeStartX.current = event.touches[0]?.clientX ?? null
          }}
          onTouchEnd={(event) => {
            const startX = swipeStartX.current
            const endX = event.changedTouches[0]?.clientX
            swipeStartX.current = null
            if (startX === null || endX === undefined) return

            const distance = endX - startX
            if (distance > 50) showPreviousPreview()
            if (distance < -50) showNextPreview()
          }}
        >
          <div className="flex items-center justify-between px-4 py-3 absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-black/70 to-transparent">
            <div className="flex items-center gap-2 text-white/80 text-xs">
              {previewCard.region && (
                <span className="flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  {previewCard.region}
                </span>
              )}
              <span className="text-white/50">
                {previewIndex + 1}/{contentCards.length}
              </span>
            </div>
            <div className="flex items-center gap-2 ml-auto">
              {previewCard.imageUrl && (
                <button
                  onClick={() => handleDownload(previewCard)}
                  className="w-9 h-9 rounded-full bg-white/20 backdrop-blur flex items-center justify-center active:opacity-70"
                >
                  <Download className="w-4 h-4 text-white" />
                </button>
              )}
              <button
                onClick={() => setPreviewCard(null)}
                className="w-9 h-9 rounded-full bg-white/20 backdrop-blur flex items-center justify-center active:opacity-70"
              >
                <X className="w-4 h-4 text-white" />
              </button>
            </div>
          </div>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation()
              showPreviousPreview()
            }}
            disabled={!canShowPrevious}
            aria-label="上一张"
            className="absolute left-3 top-1/2 z-10 -translate-y-1/2 rounded-full bg-black/25 p-2 text-white/70 backdrop-blur-sm disabled:pointer-events-none disabled:opacity-0"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation()
              showNextPreview()
            }}
            disabled={!canShowNext}
            aria-label="下一张"
            className="absolute right-3 top-1/2 z-10 -translate-y-1/2 rounded-full bg-black/25 p-2 text-white/70 backdrop-blur-sm disabled:pointer-events-none disabled:opacity-0"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
          <div className="flex-1 flex items-center justify-center p-4" onClick={() => setPreviewCard(null)}>
            {previewCard.imageUrl ? (
              <img
                key={previewCard.id}
                src={previewCard.imageUrl}
                alt={previewCard.region || '图片'}
                className="max-w-full max-h-full object-contain rounded-lg"
                fetchPriority="high"
                decoding="async"
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <div className="text-white/50 text-sm">暂无图片</div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
