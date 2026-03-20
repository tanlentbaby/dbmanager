import React, { useState } from 'react'
import QueryBuilder from '@/components/QueryBuilder'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { dbApi } from '@/lib/api'
import { saveQuery } from '@/lib/queryHistory'
import { Toast } from '@/components/Toast'

export default function Query() {
  const [sql, setSql] = useState('')
  const [result, setResult] = useState<any>(null)
  const [showBuilder, setShowBuilder] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const queryClient = useQueryClient()

  const { data: tablesData } = useQuery({
    queryKey: ['database-tables'],
    queryFn: () => dbApi.getTables(),
  })

  const executeMutation = useMutation({
    mutationFn: async (sql: string) => {
      const startTime = Date.now()
      const result = await dbApi.executeQuery(sql)
      const duration = Date.now() - startTime
      return { ...result.data, duration }
    },
    onSuccess: async (data) => {
      setResult(data)
      queryClient.invalidateQueries({ queryKey: ['history'] })
      
      // 保存查询历史
      await saveQuery({
        sql,
        duration: data.duration,
        rowCount: data.rowCount,
        status: 'success',
      })
      
      setToast({ message: `查询成功！${data.rowCount} 行 • ${data.duration}ms`, type: 'success' })
    },
    onError: async (error: any) => {
      // 保存错误历史
      await saveQuery({
        sql,
        status: 'error',
        error: error.message,
      })
      
      setToast({ message: error.message, type: 'error' })
    },
  })

  const handleExecute = (querySql: string) => {
    setSql(querySql)
    executeMutation.mutate(querySql)
  }

  const tables = tablesData?.data || []

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">查询编辑器</h1>
        <button
          onClick={() => setShowBuilder(!showBuilder)}
          className="btn-secondary"
        >
          {showBuilder ? '📝 SQL 模式' : '🛠️ 构建器模式'}
        </button>
      </div>

      {showBuilder ? (
        <QueryBuilder tables={tables} onExecute={handleExecute} />
      ) : (
        <>
          <div className="card">
            <textarea
              value={sql}
              onChange={(e) => setSql(e.target.value)}
              className="w-full h-48 p-4 font-mono text-sm bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              placeholder="SELECT * FROM ..."
            />
            <div className="mt-4 flex gap-4">
              <button
                onClick={() => executeMutation.mutate(sql)}
                disabled={executeMutation.isPending || !sql.trim()}
                className="btn-primary"
              >
                {executeMutation.isPending ? '执行中...' : '▶️ 执行'}
              </button>
            </div>
          </div>

          {result && (
            <div className="card">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold">查询结果</h2>
                <span className="text-sm text-gray-500">
                  {result.rowCount} 行 • {result.duration}ms
                </span>
              </div>

              {result.columns && result.rows && result.rows.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                      <tr>
                        {result.columns.map((col: string, i: number) => (
                          <th key={i} className="px-4 py-3 text-left text-sm font-semibold">
                            {col}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                      {result.rows.slice(0, 100).map((row: any[], i: number) => (
                        <tr key={i}>
                          {row.map((cell: any, j: number) => (
                            <td key={j} className="px-4 py-3 text-sm">
                              {cell !== null ? String(cell) : 'NULL'}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {result.rows.length > 100 && (
                    <p className="text-sm text-gray-500 mt-4">
                      显示 100 / {result.rows.length} 行
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-gray-500">无数据</p>
              )}
            </div>
          )}
        </>
      )}

      {toast && (
        <Toast message={toast.message} type={toast.type} onHide={() => setToast(null)} />
      )}
    </div>
  )
}
