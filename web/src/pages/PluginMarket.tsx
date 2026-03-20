import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getPluginMarketplace,
  getInstalledPlugins,
  installPlugin,
  uninstallPlugin,
  togglePlugin,
  checkPluginUpdates,
  searchPlugins,
  getPluginStats,
  type Plugin,
} from '@/lib/pluginManager'
import { Toast } from '@/components/Toast'
import { Button } from '@/components/Button'

export default function PluginMarket() {
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('全部')
  const [installing, setInstalling] = useState<Record<string, number>>({})
  const queryClient = useQueryClient()

  const { data: marketplace } = useQuery({
    queryKey: ['plugin-marketplace'],
    queryFn: () => getPluginMarketplace(),
  })

  const { data: installedPlugins } = useQuery({
    queryKey: ['installed-plugins'],
    queryFn: () => getInstalledPlugins(),
  })

  const { data: stats } = useQuery({
    queryKey: ['plugin-stats'],
    queryFn: () => getPluginStats(),
  })

  const { data: updates } = useQuery({
    queryKey: ['plugin-updates'],
    queryFn: () => checkPluginUpdates(),
  })

  const installMutation = useMutation({
    mutationFn: async ({ pluginId, enableAfterInstall }: { pluginId: string; enableAfterInstall?: boolean }) => {
      setInstalling((prev) => ({ ...prev, [pluginId]: 0 }))
      
      const plugin = await installPlugin(
        { pluginId, enableAfterInstall },
        (progress) => {
          setInstalling((prev) => ({ ...prev, [pluginId]: progress }))
        }
      )
      
      return plugin
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plugin-marketplace'] })
      queryClient.invalidateQueries({ queryKey: ['installed-plugins'] })
      queryClient.invalidateQueries({ queryKey: ['plugin-stats'] })
      setToast({ message: '插件安装成功', type: 'success' })
      setInstalling({})
    },
    onError: (error: any) => {
      setToast({ message: `安装失败：${error.message}`, type: 'error' })
      setInstalling({})
    },
  })

  const uninstallMutation = useMutation({
    mutationFn: async (pluginId: string) => {
      return await uninstallPlugin(pluginId)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plugin-marketplace'] })
      queryClient.invalidateQueries({ queryKey: ['installed-plugins'] })
      queryClient.invalidateQueries({ queryKey: ['plugin-stats'] })
      setToast({ message: '插件卸载成功', type: 'success' })
    },
    onError: (error: any) => {
      setToast({ message: `卸载失败：${error.message}`, type: 'error' })
    },
  })

  const toggleMutation = useMutation({
    mutationFn: async ({ pluginId, enabled }: { pluginId: string; enabled: boolean }) => {
      return await togglePlugin(pluginId, enabled)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['installed-plugins'] })
    },
  })

  const handleInstall = (pluginId: string) => {
    installMutation.mutate({ pluginId, enableAfterInstall: true })
  }

  const handleUninstall = (pluginId: string) => {
    if (confirm('确定要卸载此插件吗？')) {
      uninstallMutation.mutate(pluginId)
    }
  }

  const handleToggle = (pluginId: string, enabled: boolean) => {
    toggleMutation.mutate({ pluginId, enabled: !enabled })
  }

  // 过滤插件
  const filteredPlugins = marketplace?.plugins.filter((plugin) => {
    const matchesSearch = !searchQuery || 
      plugin.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      plugin.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      plugin.tags.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase()))
    
    const matchesCategory = selectedCategory === '全部' || plugin.category === selectedCategory
    
    return matchesSearch && matchesCategory
  })

  const categories = ['全部', ...(marketplace?.categories || [])]

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">插件市场 🔌</h1>
      </div>

      {/* 统计信息 */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="card">
            <p className="text-sm text-gray-500">总插件数</p>
            <p className="text-2xl font-bold">{stats.totalPlugins}</p>
          </div>
          <div className="card">
            <p className="text-sm text-gray-500">已安装</p>
            <p className="text-2xl font-bold">{stats.installedPlugins}</p>
          </div>
          <div className="card">
            <p className="text-sm text-gray-500">已启用</p>
            <p className="text-2xl font-bold">{stats.enabledPlugins}</p>
          </div>
          <div className="card">
            <p className="text-sm text-gray-500">平均评分</p>
            <p className="text-2xl font-bold">⭐ {stats.avgRating.toFixed(1)}</p>
          </div>
        </div>
      )}

      {/* 可用更新 */}
      {updates && updates.length > 0 && (
        <div className="card border-yellow-200 dark:border-yellow-800">
          <h3 className="text-lg font-semibold mb-4 text-yellow-800 dark:text-yellow-400">
            📦 可用更新 ({updates.length})
          </h3>
          <div className="space-y-4">
            {updates.map((update) => (
              <div key={update.pluginId} className="flex justify-between items-center">
                <div>
                  <p className="font-medium">{update.pluginId}</p>
                  <p className="text-sm text-gray-500">
                    {update.currentVersion} → {update.newVersion}
                  </p>
                </div>
                <Button onClick={() => handleInstall(update.pluginId)} size="small">
                  更新
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 搜索和分类 */}
      <div className="card">
        <div className="flex flex-col md:flex-row gap-4">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="搜索插件..."
            className="flex-1 input"
          />
          <div className="flex gap-2 flex-wrap">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-4 py-2 rounded ${
                  selectedCategory === category
                    ? 'bg-primary text-white'
                    : 'bg-gray-200 dark:bg-gray-700'
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 插件列表 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredPlugins?.map((plugin) => {
          const isInstalling = installing[plugin.id] !== undefined
          const isInstalled = plugin.installed

          return (
            <div key={plugin.id} className="card">
              <div className="flex items-start gap-4 mb-4">
                <div className="text-4xl">{plugin.icon || '🔌'}</div>
                <div className="flex-1">
                  <h3 className="font-semibold text-lg">{plugin.name}</h3>
                  <p className="text-sm text-gray-500">v{plugin.version}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-yellow-500">⭐ {plugin.rating.toFixed(1)}</span>
                    <span className="text-xs text-gray-500">({plugin.ratingsCount})</span>
                  </div>
                </div>
              </div>

              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                {plugin.description}
              </p>

              <div className="flex flex-wrap gap-2 mb-4">
                {plugin.tags.map((tag) => (
                  <span
                    key={tag}
                    className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs"
                  >
                    #{tag}
                  </span>
                ))}
              </div>

              <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                <span>📥 {plugin.downloads.toLocaleString()}</span>
                <span>💾 {(plugin.size / 1024).toFixed(1)} MB</span>
                <span>📂 {plugin.category}</span>
              </div>

              <div className="flex gap-2">
                {isInstalled ? (
                  <>
                    <Button
                      onClick={() => handleToggle(plugin.id, plugin.enabled)}
                      variant={plugin.enabled ? 'secondary' : 'primary'}
                      disabled={toggleMutation.isPending}
                      className="flex-1"
                    >
                      {plugin.enabled ? '禁用' : '启用'}
                    </Button>
                    <Button
                      onClick={() => handleUninstall(plugin.id)}
                      variant="secondary"
                      disabled={uninstallMutation.isPending}
                      className="text-red-600"
                    >
                      卸载
                    </Button>
                  </>
                ) : (
                  <Button
                    onClick={() => handleInstall(plugin.id)}
                    disabled={isInstalling}
                    className="w-full"
                  >
                    {isInstalling
                      ? `安装中 ${installing[plugin.id].toFixed(0)}%`
                      : `安装`}
                  </Button>
                )}
              </div>

              {isInstalling && (
                <div className="mt-2 bg-gray-200 dark:bg-gray-700 rounded-full h-1">
                  <div
                    className="bg-primary h-1 rounded-full transition-all"
                    style={{ width: `${installing[plugin.id]}%` }}
                  />
                </div>
              )}
            </div>
          )
        })}
      </div>

      {filteredPlugins?.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          没有找到匹配的插件
        </div>
      )}

      {toast && (
        <Toast message={toast.message} type={toast.type} onHide={() => setToast(null)} />
      )}
    </div>
  )
}
