'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ArrowLeft, Save, Trash2 } from 'lucide-react'
import Link from 'next/link'

interface NavCard {
  id: number
  title: string
}

interface PagePassword {
  id: number
  navCardId: number
  password: string
  hasPassword?: boolean
  enabled: number
  navCardTitle: string
}

export default function PagePasswordsPage() {
  const router = useRouter()
  const [isAuthed, setIsAuthed] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [navCards, setNavCards] = useState<NavCard[]>([])
  const [passwords, setPasswords] = useState<PagePassword[]>([])
  const [selectedCard, setSelectedCard] = useState<number | null>(null)
  const [password, setPassword] = useState('')
  const [enabled, setEnabled] = useState(false)
  const [message, setMessage] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    const loggedIn = localStorage.getItem('admin_logged_in') === 'true'
    if (!loggedIn) {
      router.push('/admin/login')
      return
    }
    setIsAuthed(true)
    fetchData()
  }, [router])

  const fetchData = async () => {
    try {
      const [cardsRes, passwordsRes] = await Promise.all([
        fetch('/api/nav-cards'),
        fetch('/api/page-passwords'),
      ])
      
      if (cardsRes.ok) {
        const cardsData = await cardsRes.json()
        setNavCards(cardsData)
      }
      
      if (passwordsRes.ok) {
        const passwordsData = await passwordsRes.json()
        setPasswords(passwordsData)
      }
    } catch (error) {
      console.error('Failed to fetch data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCardSelect = (cardId: number) => {
    setSelectedCard(cardId)
    const existingPassword = passwords.find((p) => p.navCardId === cardId)
    if (existingPassword) {
      setPassword('')
      setEnabled(existingPassword.enabled === 1)
    } else {
      setPassword('')
      setEnabled(false)
    }
    setMessage('')
  }

  const handleSave = async () => {
    const existingPassword = passwords.find((p) => p.navCardId === selectedCard)
    if (!selectedCard || (!password && !existingPassword?.hasPassword)) {
      setMessage('请选择页面并输入密码')
      return
    }

    setIsSaving(true)
    setMessage('')

    try {
      const res = await fetch('/api/page-passwords', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          navCardId: selectedCard,
          password,
          enabled,
        }),
      })

      if (res.ok) {
        setMessage('保存成功！')
        fetchData()
      } else {
        setMessage('保存失败，请重试')
      }
    } catch (error) {
      console.error('Failed to save:', error)
      setMessage('保存失败，请重试')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async (navCardId: number) => {
    if (!confirm('确定要删除这个页面的密码保护吗？')) return

    try {
      const res = await fetch(`/api/page-passwords?navCardId=${navCardId}`, {
        method: 'DELETE',
      })

      if (res.ok) {
        setMessage('删除成功！')
        fetchData()
        if (selectedCard === navCardId) {
          setSelectedCard(null)
          setPassword('')
          setEnabled(false)
        }
      }
    } catch (error) {
      console.error('Failed to delete:', error)
    }
  }

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

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Link href="/admin/dashboard">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <h1 className="text-2xl font-bold text-foreground">页面密码保护</h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* 已设置密码的页面 */}
          <div className="bg-card border border-border rounded-xl p-6">
            <h2 className="text-lg font-bold text-foreground mb-4">已保护的页面</h2>
            {passwords.length === 0 ? (
              <p className="text-muted-foreground">暂无设置密码保护的页面</p>
            ) : (
              <div className="space-y-3">
                {passwords.map((p) => (
                  <div
                    key={p.id}
                    className={`flex items-center justify-between p-3 rounded-lg border ${
                      p.enabled ? 'border-green-500 bg-green-500/5' : 'border-border bg-muted/30'
                    }`}
                  >
                    <div>
                      <p className="font-medium text-foreground">{p.navCardTitle}</p>
                      <p className="text-xs text-muted-foreground">
                        {p.enabled ? '已启用' : '已禁用'} · 密码: {p.password}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCardSelect(p.navCardId)}
                      >
                        编辑
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-red-500 hover:text-red-600"
                        onClick={() => handleDelete(p.navCardId)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 设置密码 */}
          <div className="bg-card border border-border rounded-xl p-6">
            <h2 className="text-lg font-bold text-foreground mb-4">设置密码保护</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  选择页面
                </label>
                <select
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground"
                  value={selectedCard || ''}
                  onChange={(e) => handleCardSelect(Number(e.target.value))}
                >
                  <option value="">请选择...</option>
                  {navCards.map((card) => (
                    <option key={card.id} value={card.id}>
                      {card.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  访问密码
                </label>
                <Input
                  type="text"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="输入访问密码"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="enabled"
                  checked={enabled}
                  onChange={(e) => setEnabled(e.target.checked)}
                  className="w-4 h-4"
                />
                <label htmlFor="enabled" className="text-sm text-foreground">
                  启用密码保护
                </label>
              </div>

              {message && (
                <p className={`text-sm ${message.includes('成功') ? 'text-green-500' : 'text-red-500'}`}>
                  {message}
                </p>
              )}

              <Button onClick={handleSave} disabled={isSaving || !selectedCard} className="gap-2">
                <Save className="w-4 h-4" />
                {isSaving ? '保存中...' : '保存设置'}
              </Button>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
