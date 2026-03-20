import React, { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { dbApi } from '@/lib/api'
import { executeBatch, generateBatchInsert, generateBatchDelete, BatchOperation } from '@/lib/batchOperations'
import { Toast } from '@/components/Toast'
import { Button } from '@/components/Button'

interface BatchExecuteProps {
  tableName?: string
  columns?: string[]
}

export default function BatchExecute({ tableName, columns }: BatchExecuteProps) {
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const [sqlList, setSqlList] = useState('')
  const [operations, setOperations] = useState<BatchOperation[]>([])

  const executeMutation = useMutation({
    mutationFn: async (ops: BatchOperation[]) => {
      return await executeBatch(ops, (sql) => dbApi.executeQuery(sql))
    },
    onSuccess: (result) => {
      setToast({
        message: `执行完成：成功 ${result.success} / 失败 ${result.failed} / 耗时 ${result.duration}ms`,
        type: result.failed === 0 ? 'success' : 'warning',
      })
    },
    onError: (error: any) => {
      setToast({ message: `执行失败：${error.message}`, type: 'error' })
    },
  })

  const handleParseSQL = () => {
    const sqls = sqlList.split(';').filter((s) => s.trim())
    const ops: BatchOperation[] = sqls.map((sql, index) => ({
      id: `op_${index}`,
      type: 'execute',
      sql: sql.trim(),
      status: 'pending',
    }))
    setOperations(ops)
    setToast({ message: `解析成功：${ops.length} 条 SQL`, type: 'success' })
  }

  const handleExecute = () => {
    if (operations.length === 0) {
      setToast({ message: '请先添加 SQL 语句', type: 'error' })
      return
    }
    executeMutation.mutate(operations)
  }

  const handleClear = () => {
    setSqlList('')
    setOperations([])
  }

  const handleLoadSample = () => {
    const sample = `UPDATE users SET status = 'active' WHERE status = 'pending';
UPDATE users SET updated_at = NOW() WHERE id > 100;
DELETE FROM logs WHERE created_at < '2026-01-01';`
    setSqlList(sample)
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">批量执行</h3>
        <Button onClick={handleLoadSample} variant="secondary" size="small">
          📋 加载示例
        </Button>
      </div>

      {/* SQL 输入 */}
      <div className="card">
        <label className="block text-sm font-medium mb-2">SQL 语句 (每条用分号分隔)</label>
        <textarea
          value={sqlList}
          onChange={(e) => setSqlList(e.target.value)}
          className="input h-48 font-mono text-sm"
          placeholder="UPDATE ...; DELETE ...;"
        />
        <div className="mt-4 flex gap-4">
          <Button onClick={handleParseSQL}>🔍 解析 SQL</Button>
          <Button onClick={handleClear} variant="secondary">🗑️ 清空</Button>
        </div>
      </div>

      {/* 操作列表 */}
      {operations.length > 0 && (
        <div className="card">
          <h4 className="font-semibold mb-4">操作列表 ({operations.length})</h4>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {operations.map((op, index) => (
              <div
                key={op.id}
                className={`p-3 rounded border ${
                  op.status === 'success'
                    ? 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800'
                    : op.status === 'error'
                    ? 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800'
                    : 'bg-gray-50 border-gray-200 dark:bg-gray-800 dark:border-gray-700'
                }`}
              >
                <div className="flex justify-between items-center">
                  <span className="text-sm font-mono">
                    {index + 1}. {op.sql.substring(0, 50)}...
                  </span>
                  <span
                    className={`text-xs px-2 py-1 rounded ${
                      op.status === 'success'
                        ? 'bg-green-100 text-green-800'
                        : op.status === 'error'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {op.status === 'pending' ? '⏳ 等待' : op.status === 'success' ? '✅ 成功' : '❌ 失败'}
                  </span>
                </div>
                {op.error && <p className="text-red-600 text-xs mt-1">{op.error}</p>}
              </div>
            ))}
          </div>
          <div className="mt-4">
            <Button
              onClick={handleExecute}
              disabled={executeMutation.isPending || operations.length === 0}
            >
              {executeMutation.isPending ? '执行中...' : `▶️ 执行 (${operations.length} 条)`}
            </Button>
          </div>
        </div>
      )}

      {toast && (
        <Toast message={toast.message} type={toast.type} onHide={() => setToast(null)} />
      )}
    </div>
  )
}
