import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getInstalledModels,
  checkModelUpdates,
  downloadModelUpdate,
  testModelAccuracy,
  getModelStats,
  type ModelUpdate,
} from '@/lib/modelManager'
import { Toast } from '@/components/Toast'
import { Button } from '@/components/Button'

export default function ModelManagement() {
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const [downloading, setDownloading] = useState<Record<string, number>>({})
  const queryClient = useQueryClient()

  const { data: models } = useQuery({
    queryKey: ['installed-models'],
    queryFn: () => getInstalledModels(),
  })

  const { data: stats } = useQuery({
    queryKey: ['model-stats'],
    queryFn: () => getModelStats(),
  })

  const { data: updates } = useQuery({
    queryKey: ['model-updates'],
    queryFn: () => checkModelUpdates(),
    refetchInterval: 3600000, // 每小时检查一次
  })

  const downloadMutation = useMutation({
    mutationFn: async ({ update, modelId }: { update: ModelUpdate; modelId: string }) => {
      setDownloading((prev) => ({ ...prev, [modelId]: 0 }))
      
      await downloadModelUpdate(update, (progress) => {
        setDownloading((prev) => ({ ...prev, [modelId]: progress }))
      })

      return { modelId, update }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['installed-models'] })
      queryClient.invalidateQueries({ queryKey: ['model-updates'] })
      setToast({ message: '模型更新成功', type: 'success' })
      setDownloading({})
    },
    onError: (error: any) => {
      setToast({ message: `下载失败：${error.message}`, type: 'error' })
      setDownloading({})
    },
  })

  const testMutation = useMutation({
    mutationFn: async (modelId: string) => {
      return await testModelAccuracy(modelId)
    },
    onSuccess: (data) => {
      setToast({
        message: `测试完成：准确率 ${(data.accuracy * 100).toFixed(1)}%`,
        type: 'success',
      })
      queryClient.invalidateQueries({ queryKey: ['installed-models'] })
    },
    onError: (error: any) => {
      setToast({ message: `测试失败：${error.message}`, type: 'error' })
    },
  })

  const handleDownload = (update: ModelUpdate) => {
    downloadMutation.mutate({ update, modelId: update.modelId })
  }

  const handleTest = (modelId: string) => {
    testMutation.mutate(modelId)
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">AI 模型管理 🤖</h1>
      </div>

      {/* 统计信息 */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="card">
            <p className="text-sm text-gray-500">已安装模型</p>
            <p className="text-2xl font-bold">{stats.installedModels}</p>
          </div>
          <div className="card">
            <p className="text-sm text-gray-500">已加载模型</p>
            <p className="text-2xl font-bold">{stats.loadedModels}</p>
          </div>
          <div className="card">
            <p className="text-sm text-gray-500">总大小</p>
            <p className="text-2xl font-bold">{(stats.totalSize / 1024).toFixed(1)} MB</p>
          </div>
          <div className="card">
            <p className="text-sm text-gray-500">平均准确率</p>
            <p className="text-2xl font-bold">{(stats.avgAccuracy * 100).toFixed(1)}%</p>
          </div>
        </div>
      )}

      {/* 可用更新 */}
      {updates && updates.length > 0 && (
        <div className="card">
          <h3 className="text-lg font-semibold mb-4">📦 可用更新 ({updates.length})</h3>
          <div className="space-y-4">
            {updates.map((update) => (
              <div key={update.modelId} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h4 className="font-semibold">{update.modelId}</h4>
                    <p className="text-sm text-gray-500">
                      {update.currentVersion} → {update.newVersion}
                    </p>
                  </div>
                  {update.mandatory && (
                    <span className="px-2 py-1 bg-red-100 text-red-800 rounded text-xs">
                      必须更新
                    </span>
                  )}
                </div>
                <ul className="text-sm text-gray-600 dark:text-gray-400 mb-4 list-disc list-inside">
                  {update.changelog.map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
                <div className="flex items-center gap-4">
                  <Button
                    onClick={() => handleDownload(update)}
                    disabled={downloading[update.modelId] !== undefined}
                  >
                    {downloading[update.modelId] !== undefined
                      ? `下载中 ${downloading[update.modelId].toFixed(0)}%`
                      : `下载 (${(update.size / 1024).toFixed(1)} MB)`}
                  </Button>
                  {downloading[update.modelId] !== undefined && (
                    <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div
                        className="bg-primary h-2 rounded-full transition-all"
                        style={{ width: `${downloading[update.modelId]}%` }}
                      />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 已安装模型 */}
      <div className="card">
        <h3 className="text-lg font-semibold mb-4">💾 已安装模型</h3>
        {models && models.length > 0 ? (
          <div className="space-y-4">
            {models.map((model) => (
              <div
                key={model.id}
                className="border border-gray-200 dark:border-gray-700 rounded-lg p-4"
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="font-semibold">{model.name}</h4>
                      <span className={`px-2 py-1 rounded text-xs ${
                        model.loaded
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {model.loaded ? '✅ 已加载' : '⏸️ 未加载'}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500">版本:</span> {model.version}
                      </div>
                      <div>
                        <span className="text-gray-500">大小:</span> {(model.size / 1024).toFixed(1)} MB
                      </div>
                      <div>
                        <span className="text-gray-500">准确率:</span>{' '}
                        <span className={model.accuracy >= 0.9 ? 'text-green-600' : 'text-yellow-600'}>
                          {(model.accuracy * 100).toFixed(1)}%
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500">延迟:</span> {model.latency}ms
                      </div>
                      <div>
                        <span className="text-gray-500">类型:</span> {model.type}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleTest(model.id)}
                      disabled={testMutation.isPending}
                      className="btn-secondary text-sm"
                    >
                      🧪 测试
                    </button>
                    <button className="text-gray-500 hover:text-red-600">
                      🗑️
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-gray-500">
            暂无已安装模型
          </div>
        )}
      </div>

      {toast && (
        <Toast message={toast.message} type={toast.type} onHide={() => setToast(null)} />
      )}
    </div>
  )
}
