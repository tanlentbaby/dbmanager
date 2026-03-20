import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  getThirdPartyMarketplace,
  getDeveloperInfo,
  getPluginReviews,
  downloadThirdPartyPlugin,
  submitPluginReview,
} from '@/lib/thirdPartyPlugins'
import { getPluginTemplates, createPluginProject, generatePluginDocumentation } from '@/lib/pluginDevTools'
import { Toast } from '@/components/Toast'
import { Button } from '@/components/Button'

export default function ThirdPartyPlugins() {
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const [selectedPlugin, setSelectedPlugin] = useState<any>(null)
  const [downloading, setDownloading] = useState<Record<string, number>>({})
  const [showDevTools, setShowDevTools] = useState(false)

  const { data: plugins } = useQuery({
    queryKey: ['third-party-plugins'],
    queryFn: () => getThirdPartyMarketplace(),
  })

  const { data: templates } = useQuery({
    queryKey: ['plugin-templates'],
    queryFn: () => getPluginTemplates(),
  })

  const handleDownload = async (plugin: any) => {
    setDownloading((prev) => ({ ...prev, [plugin.id]: 0 }))

    try {
      await downloadThirdPartyPlugin(plugin, (progress) => {
        setDownloading((prev) => ({ ...prev, [plugin.id]: progress }))
      })

      setToast({ message: '插件下载成功', type: 'success' })
    } catch (error: any) {
      setToast({ message: `下载失败：${error.message}`, type: 'error' })
    } finally {
      setDownloading((prev) => ({ ...prev, [plugin.id]: undefined }))
    }
  }

  const handleCreateProject = (template: any) => {
    const projectName = prompt('请输入项目名称:')
    const author = prompt('请输入作者名:')

    if (projectName && author) {
      const project = createPluginProject(template.id, projectName, author)
      const doc = generatePluginDocumentation(project)

      // 下载项目文档
      const blob = new Blob([doc], { type: 'text/markdown' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `${projectName}-README.md`
      link.click()

      setToast({ message: '项目创建成功！', type: 'success' })
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">第三方插件 🔌</h1>
        <Button onClick={() => setShowDevTools(!showDevTools)}>
          {showDevTools ? '返回市场' : '开发者工具'}
        </Button>
      </div>

      {showDevTools ? (
        /* 开发者工具 */
        <div className="space-y-6">
          <div className="card">
            <h3 className="text-lg font-semibold mb-4">🛠️ 插件开发模板</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {templates?.map((template) => (
                <div key={template.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <h4 className="font-semibold">{template.name}</h4>
                  <p className="text-sm text-gray-500 mb-2">{template.description}</p>
                  <p className="text-xs text-gray-400 mb-4">分类：{template.category}</p>
                  <Button onClick={() => handleCreateProject(template)} size="small">
                    创建项目
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <h3 className="text-lg font-semibold mb-4">📚 开发资源</h3>
            <div className="space-y-2">
              <a href="#" className="text-primary hover:underline">
                📖 开发文档
              </a>
              <a href="#" className="text-primary hover:underline">
                🔧 API 参考
              </a>
              <a href="#" className="text-primary hover:underline">
                📝 发布指南
              </a>
              <a href="#" className="text-primary hover:underline">
                💬 开发者社区
              </a>
            </div>
          </div>
        </div>
      ) : (
        /* 插件市场 */
        <>
          {/* 统计信息 */}
          <div className="grid grid-cols-3 gap-4">
            <div className="card">
              <p className="text-sm text-gray-500">第三方插件</p>
              <p className="text-2xl font-bold">{plugins?.length || 0}</p>
            </div>
            <div className="card">
              <p className="text-sm text-gray-500">已验证</p>
              <p className="text-2xl font-bold">{plugins?.filter((p) => p.verified).length || 0}</p>
            </div>
            <div className="card">
              <p className="text-sm text-gray-500">总下载</p>
              <p className="text-2xl font-bold">{plugins?.reduce((sum, p) => sum + p.downloads, 0).toLocaleString() || 0}</p>
            </div>
          </div>

          {/* 插件列表 */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {plugins?.map((plugin) => {
              const isDownloading = downloading[plugin.id] !== undefined

              return (
                <div
                  key={plugin.id}
                  className="card cursor-pointer hover:shadow-lg transition-shadow"
                  onClick={() => setSelectedPlugin(plugin)}
                >
                  <div className="flex items-start gap-4 mb-4">
                    <div className="text-4xl">{plugin.icon || '🔌'}</div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-lg">{plugin.name}</h3>
                        {plugin.verified && (
                          <span className="text-green-500" title="已验证">✅</span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500">v{plugin.version}</p>
                      <p className="text-xs text-gray-400">by {plugin.author}</p>
                    </div>
                  </div>

                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-2">
                    {plugin.description}
                  </p>

                  <div className="flex flex-wrap gap-2 mb-4">
                    {plugin.tags.slice(0, 3).map((tag) => (
                      <span
                        key={tag}
                        className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>

                  <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                    <span className="flex items-center gap-1">
                      ⭐ {plugin.rating.toFixed(1)} ({plugin.ratingsCount})
                    </span>
                    <span>📥 {plugin.downloads.toLocaleString()}</span>
                    <span>💾 {(plugin.size / 1024).toFixed(1)} MB</span>
                  </div>

                  <Button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDownload(plugin)
                    }}
                    disabled={isDownloading}
                    className="w-full"
                  >
                    {isDownloading
                      ? `下载中 ${downloading[plugin.id].toFixed(0)}%`
                      : plugin.verified
                      ? '下载 (已验证)'
                      : '下载'}
                  </Button>

                  {isDownloading && (
                    <div className="mt-2 bg-gray-200 dark:bg-gray-700 rounded-full h-1">
                      <div
                        className="bg-primary h-1 rounded-full transition-all"
                        style={{ width: `${downloading[plugin.id]}%` }}
                      />
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {plugins?.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              暂无第三方插件
            </div>
          )}
        </>
      )}

      {/* 插件详情弹窗 */}
      {selectedPlugin && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={() => setSelectedPlugin(null)}
        >
          <div
            className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-4">
                <div className="text-4xl">{selectedPlugin.icon || '🔌'}</div>
                <div>
                  <h2 className="text-2xl font-bold">{selectedPlugin.name}</h2>
                  <p className="text-gray-500">v{selectedPlugin.version} by {selectedPlugin.author}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedPlugin(null)}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ×
              </button>
            </div>

            <p className="text-gray-600 dark:text-gray-400 mb-4">{selectedPlugin.description}</p>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <p className="text-sm text-gray-500">分类</p>
                <p className="font-medium">{selectedPlugin.category}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">许可证</p>
                <p className="font-medium">{selectedPlugin.license}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">大小</p>
                <p className="font-medium">{(selectedPlugin.size / 1024).toFixed(1)} MB</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">最后更新</p>
                <p className="font-medium">{new Date(selectedPlugin.lastUpdated).toLocaleDateString()}</p>
              </div>
            </div>

            {selectedPlugin.repository && (
              <a
                href={selectedPlugin.repository}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                🔗 查看源码
              </a>
            )}

            <div className="mt-6 flex gap-4">
              <Button
                onClick={() => handleDownload(selectedPlugin)}
                className="flex-1"
                disabled={downloading[selectedPlugin.id] !== undefined}
              >
                {downloading[selectedPlugin.id] !== undefined
                  ? `下载中 ${downloading[selectedPlugin.id].toFixed(0)}%`
                  : '下载'}
              </Button>
              <Button onClick={() => setSelectedPlugin(null)} variant="secondary">
                关闭
              </Button>
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
