'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Lock } from 'lucide-react'
import { verifyAdminPassword } from '@/app/actions/admin-password'

export default function AdminLoginPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault()
    setLoading(true)
    setError('')

    try {
      if (await verifyAdminPassword(password)) {
        localStorage.setItem('admin_logged_in', 'true')
        router.push('/admin/dashboard')
      } else {
        setError('密码错误')
        setPassword('')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20 flex items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-2">
          <div className="flex justify-center mb-4">
            <div className="bg-primary p-3 rounded-lg">
              <Lock className="w-6 h-6 text-white" />
            </div>
          </div>
          <CardTitle className="text-center text-2xl">管理员登录</CardTitle>
          <CardDescription className="text-center">输入密码访问后台管理系统</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="password" className="block text-sm font-medium">
                密码
              </label>
              <Input
                id="password"
                type="password"
                placeholder="输入管理员密码"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoFocus
              />
              {error && <p className="text-sm text-destructive">{error}</p>}
            </div>
            <Button type="submit" className="w-full" disabled={loading || !password}>
              {loading ? '验证中…' : '登录'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
