import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { dbApi } from '@/lib/api'
import {
  generateSyncPlan,
  validateSyncPlan,
  exportSyncPlan,
  calculateSyncProgress,
} from '@/lib/schemaSync'
import { Toast } from '@/components/Toast'
import { Button } from '@/components/Button'

export default function SchemaSync() {
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const [syncPlan, setSyncPlan] = useState<any>(null)
  const [isSyncing, setIsSyncing] = useState(false)
  const queryClient = useQueryClient()

  const { data: tablesData } = useQuery({
    queryKey: ['database-tables'],
    queryFn: () => dbApi.getTables(),
  })

  const tables = tablesData?.data || []

  const generateMutation = useMutation({
    mutationFn: async () => {
      // 模拟生成同步计划
      // 实际应该从两个不同的数据库获取表结构
      const sourceTables = tables
      const targetTables = tables.map((t: any) => ({
        ...t,
        columns: t.columns?.map((col: any, i: number) => ({
          ...col,
          type: i === 0 && col.type === 'VARCHAR(255)' ? 'VARCHAR(500)' : col.type,
        })),
      }))

      const plan = generateSyncPlan(sourceTables, targetTables, {
        sourceDatabase: 'source_db',
        targetDatabase: 'target_db',
      })

      const validation = validateSyncPlan(plan)
      return { plan, validation }
    },
    onSuccess: ({ plan, validation }) => {
      setSyncPlan(plan)
      if (validation.warnings.length > 0) {
        setToast({
          message: `生成完成，${validation.warnings.length} 个警告`,
          type: 'warning',
        })
      } else {
        setToast({ message: '同步计划生成成功', type: 'success' })
      }
    },
    onError: (error: any) => {
      setToast({ message: `生成失败：${error.message}`, type: 'error' })
    },
  })

  const executeMutation = useMutation({
    mutationFn: async (plan: any) => {
      setIsSyncing(true)
      // 模拟执行同步
      await new Promise((resolve) => setTimeout(resolve, 2000))
      setIsSyncing(false)
      return plan
    },
    onSuccess: () => {
      setToast({ message: '结构同步完成', type: 'success' })
      setSyncPlan(null)
    },
    onError: (error: any) => {
      setToast({ message: `同步失败：${error.message}`, type: 'error' })
    },
  })

  const handleExport = (format: 'sql' | 'json') => {
    if (!syncPlan) return
    const sql = exportSyncPlan(syncPlan, format)
    const blob = new Blob([sql], { type: `application/${format}` })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `schema-sync.${format}`
    link.click()
    setToast({ message: '导出成功', type: 'success' })
  }

  const progress = syncPlan ? calculateSyncProgress(syncPlan) : 0

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">数据结构同步</h1>
      </div>

      {/* 生成计划 */}
      <div className="card">
        <h3 className="text-lg font-semibold mb-4">1. 生成同步计划</h3>
        <p className="text-sm text-gray-500 mb-4">
          对比源数据库和目标数据库的表结构，生成同步 SQL 脚本
        </p>
        <Button
          onClick={() => generateMutation.mutate()}
          disabled={generateMutation.isPending || tables.length === 0}
        >
          {generateMutation.isPending ? '生成中...' : '🔍 生成同步计划'}
        </Button>
      </div>

      {/* 同步计划预览 */}
      {syncPlan && (
        <>
          <div className="card">
            <h3 className="text-lg font-semibold mb-4">2. 同步计划预览</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">
                  表数量：{syncPlan.tables.length}
                </span>
                <span className="text-sm text-gray-500">
                  进度：{progress}%
                </span>
              </div>

              {/* 进度条 */}
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div
                  className="bg-primary h-2 rounded-full transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>

              {/* 表列表 */}
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {syncPlan.tables.map((table: any, index: number) => (
                  <div
                    key={index}
                    className={`p-3 rounded border ${
                      table.action === 'create'
                        ? 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800'
                        : table.action === 'modify'
                        ? 'bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800'
                        : 'bg-gray-50 border-gray-200 dark:bg-gray-800 dark:border-gray-700'
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <span className="font-medium">{table.tableName}</span>
                        <span className="ml-2 text-xs text-gray-500">
                          {table.action === 'create' && '🆕 创建'}
                          {table.action === 'modify' && '✏️ 修改'}
                          {table.action === 'skip' && '✅ 无变化'}
                        </span>
                      </div>
                      {table.sql && table.sql.length > 0 && (
                        <span className="text-xs text-gray-500">
                          {table.sql.length} 条 SQL
                        </span>
                      )}
                    </div>
                    {table.columns && table.columns.length > 0 && (
                      <div className="mt-2 text-xs text-gray-500">
                        <span className="text-green-600">
                          +{table.columns.filter((c: any) => c.action === 'add').length}
                        </span>
                        {' / '}
                        <span className="text-yellow-600">
                          ~{table.columns.filter((c: any) => c.action === 'modify').length}
                        </span>
                        {' / '}
                        <span className="text-red-600">
                          -{table.columns.filter((c: any) => c.action === 'drop').length}
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 执行操作 */}
          <div className="card">
            <h3 className="text-lg font-semibold mb-4">3. 执行同步</h3>
            <div className="flex gap-4 flex-wrap">
              <Button
                onClick={() => executeMutation.mutate(syncPlan)}
                disabled={executeMutation.isPending || isSyncing}
              >
                {isSyncing ? '同步中...' : '▶️ 执行同步'}
              </Button>
              <Button
                onClick={() => handleExport('sql')}
                variant="secondary"
                disabled={isSyncing}
              >
                📄 导出 SQL
              </Button>
              <Button
                onClick={() => handleExport('json')}
                variant="secondary"
                disabled={isSyncing}
              >
                📊 导出 JSON
              </Button>
            </div>
          </div>
        </>
      )}

      {toast && (
        <Toast message={toast.message} type={toast.type} onHide={() => setToast(null)} />
      )}
    </div>
  )
}
