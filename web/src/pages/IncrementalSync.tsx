import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { dbApi } from '@/lib/api'
import {
  generateIncrementalSyncPlan,
  validateIncrementalSyncPlan,
  exportIncrementalSyncReport,
  calculateIncrementalSyncProgress,
} from '@/lib/incrementalSync'
import { Toast } from '@/components/Toast'
import { Button } from '@/components/Button'

export default function IncrementalSync() {
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const [syncPlan, setSyncPlan] = useState<any>(null)
  const [isSyncing, setIsSyncing] = useState(false)
  const [options, setOptions] = useState({
    useTimestamp: true,
    detectDeletes: false,
    batchSize: 1000,
  })
  const queryClient = useQueryClient()

  const { data: tablesData } = useQuery({
    queryKey: ['database-tables'],
    queryFn: () => dbApi.getTables(),
  })

  const tables = tablesData?.data || []

  const generateMutation = useMutation({
    mutationFn: async () => {
      // 模拟生成增量同步计划
      const tableConfigs = tables.map((t: any) => ({
        name: t.name,
        keyColumn: 'id',
        timestampColumn: 'updated_at',
        lastSyncId: 0,
      }))

      // 模拟检查点
      const checkpoints = tableConfigs.map((config) => ({
        syncId: `checkpoint_${config.name}`,
        tableName: config.name,
        lastSyncId: config.lastSyncId,
        lastSyncTime: Date.now() - 86400000, // 24 小时前
        checksum: 'abc123',
      }))

      const plan = generateIncrementalSyncPlan(tables, checkpoints, {
        sourceDatabase: 'source_db',
        targetDatabase: 'target_db',
        tables: tableConfigs,
        useTimestamp: options.useTimestamp,
        batchSize: options.batchSize,
        detectDeletes: options.detectDeletes,
      })

      const validation = validateIncrementalSyncPlan(plan)
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
        setToast({ message: '增量同步计划生成成功', type: 'success' })
      }
    },
    onError: (error: any) => {
      setToast({ message: `生成失败：${error.message}`, type: 'error' })
    },
  })

  const executeMutation = useMutation({
    mutationFn: async (plan: any) => {
      setIsSyncing(true)
      // 模拟执行增量同步
      for (let i = 0; i < plan.tables.length; i++) {
        await new Promise((resolve) => setTimeout(resolve, 1000))
        plan.tables[i].status = 'completed'
        plan.progress = calculateIncrementalSyncProgress(plan)
        setSyncPlan({ ...plan })
      }
      setIsSyncing(false)
      return plan
    },
    onSuccess: () => {
      setToast({ message: '增量同步完成', type: 'success' })
      setSyncPlan(null)
    },
    onError: (error: any) => {
      setToast({ message: `同步失败：${error.message}`, type: 'error' })
    },
  })

  const handleExport = (format: 'txt' | 'json') => {
    if (!syncPlan) return
    const report = exportIncrementalSyncReport(syncPlan, format)
    const blob = new Blob([report], { type: `text/${format}` })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `incremental-sync.${format}`
    link.click()
    setToast({ message: '导出成功', type: 'success' })
  }

  const progress = syncPlan ? calculateIncrementalSyncProgress(syncPlan) : 0

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">增量同步</h1>
      </div>

      {/* 选项配置 */}
      <div className="card">
        <h3 className="text-lg font-semibold mb-4">同步选项</h3>
        <div className="space-y-4">
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={options.useTimestamp}
              onChange={(e) => setOptions({ ...options, useTimestamp: e.target.checked })}
              className="rounded"
            />
            <span className="text-sm">使用时间戳过滤</span>
          </label>
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={options.detectDeletes}
              onChange={(e) => setOptions({ ...options, detectDeletes: e.target.checked })}
              className="rounded"
            />
            <span className="text-sm">检测删除记录</span>
          </label>
          <div>
            <label className="block text-sm font-medium mb-2">批量大小</label>
            <input
              type="number"
              value={options.batchSize}
              onChange={(e) => setOptions({ ...options, batchSize: parseInt(e.target.value) || 1000 })}
              className="input w-32"
              min="100"
              max="10000"
            />
          </div>
        </div>
      </div>

      {/* 生成计划 */}
      <div className="card">
        <h3 className="text-lg font-semibold mb-4">1. 生成增量同步计划</h3>
        <p className="text-sm text-gray-500 mb-4">
          仅同步自上次同步后的新增和修改数据
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
                  <p className="text-sm text-gray-500">新增记录</p>
                  <p className="text-2xl font-bold text-green-600">{syncPlan.newRecords}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">更新记录</p>
                  <p className="text-2xl font-bold text-yellow-600">{syncPlan.updatedRecords}</p>
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
                        : table.newCount > 0
                        ? 'bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800'
                        : 'bg-gray-50 border-gray-200 dark:bg-gray-800 dark:border-gray-700'
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <span className="font-medium">{table.tableName}</span>
                        <span className="ml-2 text-xs text-gray-500">
                          最后同步 ID: {table.lastSyncId} → {table.currentMaxId}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-sm text-green-600">+{table.newCount}</span>
                        <span className="ml-2 text-xs">
                          {table.status === 'completed' && '✅ 完成'}
                          {table.status === 'running' && '🔄 同步中'}
                          {table.newCount === 0 && '✅ 无变化'}
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
