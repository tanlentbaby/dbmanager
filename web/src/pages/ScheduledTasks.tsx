import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  createScheduledTask,
  updateScheduledTask,
  toggleTask,
  getCommonCronExpressions,
  validateCronExpression,
  calculateNextRun,
} from '@/lib/scheduledTasks'
import { Toast } from '@/components/Toast'
import { Button } from '@/components/Button'

export default function ScheduledTasks() {
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newTask, setNewTask] = useState({
    name: '',
    type: 'incremental_sync' as const,
    cronExpression: '0 0 * * *',
    sourceDatabase: '',
    targetDatabase: '',
  })
  const queryClient = useQueryClient()

  // 模拟任务列表
  const { data: tasks } = useQuery({
    queryKey: ['scheduled-tasks'],
    queryFn: () => Promise.resolve([
      {
        id: 'task_1',
        name: '每日增量同步',
        type: 'incremental_sync' as const,
        cronExpression: '0 0 * * *',
        enabled: true,
        lastRun: Date.now() - 86400000,
        nextRun: calculateNextRun('0 0 * * *').getTime(),
        lastStatus: 'success' as const,
        config: { sourceDatabase: 'source', targetDatabase: 'target' },
        createdAt: Date.now() - 172800000,
        updatedAt: Date.now(),
      },
    ]),
  })

  const createMutation = useMutation({
    mutationFn: async (taskData: any) => {
      const task = createScheduledTask(
        taskData.name,
        taskData.type,
        taskData.cronExpression,
        {
          sourceDatabase: taskData.sourceDatabase,
          targetDatabase: taskData.targetDatabase,
        }
      )
      return task
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduled-tasks'] })
      setToast({ message: '任务创建成功', type: 'success' })
      setShowCreateForm(false)
      setNewTask({ name: '', type: 'incremental_sync', cronExpression: '0 0 * * *', sourceDatabase: '', targetDatabase: '' })
    },
    onError: (error: any) => {
      setToast({ message: `创建失败：${error.message}`, type: 'error' })
    },
  })

  const toggleMutation = useMutation({
    mutationFn: async ({ task, enabled }: { task: any; enabled: boolean }) => {
      return toggleTask(task, enabled)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduled-tasks'] })
    },
  })

  const handleCreate = () => {
    if (!newTask.name || !newTask.cronExpression) {
      setToast({ message: '请填写必填项', type: 'error' })
      return
    }

    const validation = validateCronExpression(newTask.cronExpression)
    if (!validation.valid) {
      setToast({ message: `Cron 表达式无效：${validation.error}`, type: 'error' })
      return
    }

    createMutation.mutate(newTask)
  }

  const handleUseTemplate = (expression: string) => {
    setNewTask({ ...newTask, cronExpression: expression })
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">定时任务</h1>
        <Button onClick={() => setShowCreateForm(!showCreateForm)}>
          ➕ 创建任务
        </Button>
      </div>

      {/* 创建任务表单 */}
      {showCreateForm && (
        <div className="card">
          <h3 className="text-lg font-semibold mb-4">创建定时任务</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">任务名称 *</label>
              <input
                type="text"
                value={newTask.name}
                onChange={(e) => setNewTask({ ...newTask, name: e.target.value })}
                className="input"
                placeholder="每日增量同步"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">任务类型</label>
              <select
                value={newTask.type}
                onChange={(e) => setNewTask({ ...newTask, type: e.target.value as any })}
                className="input"
              >
                <option value="incremental_sync">增量同步</option>
                <option value="full_sync">全量同步</option>
                <option value="backup">数据备份</option>
                <option value="custom">自定义</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Cron 表达式 *</label>
              <input
                type="text"
                value={newTask.cronExpression}
                onChange={(e) => setNewTask({ ...newTask, cronExpression: e.target.value })}
                className="input"
                placeholder="0 0 * * *"
              />
              <p className="text-xs text-gray-500 mt-1">
                格式：分钟 小时 日期 月份 星期
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">常用模板</label>
              <div className="flex flex-wrap gap-2">
                {getCommonCronExpressions().map((template) => (
                  <button
                    key={template.name}
                    onClick={() => handleUseTemplate(template.expression)}
                    className="px-3 py-1 bg-gray-200 dark:bg-gray-700 rounded text-xs hover:bg-gray-300 dark:hover:bg-gray-600"
                  >
                    {template.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-4">
              <Button onClick={handleCreate} disabled={createMutation.isPending}>
                {createMutation.isPending ? '创建中...' : '创建任务'}
              </Button>
              <Button onClick={() => setShowCreateForm(false)} variant="secondary">
                取消
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 任务列表 */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">任务列表</h3>
        {tasks && tasks.length > 0 ? (
          tasks.map((task: any) => (
            <div key={task.id} className="card">
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <h4 className="font-semibold">{task.name}</h4>
                    <span className={`px-2 py-1 rounded text-xs ${
                      task.enabled
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                        : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400'
                    }`}>
                      {task.enabled ? '✅ 启用' : '⏸️ 禁用'}
                    </span>
                    <span className={`px-2 py-1 rounded text-xs ${
                      task.lastStatus === 'success'
                        ? 'bg-green-100 text-green-800'
                        : task.lastStatus === 'failed'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {task.lastStatus === 'success' ? '✅ 成功' : task.lastStatus === 'failed' ? '❌ 失败' : '⏳ 等待'}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500">
                    Cron: <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">{task.cronExpression}</code>
                  </p>
                  <p className="text-sm text-gray-500">
                    下次运行：{task.nextRun ? new Date(task.nextRun).toLocaleString('zh-CN') : '-'}
                  </p>
                  {task.lastRun && (
                    <p className="text-sm text-gray-500">
                      上次运行：{new Date(task.lastRun).toLocaleString('zh-CN')}
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => toggleMutation.mutate({ task, enabled: !task.enabled })}
                    className="btn-secondary text-sm"
                  >
                    {task.enabled ? '禁用' : '启用'}
                  </button>
                  <button className="text-gray-500 hover:text-red-600">
                    🗑️
                  </button>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="card text-center py-12 text-gray-500">
            暂无定时任务，点击右上角创建
          </div>
        )}
      </div>

      {toast && (
        <Toast message={toast.message} type={toast.type} onHide={() => setToast(null)} />
      )}
    </div>
  )
}
