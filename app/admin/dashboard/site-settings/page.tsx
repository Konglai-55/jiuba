'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ArrowLeft, Save, Upload, Loader2, X } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import { optimizeImageForUpload } from '@/lib/optimize-image'

export default function SiteSettingsPage() {
  const router = useRouter()
  const [isAuthed, setIsAuthed] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)

  const [siteName, setSiteName] = useState('酒馆推介')
  const [siteLogo, setSiteLogo] = useState('')
  const [homeTitle, setHomeTitle] = useState('发现优质酒馆')
  const [homeSubtitle, setHomeSubtitle] = useState('探索各地特色酒吧，品味独特体验')

  const logoInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const loggedIn = localStorage.getItem('admin_logged_in') === 'true'
    if (!loggedIn) {
      router.push('/admin/login')
      return
    }
    setIsAuthed(true)
    fetchSettings()
  }, [router])

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/site-settings')
      if (res.ok) {
        const data = await res.json()
        if (data.siteName) setSiteName(data.siteName)
        if (data.siteLogo !== undefined) setSiteLogo(data.siteLogo)
        if (data.homeTitle) setHomeTitle(data.homeTitle)
        if (data.homeSubtitle) setHomeSubtitle(data.homeSubtitle)
      }
    } catch (error) {
      console.error('Failed to fetch settings:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const saveSetting = async (key: string, value: string) => {
    await fetch('/api/site-settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, value }),
    })
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      await Promise.all([
        saveSetting('siteName', siteName),
        saveSetting('siteLogo', siteLogo),
        saveSetting('homeTitle', homeTitle),
        saveSetting('homeSubtitle', homeSubtitle),
      ])
      toast.success('设置已保存')
    } catch {
      toast.error('保存失败，请重试')
    } finally {
      setIsSaving(false)
    }
  }

  const handleLogoUpload = async (file: File) => {
    setUploading(true)
    setUploadProgress(0)

    let optimizedFile: File
    try {
      optimizedFile = await optimizeImageForUpload(file)
    } catch {
      optimizedFile = file
    }

    const data = new FormData()
    data.append('file', optimizedFile)

    const xhr = new XMLHttpRequest()

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        setUploadProgress(Math.round((e.loaded / e.total) * 100))
      }
    }

    xhr.onload = () => {
      try {
        const json = JSON.parse(xhr.responseText)
        if (xhr.status >= 200 && xhr.status < 300 && json.url) {
          setSiteLogo(json.url)
          toast.success('Logo 上传成功')
        } else {
          toast.error(json?.error || '上传失败')
        }
      } catch {
        toast.error('上传响应解析失败')
      } finally {
        setUploading(false)
        setUploadProgress(0)
      }
    }

    xhr.onerror = () => {
      toast.error('网络错误，上传失败')
      setUploading(false)
      setUploadProgress(0)
    }

    xhr.open('POST', '/api/upload')
    xhr.send(data)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!isAuthed) return null

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border sticky top-0 bg-background z-10">
        <div className="px-4 py-4 flex items-center gap-3">
          <Link href="/admin/dashboard">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <h1 className="text-xl font-bold text-foreground">站点设置</h1>
        </div>
      </header>

      <main className="px-4 py-6 max-w-lg mx-auto space-y-6">

        {/* 品牌设置 */}
        <section className="bg-card border border-border rounded-xl p-5 space-y-5">
          <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide text-muted-foreground">品牌</h2>

          {/* 网站名称 */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              网站名称
            </label>
            <Input
              value={siteName}
              onChange={(e) => setSiteName(e.target.value)}
              placeholder="酒馆推介"
            />
            <p className="mt-1 text-xs text-muted-foreground">显示在首页顶部导航栏的品牌名称</p>
          </div>

          {/* Logo 上传 */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              网站 Logo
            </label>
            <div className="flex items-center gap-4">
              {/* 预览 */}
              <div className="w-16 h-16 rounded-xl border-2 border-dashed border-border flex items-center justify-center bg-secondary shrink-0 overflow-hidden">
                {siteLogo ? (
                  <img src={siteLogo} alt="logo预览" className="w-full h-full object-cover rounded-xl" />
                ) : (
                  <span className="text-2xl font-bold text-muted-foreground/40">
                    {siteName?.[0] || '酒'}
                  </span>
                )}
              </div>

              <div className="flex-1 space-y-2">
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={uploading}
                    onClick={() => logoInputRef.current?.click()}
                    className="gap-2"
                  >
                    {uploading
                      ? <Loader2 className="w-4 h-4 animate-spin" />
                      : <Upload className="w-4 h-4" />
                    }
                    {uploading ? '上传中...' : '上传图片'}
                  </Button>
                  {siteLogo && !uploading && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-destructive gap-1"
                      onClick={() => setSiteLogo('')}
                    >
                      <X className="w-4 h-4" />
                      移除
                    </Button>
                  )}
                </div>

                {/* 上传进度条 */}
                {uploading && uploadProgress > 0 && (
                  <div>
                    <div className="flex justify-between text-xs text-muted-foreground mb-1">
                      <span>上传中...</span>
                      <span>{uploadProgress}%</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-primary h-1.5 rounded-full transition-all duration-200"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  </div>
                )}

                <p className="text-xs text-muted-foreground">推荐正方形图片，支持 JPG / PNG / WebP</p>
              </div>
            </div>

            <input
              ref={logoInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) handleLogoUpload(file)
              }}
            />
          </div>
        </section>

        {/* 首页文案 */}
        <section className="bg-card border border-border rounded-xl p-5 space-y-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">首页文案</h2>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">主标题</label>
            <Input
              value={homeTitle}
              onChange={(e) => setHomeTitle(e.target.value)}
              placeholder="发现优质酒馆"
            />
            <p className="mt-1 text-xs text-muted-foreground">首页卡片上方的大标题</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">副标题</label>
            <Input
              value={homeSubtitle}
              onChange={(e) => setHomeSubtitle(e.target.value)}
              placeholder="探索各地特色酒吧，品味独特体验"
            />
            <p className="mt-1 text-xs text-muted-foreground">主标题下方的描述文字</p>
          </div>
        </section>

        <Button onClick={handleSave} disabled={isSaving} className="w-full gap-2">
          {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {isSaving ? '保存中...' : '保存所有设置'}
        </Button>
      </main>
    </div>
  )
}
