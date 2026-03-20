import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getFavorites,
  addFavorite,
  removeFavorite,
  exportFavorites,
  searchFavorites,
  type QueryFavorite,
} from '@/lib/queryFavorites'
import { Toast } from '@/components/Toast'
import { Button } from '@/components/Button'

export default function Favorites() {
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [showAddForm, setShowAddForm] = useState(false)
  const [newFavorite, setNewFavorite] = useState({
    name: '',
    sql: '',
    category: '',
    description: '',
    tags: '',
  })
  const queryClient = useQueryClient()

  const { data: favoritesData, isLoading } = useQuery({
    queryKey: ['query-favorites', searchQuery],
    queryFn: () => searchFavorites(searchQuery),
  })

  const addMutation = useMutation({
    mutationFn: addFavorite,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['query-favorites'] })
      setToast({ message: '收藏已添加', type: 'success' })
      setShowAddForm(false)
      setNewFavorite({ name: '', sql: '', category: '', description: '', tags: '' })
    },
  })

  const removeMutation = useMutation({
    mutationFn: removeFavorite,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['query-favorites'] })
      setToast({ message: '收藏已删除', type: 'success' })
    },
  })

  const handleExport = async () => {
    try {
      const data = await exportFavorites('json')
      const blob = new Blob([data], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = 'query-favorites.json'
      link.click()
      setToast({ message: '导出成功', type: 'success' })
    } catch (error: any) {
      setToast({ message: `导出失败：${error.message}`, type: 'error' })
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newFavorite.name || !newFavorite.sql) {
      setToast({ message: '请填写名称和 SQL', type: 'error' })
      return
    }

    addMutation.mutate({
      ...newFavorite,
      tags: newFavorite.tags.split(',').map((t) => t.trim()).filter(Boolean),
    })
  }

  const handleUseFavorite = (sql: string) => {
    window.location.href = '/query?sql=' + encodeURIComponent(sql)
  }

  const favorites: QueryFavorite[] = favoritesData || []

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">查询收藏</h1>
        <div className="flex gap-2">
          <Button onClick={() => setShowAddForm(!showAddForm)} variant="primary">
            ➕ 添加收藏
          </Button>
          <Button onClick={handleExport} variant="secondary">
            📤 导出
          </Button>
        </div>
      </div>

      {/* 搜索框 */}
      <div className="card">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="搜索收藏..."
          className="input"
        />
      </div>

      {/* 添加收藏表单 */}
      {showAddForm && (
        <div className="card">
          <h3 className="text-lg font-semibold mb-4">添加收藏</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">名称 *</label>
              <input
                type="text"
                value={newFavorite.name}
                onChange={(e) => setNewFavorite({ ...newFavorite, name: e.target.value })}
                className="input"
                placeholder="我的查询"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">SQL *</label>
              <textarea
                value={newFavorite.sql}
                onChange={(e) => setNewFavorite({ ...newFavorite, sql: e.target.value })}
                className="input h-32 font-mono text-sm"
                placeholder="SELECT * FROM ..."
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">分类</label>
                <input
                  type="text"
                  value={newFavorite.category}
                  onChange={(e) => setNewFavorite({ ...newFavorite, category: e.target.value })}
                  className="input"
                  placeholder="用户管理"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">标签</label>
                <input
                  type="text"
                  value={newFavorite.tags}
                  onChange={(e) => setNewFavorite({ ...newFavorite, tags: e.target.value })}
                  className="input"
                  placeholder="用户，查询，常用"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">描述</label>
              <textarea
                value={newFavorite.description}
                onChange={(e) => setNewFavorite({ ...newFavorite, description: e.target.value })}
                className="input h-20"
                placeholder="查询描述..."
              />
            </div>
            <div className="flex gap-4">
              <button type="submit" className="btn-primary" disabled={addMutation.isPending}>
                {addMutation.isPending ? '保存中...' : '保存'}
              </button>
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="btn-secondary"
              >
                取消
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 收藏列表 */}
      {isLoading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-gray-500">加载中...</p>
        </div>
      ) : favorites.length === 0 ? (
        <div className="card text-center py-12 text-gray-500">
          {searchQuery ? '没有找到匹配的收藏' : '暂无收藏，点击右上角添加'}
        </div>
      ) : (
        <div className="space-y-4">
          {favorites.map((fav) => (
            <div key={fav.id} className="card">
              <div className="flex justify-between items-start mb-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-semibold text-lg">{fav.name}</h3>
                    {fav.category && (
                      <span className="px-2 py-1 bg-primary/10 text-primary rounded text-xs">
                        {fav.category}
                      </span>
                    )}
                    {fav.tags && fav.tags.length > 0 && (
                      <div className="flex gap-1">
                        {fav.tags.map((tag, i) => (
                          <span
                            key={i}
                            className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded text-xs"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  {fav.description && (
                    <p className="text-sm text-gray-500 mb-2">{fav.description}</p>
                  )}
                  <pre className="bg-gray-50 dark:bg-gray-900 p-3 rounded text-sm overflow-x-auto">
                    <code className="font-mono">{fav.sql}</code>
                  </pre>
                  <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                    <span>执行 {fav.executedCount} 次</span>
                    {fav.lastExecutedAt && (
                      <span>
                        最近执行：{new Date(fav.lastExecutedAt).toLocaleString('zh-CN')}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex gap-2 ml-4">
                  <button
                    onClick={() => handleUseFavorite(fav.sql)}
                    className="btn-primary text-sm"
                  >
                    ▶️ 使用
                  </button>
                  <button
                    onClick={() => removeMutation.mutate(fav.id)}
                    className="text-gray-500 hover:text-red-600"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {toast && (
        <Toast message={toast.message} type={toast.type} onHide={() => setToast(null)} />
      )}
    </div>
  )
}
