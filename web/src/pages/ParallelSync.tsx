import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tantml/react-query'
import { dbApi } from '@/lib/api'
import {
  createParallelSyncPlan,
  validateParallelSyncPlan,
  exportParallelSyncReport,
  calculateParallelSyncProgress,
  updateTableTask,
} from '@/lib/parallelSync'
import { Toast } from '@/components/Toast'
import { Button } from '@/components/Button'

export default function ParallelSync() {
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const [syncPlan, setSyncPlan] = useState<any>(null)
  const [isSyncing, setIsSyncing] = useState(false)
  const [options, setOptions] = useState({
    concurrency: 4,
  })
  const queryClient = useQueryClient()

  const { data: tablesData } = useQuery({
    queryKey: ['database-tables'],
    queryFn: () => dbApi.getTables(),
  })

  const tables = tablesData?.data || []

  const generateMutation = useMutation({
    mutationFn: async () => {
      const plan = createParallelSyncPlan(
        tables.map((t: any) => ({ name: t.name, rowCount: t.rowCount || 1000 })),
        {
          sourceDatabase: 'source_db',
          targetDatabase: 'target_db',
          tables: tables.map((t: any) => t.name),
          concurrency: options.concurrency,
        }
      )

      const validation = validateParallelSyncPlan(plan)
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
        setToast({ message: '并行同步计划生成成功', type: 'success' })
      }
    },
    onError: (error: any) => {
      setToast({ message: `生成失败：${error.message}`, type: 'error' })
    },
  })

  const executeMutation = useMutation({
    mutationFn: async (plan: any) => {
      setIsSyncing(true)
      // 模拟并行执行
      const workerCount = plan.concurrency
      const tableGroups = Array.from({ length: workerCount }, () => [] as any[])

      // 分配表到工作线程
      plan.tables.forEach((table: any, index: number) => {
        tableGroups[index % workerCount].push(table)
      })

      // 模拟每个工作线程执行
      const promises = tableGroups.map(async (group, workerIndex) => {
        for (const table of group) {
          await new Promise((resolve) => setTimeout(resolve, 500))
          const updatedPlan = updateTableTask(plan, table.tableName, {
            status: 'completed',
            processedRows: table.totalRows,
            duration: 500,
          })
          setSyncPlan(updatedPlan)
          plan = updatedPlan
        }
      })

      await Promise.all(promises)
      setIsSyncing(false)
      return plan
    },
    onSuccess: () => {
      setToast({ message: '并行同步完成', type: 'success' })
      setSyncPlan(null)
    },
    onError: (error: any) => {
      setToast({ message: `同步失败：${error.message}`, type: 'error' })
    },
  })

  const handleExport = (format: 'txt' | 'json') => {
    if (!syncPlan) return
    const report = exportParallelSyncReport(syncPlan, format)
    const blob = new Blob([report], { type: `text/${format}` })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `parallel-sync.${format}`
    link.click()
    setToast({ message: '导出成功', type: 'success' })
  }

  const progress = syncPlan ? calculateParallelSyncProgress(syncPlan) : 0

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">并行同步</h1>
      </div>

      {/* 选项配置 */}
      <div className="card">
        <h3 className="text-lg font-semibold mb-4">同步选项</h3>
        <div>
          <label className="block text-sm font-medium mb-2">并发数</label>
          <input
            type="number"
            value={options.concurrency}
            onChange={(e) => setOptions({ ...options, concurrency: parseInt(e.target.value) || 4 })}
            className="input w-32"
            min="1"
            max="16"
          />
          <p className="text-xs text-gray-500 mt-1">
            建议值：CPU 核心数，最大 16
          </p>
        </div>
      </div>

      {/* 生成计划 */}
      <div className="card">
        <h3 className="text-lg font-semibold mb-4">1. 生成并行同步计划</h3>
        <p className="text-sm text-gray-500 mb-4">
          多表并行同步，提升同步速度
        </p>
        <Button
          onClick={() => generateMutation.mutate()}
          disabled={generateMutation.isPending || tables.length === 0}
        >
          {generateMutation.isPending ? '生成中...' : '📋 生成同步计划'}
        </Button>
      </div>

      {/* 同步计划预览 */}
      {syncPlan && (
        <>
          <div className="card">
            <h3 className="text-lg font-semibold mb-4">2. 同步计划预览</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-gray-500">表数量</p>
                  <p className="text-2xl font-bold">{syncPlan.tables.length}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">并发数</p>
                  <p className="text-2xl font-bold">{syncPlan.concurrency}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">总行数</p>
                  <p className="text-2xl font-bold">{syncPlan.totalRows.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">进度</p>
                  <p className="text-2xl font-bold">{progress}%</p>
                </div>
              </div>

              {/* 进度条 */}
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                <div
                  className="bg-primary h-3 rounded-full transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>

              {/* 表列表 */}
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {syncPlan.tables.map((table: any, index: number) => (
                  <div
                    key={index}
                    className={`p-3 rounded border ${
                      table.status === 'completed'
                        ? 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800'
                        : table.status === 'running'
                        ? 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800'
                        : table.status === 'failed'
                        ? 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800'
                        : 'bg-gray-50 border-gray-200 dark:bg-gray-800 dark:border-gray-700'
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <span className="font-medium">{table.tableName}</span>
                        <span className="ml-2 text-xs text-gray-500">
                          {table.processedRows} / {table.totalRows} 行
                        </span>
                      </div>
                      <div className="text-right">
                        {table.duration && (
                          <span className="text-xs text-gray-500 mr-2">{table.duration}ms</span>
                        )}
                        <span className="text-xs">
                          {table.status === 'completed' && '✅ 完成'}
                          {table.status === 'running' && '🔄 同步中'}
                          {table.status === 'failed' && '❌ 失败'}
                          {table.status === 'pending' && '⏳ 等待'}
                        </span>
                      </div>
                    </div>
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
                {isSyncing ? '同步中...' : '▶️ 开始同步'}
              </Button>
              <Button
                onClick={() => handleExport('txt')}
                variant="secondary"
                disabled={isSyncing}
              >
                📄 导出报告
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
