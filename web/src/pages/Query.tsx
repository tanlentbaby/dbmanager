import { useState } from 'react'
import { dbApi } from '@/lib/api'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import ImportExport from '@/components/ImportExport'

export default function Query() {
  const [sql, setSql] = useState('')
  const [result, setResult] = useState<any>(null)
  const queryClient = useQueryClient()

  const executeMutation = useMutation({
    mutationFn: (sql: string) => dbApi.executeQuery(sql),
    onSuccess: (data) => {
      setResult(data.data)
      queryClient.invalidateQueries({ queryKey: ['history'] })
    },
  })

  const handleExecute = () => {
    if (!sql.trim()) return
    executeMutation.mutate(sql)
  }

  const handleSave = () => {
    console.log('保存书签:', sql)
  }

  const handleAI = async () => {
    try {
      const { data } = await dbApi.optimizeSQL(sql)
      setSql(data.optimized)
    } catch (error) {
      console.error('AI 优化失败:', error)
    }
  }

  const handleImportData = (data: any[]) => {
    console.log('导入的数据:', data)
    // 可以生成 INSERT 语句或显示预览
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">查询编辑器</h1>
        <div className="flex space-x-4">
          <button onClick={handleAI} className="btn-secondary">
            🤖 AI 优化
          </button>
          <button onClick={handleSave} className="btn-secondary">
            💾 保存
          </button>
          <button
            onClick={handleExecute}
            disabled={executeMutation.isPending}
            className="btn-primary"
          >
            {executeMutation.isPending ? '执行中...' : '▶️ 执行'}
          </button>
        </div>
      </div>

      {/* SQL 编辑器 */}
      <div className="card">
        <textarea
          value={sql}
          onChange={(e) => setSql(e.target.value)}
          className="w-full h-48 p-4 font-mono text-sm bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
          placeholder="SELECT * FROM ..."
        />
      </div>

      {/* 结果展示 */}
      {result && (
        <>
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
                        <th
                          key={i}
                          className="px-4 py-3 text-left text-sm font-semibold"
                        >
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

          {/* 导入导出组件 */}
          <ImportExport
            data={result.rows}
            columns={result.columns}
            onImport={handleImportData}
          />
        </>
      )}

      {/* 错误提示 */}
      {executeMutation.error && (
        <div className="bg-red-100 dark:bg-red-900/20 border border-red-500 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg">
          ❌ {(executeMutation.error as Error).message}
        </div>
      )}
    </div>
  )
}
