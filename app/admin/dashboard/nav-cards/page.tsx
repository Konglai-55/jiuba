'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ChevronLeft, LogOut } from 'lucide-react'
import NavCardsManager from '@/components/admin/nav-cards-manager'
import AddNavCardDialog from '@/components/admin/add-nav-card-dialog'

export default function NavCardsPage() {
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
          <div className="flex items-center gap-4">
            <Link href="/admin/dashboard" className="hover:opacity-70 transition-opacity">
              <ChevronLeft className="w-5 h-5" />
            </Link>
            <h1 className="text-2xl font-bold">导航卡片管理</h1>
          </div>
          <Button variant="outline" size="sm" onClick={handleLogout} className="gap-2">
            <LogOut className="w-4 h-4" />
            登出
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold">导航卡片列表</h2>
          <AddNavCardDialog />
        </div>
        <NavCardsManager initialCards={[]} />
      </main>
    </div>
  )
}
