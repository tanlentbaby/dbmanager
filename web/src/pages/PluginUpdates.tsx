import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  autoCheckUpdates,
  downloadPluginUpdate,
  installPluginUpdate,
  getAutoUpdateConfig,
  configureAutoUpdate,
  getUpdateHistory,
  getPluginDependencies,
  checkDependencies,
  installMissingDependencies,
  type PluginUpdateCheck,
  type UpdateProgress,
} from '@/lib/pluginAutoUpdate'
import { Toast } from '@/components/Toast'
import { Button } from '@/components/Button'

export default function PluginUpdates() {
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const [downloading, setDownloading] = useState<Record<string, UpdateProgress>>({})
  const [autoUpdateEnabled, setAutoUpdateEnabled] = useState(true)
  const queryClient = useQueryClient()

  const { data: updates, refetch } = useQuery({
    queryKey: ['plugin-updates'],
    queryFn: () => autoCheckUpdates(),
  })

  const { data: config } = useQuery({
    queryKey: ['auto-update-config'],
    queryFn: () => getAutoUpdateConfig(),
  })

  const { data: history } = useQuery({
    queryKey: ['update-history'],
    queryFn: () => getUpdateHistory(),
  })

  const downloadMutation = useMutation({
    mutationFn: async ({ pluginId, update }: { pluginId: string; update: PluginUpdateCheck }) => {
      setDownloading((prev) => ({
        ...prev,
        [pluginId]: {
          pluginId,
          stage: 'downloading',
          progress: 0,
          message: '正在下载...',
        },
      }))

      await downloadPluginUpdate(pluginId, (progress) => {
        setDownloading((prev) => ({ ...prev, [pluginId]: progress }))
      })

      await installPluginUpdate(pluginId, update.latestVersion)
      return { pluginId }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plugin-updates'] })
      queryClient.invalidateQueries({ queryKey: ['update-history'] })
      setToast({ message: '插件更新成功', type: 'success' })
      setDownloading({})
      refetch()
    },
    onError: (error: any) => {
      setToast({ message: `更新失败：${error.message}`, type: 'error' })
      setDownloading({})
    },
  })

  const handleUpdateAll = () => {
    updates?.forEach((update) => {
      if (update.hasUpdate) {
        downloadMutation.mutate({ pluginId: update.pluginId, update })
      }
    })
  }

  const handleToggleAutoUpdate = async () => {
    const newEnabled = !autoUpdateEnabled
    setAutoUpdateEnabled(newEnabled)
    await configureAutoUpdate({
      ...config!,
      enabled: newEnabled,
    })
    setToast({ message: `自动更新已${newEnabled ? '启用' : '禁用'}`, type: 'success' })
  }

  const updateCount = updates?.filter((u) => u.hasUpdate).length || 0

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">插件更新 🔄</h1>
        <div className="flex gap-2">
          <Button onClick={handleToggleAutoUpdate} variant={autoUpdateEnabled ? 'primary' : 'secondary'}>
            {autoUpdateEnabled ? '✅ 自动更新已启用' : '⏸️ 自动更新已禁用'}
          </Button>
          {updateCount > 0 && (
            <Button onClick={handleUpdateAll} variant="primary">
              全部更新 ({updateCount})
            </Button>
          )}
        </div>
      </div>

      {/* 可用更新 */}
      <div className="card">
        <h3 className="text-lg font-semibold mb-4">
          📦 可用更新 ({updateCount})
        </h3>
        {updates && updates.length > 0 ? (
          <div className="space-y-4">
            {updates.map((update) => {
              const isDownloading = downloading[update.pluginId] !== undefined
              const progress = downloading[update.pluginId]

              return (
                <div
                  key={update.pluginId}
                  className="border border-gray-200 dark:border-gray-700 rounded-lg p-4"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className="font-semibold">{update.pluginId}</h4>
                      <p className="text-sm text-gray-500">
                        {update.currentVersion} → {update.latestVersion}
                      </p>
                    </div>
                    {update.updateInfo?.mandatory && (
                      <span className="px-2 py-1 bg-red-100 text-red-800 rounded text-xs">
                        必须更新
                      </span>
                    )}
                  </div>

                  {update.updateInfo && (
                    <>
                      <ul className="text-sm text-gray-600 dark:text-gray-400 mb-4 list-disc list-inside">
                        {update.updateInfo.changelog.map((item, i) => (
                          <li key={i}>{item}</li>
                        ))}
                      </ul>
                      <p className="text-xs text-gray-500 mb-4">
                        大小：{(update.updateInfo.size / 1024).toFixed(1)} KB | 
                        发布：{new Date(update.updateInfo.releaseDate).toLocaleDateString()}
                      </p>
                    </>
                  )}

                  {isDownloading && progress ? (
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>{progress.message}</span>
                        <span>{progress.progress.toFixed(0)}%</span>
                      </div>
                      <div className="bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div
                          className="bg-primary h-2 rounded-full transition-all"
                          style={{ width: `${progress.progress}%` }}
                        />
                      </div>
                    </div>
                  ) : (
                    <Button
                      onClick={() => downloadMutation.mutate({ pluginId: update.pluginId, update })}
                      disabled={!update.hasUpdate || downloadMutation.isPending}
                      size="small"
                    >
                      {update.hasUpdate ? '更新' : '已是最新'}
                    </Button>
                  )}
                </div>
              )
            })}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            ✅ 所有插件已是最新版本
          </div>
        )}
      </div>

      {/* 依赖检查 */}
      <div className="card">
        <h3 className="text-lg font-semibold mb-4">🔗 依赖检查</h3>
        <DependencyChecker />
      </div>

      {/* 更新历史 */}
      <div className="card">
        <h3 className="text-lg font-semibold mb-4">📜 更新历史</h3>
        {history && history.length > 0 ? (
          <div className="space-y-2">
            {history.map((item, i) => (
              <div
                key={i}
                className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800 rounded"
              >
                <div>
                  <p className="font-medium">{item.pluginId}</p>
                  <p className="text-sm text-gray-500">
                    {item.fromVersion} → {item.toVersion}
                  </p>
                </div>
                <div className="text-right">
                  <span className={`px-2 py-1 rounded text-xs ${
                    item.success
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {item.success ? '✅ 成功' : '❌ 失败'}
                  </span>
                  <p className="text-xs text-gray-500 mt-1">
                    {new Date(item.date).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            暂无更新历史
          </div>
        )}
      </div>

      {toast && (
        <Toast message={toast.message} type={toast.type} onHide={() => setToast(null)} />
      )}
    </div>
  )
}

// 依赖检查组件
function DependencyChecker() {
  const [checking, setChecking] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  const handleCheck = async () => {
    setChecking(true)
    try {
      const deps = await getPluginDependencies('plugin_chart_view')
      const check = await checkDependencies('plugin_chart_view')
      setResult({ dependencies: deps, ...check })
    } catch (error: any) {
      setToast({ message: `检查失败：${error.message}`, type: 'error' })
    } finally {
      setChecking(false)
    }
  }

  const handleInstall = async () => {
    if (!result?.missing) return

    try {
      const installResult = await installMissingDependencies(result.missing)
      setToast({
        message: `安装完成：成功 ${installResult.installed}, 失败 ${installResult.failed}`,
        type: installResult.success ? 'success' : 'warning',
      })
      handleCheck()
    } catch (error: any) {
      setToast({ message: `安装失败：${error.message}`, type: 'error' })
    }
  }

  return (
    <div className="space-y-4">
      <Button onClick={handleCheck} disabled={checking} size="small">
        {checking ? '检查中...' : '检查依赖'}
      </Button>

      {result && (
        <div className="space-y-4">
          {result.satisfied ? (
            <p className="text-green-600">✅ 所有依赖已满足</p>
          ) : (
            <>
              {result.missing.length > 0 && (
                <div>
                  <p className="text-red-600 font-medium mb-2">❌ 缺失的依赖:</p>
                  <ul className="list-disc list-inside text-sm">
                    {result.missing.map((dep: any, i: number) => (
                      <li key={i}>
                        {dep.name} ({dep.version})
                      </li>
                    ))}
                  </ul>
                  <Button onClick={handleInstall} size="small" className="mt-2">
                    安装缺失依赖
                  </Button>
                </div>
              )}

              {result.incompatible.length > 0 && (
                <div>
                  <p className="text-yellow-600 font-medium mb-2">⚠️ 不兼容的依赖:</p>
                  <ul className="list-disc list-inside text-sm">
                    {result.incompatible.map((dep: any, i: number) => (
                      <li key={i}>
                        {dep.name}: 已安装 {dep.installedVersion}, 需要 {dep.version}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {toast && (
        <Toast message={toast.message} type={toast.type} onHide={() => setToast(null)} />
      )}
    </div>
  )
}
