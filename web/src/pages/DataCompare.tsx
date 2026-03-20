import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { dbApi } from '@/lib/api'
import { compareTableSchemas, formatDiffReport } from '@/lib/dataCompare'
import { Toast } from '@/components/Toast'
import { Button } from '@/components/Button'

export default function DataCompare() {
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const [schema1, setSchema1] = useState<any[]>([])
  const [schema2, setSchema2] = useState<any[]>([])
  const [selectedTable, setSelectedTable] = useState('')
  const [diff, setDiff] = useState<any>(null)

  const { data: tablesData } = useQuery({
    queryKey: ['database-tables'],
    queryFn: () => dbApi.getTables(),
  })

  const tables = tablesData?.data || []

  const handleCompare = async () => {
    if (!selectedTable) {
      setToast({ message: '请选择要对比的表', type: 'error' })
      return
    }

    try {
      // 模拟从两个不同数据库获取表结构
      // 实际应该连接两个不同的数据库
      const table1 = tables.find((t: any) => t.name === selectedTable)
      const table2 = {
        ...table1,
        columns: table1?.columns?.map((col: any, i: number) => ({
          ...col,
          type: i === 0 ? 'VARCHAR(500)' : col.type, // 模拟类型变化
        })),
      }

      const tableDiff = compareTableSchemas(selectedTable, table1?.columns || [], table2?.columns || [])
      setDiff(tableDiff)
      setToast({ message: '对比完成', type: 'success' })
    } catch (error: any) {
      setToast({ message: `对比失败：${error.message}`, type: 'error' })
    }
  }

  const handleExport = () => {
    if (!diff) return
    const report = formatDiffReport(diff)
    const blob = new Blob([report], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${selectedTable}_diff.txt`
    link.click()
    setToast({ message: '报告已导出', type: 'success' })
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">数据对比工具</h1>
      </div>

      {/* 表选择 */}
      <div className="card">
        <h3 className="text-lg font-semibold mb-4">1. 选择表</h3>
        <select
          value={selectedTable}
          onChange={(e) => setSelectedTable(e.target.value)}
          className="input"
        >
          <option value="">请选择表</option>
          {tables.map((table: any) => (
            <option key={table.name} value={table.name}>
              {table.name}
            </option>
          ))}
        </select>
      </div>

      {/* 对比按钮 */}
      <div className="card">
        <div className="flex gap-4">
          <Button onClick={handleCompare} disabled={!selectedTable}>
            🔍 开始对比
          </Button>
          {diff && (
            <Button onClick={handleExport} variant="secondary">
              📤 导出报告
            </Button>
          )}
        </div>
      </div>

      {/* 对比结果 */}
      {diff && (
        <div className="card">
          <h3 className="text-lg font-semibold mb-4">对比结果</h3>
          <pre className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg overflow-x-auto text-sm">
            {formatDiffReport(diff)}
          </pre>

          {/* 详细变化 */}
          <div className="mt-4 space-y-4">
            {diff.columnsAdded.length > 0 && (
              <div>
                <h4 className="font-semibold text-green-600 mb-2">
                  新增列 ({diff.columnsAdded.length})
                </h4>
                <div className="space-y-2">
                  {diff.columnsAdded.map((col: any) => (
                    <div key={col.name} className="p-2 bg-green-50 dark:bg-green-900/20 rounded">
                      <span className="text-green-800 dark:text-green-400">
                        + {col.name} {col.type}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {diff.columnsRemoved.length > 0 && (
              <div>
                <h4 className="font-semibold text-red-600 mb-2">
                  删除列 ({diff.columnsRemoved.length})
                </h4>
                <div className="space-y-2">
                  {diff.columnsRemoved.map((col: any) => (
                    <div key={col.name} className="p-2 bg-red-50 dark:bg-red-900/20 rounded">
                      <span className="text-red-800 dark:text-red-400">
                        - {col.name} {col.type}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {diff.columnsModified.length > 0 && (
              <div>
                <h4 className="font-semibold text-yellow-600 mb-2">
                  修改列 ({diff.columnsModified.length})
                </h4>
                <div className="space-y-2">
                  {diff.columnsModified.map((col: any) => (
                    <div key={col.name} className="p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded">
                      <span className="text-yellow-800 dark:text-yellow-400">
                        ~ {col.name}: {col.oldValue?.type} → {col.newValue?.type}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {diff.columnsAdded.length === 0 &&
              diff.columnsRemoved.length === 0 &&
              diff.columnsModified.length === 0 && (
                <div className="text-center py-8 text-green-600">
                  ✅ 表结构完全一致
                </div>
              )}
          </div>
        </div>
      )}

      {toast && (
        <Toast message={toast.message} type={toast.type} onHide={() => setToast(null)} />
      )}
    </div>
  )
}
