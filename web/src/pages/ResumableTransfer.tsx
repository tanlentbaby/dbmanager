import React, { useState, useEffect, useRef } from 'react'
import { useMutation } from '@tanstack/react-query'
import { dbApi } from '@/lib/api'
import {
  createTransferCheckpoint,
  updateCheckpoint,
  pauseTransfer,
  resumeTransfer,
  calculateTransferProgress,
  canResumeTransfer,
  processBatchWithRetry,
} from '@/lib/resumableTransfer'
import { Toast } from '@/components/Toast'
import { Button } from '@/components/Button'

interface ResumableTransferProps {
  tableName?: string
}

export default function ResumableTransfer({ tableName }: ResumableTransferProps) {
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const [checkpoint, setCheckpoint] = useState<any>(null)
  const [isPaused, setIsPaused] = useState(false)
  const [progress, setProgress] = useState<any>(null)
  const startTimeRef = useRef<number>(0)

  const transferMutation = useMutation({
    mutationFn: async (tableName: string) => {
      // 模拟分批传输
      const totalRows = 10000
      const batchSize = 100
      const totalBatches = Math.ceil(totalRows / batchSize)

      let currentCheckpoint = checkpoint || createTransferCheckpoint(tableName, totalRows)
      startTimeRef.current = Date.now()

      for (let batch = 0; batch < totalBatches; batch++) {
        if (isPaused) {
          currentCheckpoint = pauseTransfer(currentCheckpoint)
          setCheckpoint(currentCheckpoint)
          throw new Error('传输已暂停')
        }

        // 模拟处理一批数据
        await new Promise((resolve) => setTimeout(resolve, 100))

        const processedId = (batch + 1) * batchSize
        currentCheckpoint = updateCheckpoint(currentCheckpoint, processedId, batchSize)
        setCheckpoint(currentCheckpoint)

        const prog = calculateTransferProgress(
          currentCheckpoint,
          startTimeRef.current,
          batch + 1,
          totalBatches,
          batchSize
        )
        setProgress(prog)
      }

      return currentCheckpoint
    },
    onSuccess: (result) => {
      setToast({ message: '传输完成', type: 'success' })
      setCheckpoint(null)
      setProgress(null)
    },
    onError: (error: any) => {
      if (error.message !== '传输已暂停') {
        setToast({ message: `传输失败：${error.message}`, type: 'error' })
      }
    },
  })

  const handleStart = () => {
    if (!tableName) {
      setToast({ message: '请指定表名', type: 'error' })
      return
    }
    setIsPaused(false)
    transferMutation.mutate(tableName)
  }

  const handlePause = () => {
    setIsPaused(true)
    setToast({ message: '传输已暂停', type: 'warning' })
  }

  const handleResume = () => {
    if (!checkpoint || !canResumeTransfer(checkpoint)) {
      setToast({ message: '无法续传', type: 'error' })
      return
    }
    setIsPaused(false)
    const resumed = resumeTransfer(checkpoint)
    setCheckpoint(resumed)
    transferMutation.mutate(checkpoint.tableName)
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">断点续传</h1>
      </div>

      {/* 启动传输 */}
      {!checkpoint && (
        <div className="card">
          <h3 className="text-lg font-semibold mb-4">开始传输</h3>
          <div className="flex gap-4">
            <Button onClick={handleStart} disabled={transferMutation.isPending}>
              {transferMutation.isPending ? '传输中...' : '▶️ 开始传输'}
            </Button>
          </div>
        </div>
      )}

      {/* 传输进度 */}
      {checkpoint && (
        <div className="card">
          <h3 className="text-lg font-semibold mb-4">传输进度</h3>
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-gray-500">总行数</p>
                <p className="text-2xl font-bold">{checkpoint.totalRows}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">已处理</p>
                <p className="text-2xl font-bold text-green-600">{checkpoint.processedRows}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">进度</p>
                <p className="text-2xl font-bold">{progress?.percentComplete || 0}%</p>
              </div>
            </div>

            {/* 进度条 */}
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4">
              <div
                className="bg-primary h-4 rounded-full transition-all"
                style={{ width: `${progress?.percentComplete || 0}%` }}
              />
            </div>

            {/* 详细信息 */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-500">处理速度</p>
                <p className="font-medium">{progress?.rowsPerSecond || 0} 行/秒</p>
              </div>
              <div>
                <p className="text-gray-500">预计剩余时间</p>
                <p className="font-medium">
                  {progress?.estimatedTimeRemaining
                    ? `${Math.round(progress.estimatedTimeRemaining / 60)} 分 ${progress.estimatedTimeRemaining % 60} 秒`
                    : '-'}
                </p>
              </div>
              <div>
                <p className="text-gray-500">最后处理 ID</p>
                <p className="font-medium">{checkpoint.lastProcessedId}</p>
              </div>
              <div>
                <p className="text-gray-500">状态</p>
                <p className="font-medium">
                  {checkpoint.status === 'running' && '🔄 传输中'}
                  {checkpoint.status === 'paused' && '⏸️ 已暂停'}
                  {checkpoint.status === 'completed' && '✅ 已完成'}
                  {checkpoint.status === 'failed' && '❌ 失败'}
                </p>
              </div>
            </div>

            {/* 控制按钮 */}
            <div className="flex gap-4 pt-4">
              {!isPaused && checkpoint.status === 'running' && (
                <Button onClick={handlePause} variant="secondary">
                  ⏸️ 暂停
                </Button>
              )}
              {(isPaused || checkpoint.status === 'paused') && (
                <Button onClick={handleResume}>
                  ▶️ 续传
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {toast && (
        <Toast message={toast.message} type={toast.type} onHide={() => setToast(null)} />
      )}
    </div>
  )
}
