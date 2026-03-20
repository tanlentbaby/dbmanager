import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { dbApi } from '@/lib/api'
import {
  generateMigrationPlan,
  validateMigrationPlan,
  exportMigrationReport,
  calculateMigrationProgress,
} from '@/lib/dataMigration'
import { Toast } from '@/components/Toast'
import { Button } from '@/components/Button'

export default function DataMigration() {
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const [migrationPlan, setMigrationPlan] = useState<any>(null)
  const [isMigrating, setIsMigrating] = useState(false)
  const [options, setOptions] = useState({
    truncateTarget: false,
    disableConstraints: false,
    batchSize: 100,
  })
  const queryClient = useQueryClient()

  const { data: tablesData } = useQuery({
    queryKey: ['database-tables'],
    queryFn: () => dbApi.getTables(),
  })

  const tables = tablesData?.data || []

  const generateMutation = useMutation({
    mutationFn: async () => {
      const plan = generateMigrationPlan(tables, {
        sourceDatabase: 'source_db',
        targetDatabase: 'target_db',
        batchSize: options.batchSize,
        truncateTarget: options.truncateTarget,
        disableConstraints: options.disableConstraints,
      })

      const validation = validateMigrationPlan(plan)
      return { plan, validation }
    },
    onSuccess: ({ plan, validation }) => {
      setMigrationPlan(plan)
      if (validation.warnings.length > 0) {
        setToast({
          message: `生成完成，${validation.warnings.length} 个警告`,
          type: 'warning',
        })
      } else {
        setToast({ message: '迁移计划生成成功', type: 'success' })
      }
    },
    onError: (error: any) => {
      setToast({ message: `生成失败：${error.message}`, type: 'error' })
    },
  })

  const executeMutation = useMutation({
    mutationFn: async (plan: any) => {
      setIsMigrating(true)
      // 模拟执行迁移
      for (let i = 0; i < plan.tables.length; i++) {
        await new Promise((resolve) => setTimeout(resolve, 500))
        plan.tables[i].status = 'completed'
        plan.tables[i].migratedRows = plan.tables[i].sourceRows
        plan.migratedRows += plan.tables[i].sourceRows
        plan.progress = calculateMigrationProgress(plan)
        setMigrationPlan({ ...plan })
      }
      setIsMigrating(false)
      return plan
    },
    onSuccess: () => {
      setToast({ message: '数据迁移完成', type: 'success' })
    },
    onError: (error: any) => {
      setToast({ message: `迁移失败：${error.message}`, type: 'error' })
    },
  })

  const handleExport = (format: 'txt' | 'json' | 'csv') => {
    if (!migrationPlan) return
    const report = exportMigrationReport(migrationPlan, format)
    const blob = new Blob([report], { type: `text/${format}` })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `migration-report.${format}`
    link.click()
    setToast({ message: '导出成功', type: 'success' })
  }

  const progress = migrationPlan ? calculateMigrationProgress(migrationPlan) : 0

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">数据迁移</h1>
      </div>

      {/* 选项配置 */}
      <div className="card">
        <h3 className="text-lg font-semibold mb-4">迁移选项</h3>
        <div className="space-y-4">
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={options.truncateTarget}
              onChange={(e) => setOptions({ ...options, truncateTarget: e.target.checked })}
              className="rounded"
            />
            <span className="text-sm">迁移前清空目标表</span>
          </label>
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={options.disableConstraints}
              onChange={(e) => setOptions({ ...options, disableConstraints: e.target.checked })}
              className="rounded"
            />
            <span className="text-sm">临时禁用外键约束</span>
          </label>
          <div>
            <label className="block text-sm font-medium mb-2">批量大小</label>
            <input
              type="number"
              value={options.batchSize}
              onChange={(e) => setOptions({ ...options, batchSize: parseInt(e.target.value) || 100 })}
              className="input w-32"
              min="10"
              max="1000"
            />
          </div>
        </div>
      </div>

      {/* 生成计划 */}
      <div className="card">
        <h3 className="text-lg font-semibold mb-4">1. 生成迁移计划</h3>
        <Button
          onClick={() => generateMutation.mutate()}
          disabled={generateMutation.isPending || tables.length === 0}
        >
          {generateMutation.isPending ? '生成中...' : '📋 生成迁移计划'}
        </Button>
      </div>

      {/* 迁移计划预览 */}
      {migrationPlan && (
        <>
          <div className="card">
            <h3 className="text-lg font-semibold mb-4">2. 迁移计划预览</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-gray-500">总表数</p>
                  <p className="text-2xl font-bold">{migrationPlan.tables.length}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">总行数</p>
                  <p className="text-2xl font-bold">{migrationPlan.totalRows.toLocaleString()}</p>
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
                {migrationPlan.tables.map((table: any, index: number) => (
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
                          {table.migratedRows} / {table.sourceRows} 行
                        </span>
                      </div>
                      <span className="text-xs">
                        {table.status === 'pending' && '⏳ 等待'}
                        {table.status === 'running' && '🔄 进行中'}
                        {table.status === 'completed' && '✅ 完成'}
                        {table.status === 'failed' && '❌ 失败'}
                      </span>
                    </div>
                    {table.error && (
                      <p className="text-red-600 text-xs mt-1">{table.error}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 执行操作 */}
          <div className="card">
            <h3 className="text-lg font-semibold mb-4">3. 执行迁移</h3>
            <div className="flex gap-4 flex-wrap">
              <Button
                onClick={() => executeMutation.mutate(migrationPlan)}
                disabled={executeMutation.isPending || isMigrating}
              >
                {isMigrating ? '迁移中...' : '▶️ 开始迁移'}
              </Button>
              <Button
                onClick={() => handleExport('txt')}
                variant="secondary"
                disabled={isMigrating}
              >
                📄 导出报告
              </Button>
              <Button
                onClick={() => handleExport('csv')}
                variant="secondary"
                disabled={isMigrating}
              >
                📊 导出 CSV
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
