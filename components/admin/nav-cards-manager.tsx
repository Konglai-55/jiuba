'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Plus, Trash2, Edit2 } from 'lucide-react'
import { createNavCard, updateNavCard, deleteNavCard, getNavCards } from '@/app/actions/nav-cards'
import { toast } from 'sonner'
import { optimizeImageForUpload } from '@/lib/optimize-image'

interface NavCard {
  id: number
  title: string
  description: string | null
  imageUrl: string | null
  category: string
  displayOrder: number
}

interface NavCardsManagerProps {
  initialCards: NavCard[]
}

export default function NavCardsManager({ initialCards }: NavCardsManagerProps) {
  const [cards, setCards] = useState<NavCard[]>(initialCards)
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    imageUrl: '',
    category: '',
  })
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    const loadCards = async () => {
      try {
        const data = await getNavCards()
        setCards(data)
      } catch (error) {
        console.error('Error loading cards:', error)
        toast.error('加载卡片失败')
      } finally {
        setLoading(false)
      }
    }
    loadCards()
  }, [])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    try {
      const optimizedFile = await optimizeImageForUpload(file)
      const formDataObj = new FormData()
      formDataObj.append('file', optimizedFile)
      const res = await fetch('/api/upload', { method: 'POST', body: formDataObj })
      const json = await res.json().catch(() => null)
      if (res.ok && json?.url) {
        const { url } = json
        setFormData((prev) => ({ ...prev, imageUrl: url }))
        toast.success('图片上传成功')
      } else {
        throw new Error(json?.error || `图片上传失败（HTTP ${res.status}）`)
      }
    } catch (error) {
      console.error('Upload error:', error)
      toast.error(error instanceof Error ? error.message : '上传失败')
    } finally {
      setUploading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (editingId) {
        await updateNavCard(editingId, formData)
        setCards((prev) =>
          prev.map((card) => (card.id === editingId ? { ...card, ...formData } : card))
        )
        toast.success('卡片已更新')
      } else {
        const newCard = await createNavCard(formData)
        setCards((prev) => [...prev, newCard])
        toast.success('卡片已创建')
      }
      setOpen(false)
      setEditingId(null)
      setFormData({ title: '', description: '', imageUrl: '', category: '' })
    } catch (error) {
      console.error('Submit error:', error)
      toast.error('操作失败')
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('确认删除此卡片？')) return
    try {
      await deleteNavCard(id)
      setCards((prev) => prev.filter((card) => card.id !== id))
      toast.success('卡片已删除')
    } catch (error) {
      console.error('Delete error:', error)
      toast.error('删除失败')
    }
  }

  const handleEdit = (card: NavCard) => {
    setEditingId(card.id)
    setFormData({
      title: card.title,
      description: card.description || '',
      imageUrl: card.imageUrl || '',
      category: card.category,
    })
    setOpen(true)
  }

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen)
    if (!newOpen) {
      setEditingId(null)
      setFormData({ title: '', description: '', imageUrl: '', category: '' })
    }
  }

  if (loading) {
    return <div className="text-center py-8">加载中...</div>
  }

  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map((card) => (
          <Card key={card.id}>
            {card.imageUrl && (
              <div className="w-full h-40 overflow-hidden">
                <img src={card.imageUrl} alt={card.title} className="w-full h-full object-cover" />
              </div>
            )}
            <CardHeader>
              <CardTitle className="text-lg">{card.title}</CardTitle>
              <CardDescription>{card.category}</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground line-clamp-2">{card.description}</p>
              <div className="flex gap-2 mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 gap-2"
                  onClick={() => handleEdit(card)}
                >
                  <Edit2 className="w-4 h-4" />
                  编辑
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 gap-2 text-destructive hover:text-destructive"
                  onClick={() => handleDelete(card.id)}
                >
                  <Trash2 className="w-4 h-4" />
                  删除
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {cards.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">暂无卡片，点击"新增卡片"开始</p>
        </div>
      )}

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? '编辑卡片' : '新增卡片'}</DialogTitle>
            <DialogDescription>填写卡片信息</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">标题 *</label>
              <Input
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                placeholder="输入卡片标题"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">分类 *</label>
              <Input
                name="category"
                value={formData.category}
                onChange={handleInputChange}
                placeholder="输入分类名称"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">描述</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                placeholder="输入卡片描述"
                rows={3}
                className="w-full px-3 py-2 border border-input rounded-md text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">图片</label>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                disabled={uploading}
                className="w-full"
              />
              {formData.imageUrl && (
                <div className="mt-2">
                  <img src={formData.imageUrl} alt="Preview" className="w-full h-32 object-cover rounded" />
                </div>
              )}
            </div>
            <div className="flex gap-3 justify-end">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                取消
              </Button>
              <Button type="submit" disabled={uploading}>
                {editingId ? '保存' : '创建'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
