'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { LogOut, CreditCard, LayoutGrid } from 'lucide-react'

export default function AdminPage() {
  const router = useRouter()
  const [isAuthed, setIsAuthed] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const loggedIn = localStorage.getItem('admin_logged_in') === 'true'
    if (!loggedIn) {
      router.push('/admin/login')
      return
    }
    setIsAuthed(true)
    setIsLoading(false)
  }, [router])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-foreground">加载中...</div>
      </div>
    )
  }

  if (!isAuthed) {
    return null
  }

  const handleLogout = () => {
    localStorage.removeItem('admin_logged_in')
    router.push('/admin/login')
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-foreground">后台管理系统</h1>
          <Button variant="outline" size="sm" onClick={handleLogout} className="gap-2">
            <LogOut className="w-4 h-4" />
            登出
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Link
            href="/admin/dashboard/nav-cards"
            className="p-6 bg-card border border-border rounded-xl hover:border-primary transition-all group"
          >
            <div className="flex items-center gap-4 mb-3">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <LayoutGrid className="w-6 h-6 text-primary" />
              </div>
              <h2 className="text-xl font-bold text-foreground group-hover:text-primary transition-colors">
                导航卡片管理
              </h2>
            </div>
            <p className="text-muted-foreground">管理首页四个分类卡片的标题、描述和图片</p>
          </Link>

          <Link
            href="/admin/dashboard/content-cards"
            className="p-6 bg-card border border-border rounded-xl hover:border-primary transition-all group"
          >
            <div className="flex items-center gap-4 mb-3">
              <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
                <CreditCard className="w-6 h-6 text-accent" />
              </div>
              <h2 className="text-xl font-bold text-foreground group-hover:text-primary transition-colors">
                内容卡片管理
              </h2>
            </div>
            <p className="text-muted-foreground">管理各分类下的内容卡片、图片、视频和地区</p>
          </Link>
        </div>
      </main>
    </div>
  )
}
