'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ChevronLeft, LogOut } from 'lucide-react'
import { setAdminPassword } from '@/app/actions/admin-password'

export default function PasswordManagementPage() {
  const router = useRouter()
  const [isAuthed, setIsAuthed] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (localStorage.getItem('admin_logged_in') !== 'true') {
      router.push('/admin/login')
      return
    }
    setIsAuthed(true)
  }, [router])

  const handleLogout = () => {
    localStorage.removeItem('admin_logged_in')
    router.push('/admin/login')
  }

  const handleSetPassword = async () => {
    if (!newPassword.trim()) return
    setSaving(true)
    const result = await setAdminPassword(newPassword)
    setSaving(false)
    if (result.success) {
      setNewPassword('')
      alert('密码修改成功')
    } else {
      alert('密码修改失败，请重试')
    }
  }

  if (!isAuthed) return null

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/admin/dashboard" className="hover:opacity-70 transition-opacity">
              <ChevronLeft className="w-5 h-5" />
            </Link>
            <h1 className="text-2xl font-bold text-foreground">密码管理</h1>
          </div>
          <Button variant="outline" size="sm" onClick={handleLogout} className="gap-2">
            <LogOut className="w-4 h-4" />
            登出
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-md">
        <div className="bg-card border border-border rounded-xl p-6">
          <h2 className="text-xl font-bold mb-2 text-foreground">设置管理员密码</h2>
          <p className="text-sm text-muted-foreground mb-4">
            当前密码不会被读取或显示；新密码将以哈希形式保存到 S3。
          </p>
          <Input
            type="password"
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
            placeholder="输入新密码"
            className="mb-4"
          />
          <Button
            onClick={handleSetPassword}
            disabled={saving || !newPassword.trim()}
            className="w-full"
          >
            {saving ? '保存中…' : '保存新密码'}
          </Button>
        </div>
      </main>
    </div>
  )
}
