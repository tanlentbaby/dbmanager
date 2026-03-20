import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getHistory, deleteHistoryItem, clearHistory, exportHistory, type QueryHistory } from '@/lib/queryHistory'
import { Toast } from '@/components/Toast'
import { Button } from '@/components/Button'

export default function History() {
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const queryClient = useQueryClient()

  const { data: historyData, isLoading, refetch } = useQuery({
    queryKey: ['query-history', searchQuery],
    queryFn: () => getHistory({ search: searchQuery, limit: 100 }),
  })

  const deleteMutation = useMutation({
    mutationFn: deleteHistoryItem,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['query-history'] })
      setToast({ message: '记录已删除', type: 'success' })
    },
  })

  const clearMutation = useMutation({
    mutationFn: clearHistory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['query-history'] })
      setToast({ message: '历史记录已清空', type: 'success' })
    },
  })

  const handleExport = async (format: 'json' | 'csv' | 'sql') => {
    try {
      const data = await exportHistory(format)
      const blob = new Blob([data], { type: `text/${format}` })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `query-history.${format}`
      link.click()
      setToast({ message: '导出成功', type: 'success' })
    } catch (error: any) {
      setToast({ message: `导出失败：${error.message}`, type: 'error' })
    }
  }

  const handleRerun = (sql: string) => {
    // 跳转到查询页面并执行
    console.log('重新执行:', sql)
    window.location.href = '/query?sql=' + encodeURIComponent(sql)
  }

  const history: QueryHistory[] = historyData || []

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">查询历史</h1>
        <div className="flex gap-2">
          <Button onClick={() => handleExport('json')} variant="secondary" size="small">
            📄 JSON
          </Button>
          <Button onClick={() => handleExport('csv')} variant="secondary" size="small">
            📊 CSV
          </Button>
          <Button onClick={() => handleExport('sql')} variant="secondary" size="small">
            💾 SQL
          </Button>
          <Button
            onClick={() => {
              if (confirm('确定要清空所有历史记录吗？')) {
                clearMutation.mutate()
              }
            }}
            variant="secondary"
            size="small"
            className="text-red-600"
          >
            🗑️ 清空
          </Button>
        </div>
      </div>

      {/* 搜索框 */}
      <div className="card">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="搜索 SQL..."
          className="input"
        />
      </div>

      {/* 历史记录列表 */}
      {isLoading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-gray-500">加载中...</p>
        </div>
      ) : history.length === 0 ? (
        <div className="card text-center py-12 text-gray-500">
          暂无历史记录
        </div>
      ) : (
        <div className="space-y-4">
          {history.map((item) => (
            <div key={item.id} className="card">
              <div className="flex justify-between items-start mb-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span
                      className={`px-2 py-1 rounded text-xs ${
                        item.status === 'success'
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                          : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                      }`}
                    >
                      {item.status === 'success' ? '✅ 成功' : '❌ 失败'}
                    </span>
                    <span className="text-sm text-gray-500">
                      {new Date(item.executedAt).toLocaleString('zh-CN')}
                    </span>
                    {item.duration && (
                      <span className="text-sm text-gray-500">{item.duration}ms</span>
                    )}
                    {item.rowCount !== undefined && (
                      <span className="text-sm text-gray-500">{item.rowCount} 行</span>
                    )}
                  </div>
                  <pre className="bg-gray-50 dark:bg-gray-900 p-3 rounded text-sm overflow-x-auto">
                    <code className="font-mono">{item.sql}</code>
                  </pre>
                  {item.error && (
                    <p className="text-red-600 text-sm mt-2">❌ {item.error}</p>
                  )}
                </div>
                <div className="flex gap-2 ml-4">
                  <button
                    onClick={() => handleRerun(item.sql)}
                    className="text-primary hover:underline text-sm"
                  >
                    ▶️ 重新执行
                  </button>
                  <button
                    onClick={() => deleteMutation.mutate(item.id)}
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
