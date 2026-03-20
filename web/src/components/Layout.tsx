import { useState } from 'react'
import { useTheme } from '../hooks/useTheme'

export default function Layout({ children }: { children: React.ReactNode }) {
  const { isDark, toggle } = useTheme()
  const [sidebarOpen, setSidebarOpen] = useState(true)

  const navItems = [
    { name: '仪表盘', href: '/', icon: '📊' },
    { name: '数据库', href: '/databases', icon: '🔌' },
    { name: '查询', href: '/query', icon: '📝' },
    { name: 'AI 助手', href: '/ai', icon: '🤖' },
    { name: '模型', href: '/models', icon: '🧠' },
    { name: '插件', href: '/plugins', icon: '🔌' },
    { name: '第三方', href: '/third-party', icon: '🌐' },
    { name: 'ER 图', href: '/erd', icon: '🗺️' },
    { name: '对比', href: '/compare', icon: '⚖️' },
    { name: '同步', href: '/sync', icon: '🔄' },
    { name: '迁移', href: '/migration', icon: '📦' },
    { name: '增量', href: '/incremental', icon: '📈' },
    { name: '续传', href: '/resumable', icon: '⏯️' },
    { name: '定时', href: '/scheduled', icon: '⏰' },
    { name: '并行', href: '/parallel', icon: '⚡' },
    { name: '收藏', href: '/favorites', icon: '⭐' },
    { name: '书签', href: '/bookmarks', icon: '🔖' },
    { name: '历史', href: '/history', icon: '📜' },
    { name: '设置', href: '/settings', icon: '⚙️' },
  ]

  return (
    <div className="flex h-screen bg-gray-100 dark:bg-gray-900">
      {/* 侧边栏 */}
      <aside
        className={`${
          sidebarOpen ? 'w-64' : 'w-20'
        } bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 transition-all duration-300`}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="h-16 flex items-center justify-center border-b border-gray-200 dark:border-gray-700">
            <h1 className={`text-xl font-bold ${!sidebarOpen && 'hidden'}`}>
              DBManager
            </h1>
          </div>

          {/* 导航 */}
          <nav className="flex-1 p-4 space-y-2">
            {navItems.map((item) => (
              <a
                key={item.name}
                href={item.href}
                className="flex items-center px-4 py-3 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <span className="text-xl">{item.icon}</span>
                <span className={`ml-3 ${!sidebarOpen && 'hidden'}`}>
                  {item.name}
                </span>
              </a>
            ))}
          </nav>

          {/* 底部 */}
          <div className="p-4 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={toggle}
              className="w-full flex items-center justify-center px-4 py-2 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              {isDark ? '☀️' : '🌙'}
              <span className={`ml-2 ${!sidebarOpen && 'hidden'}`}>
                {isDark ? '浅色' : '深色'}
              </span>
            </button>
          </div>
        </div>
      </aside>

      {/* 主内容 */}
      <main className="flex-1 overflow-auto">
        <header className="h-16 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between px-6">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
          >
            ☰
          </button>
          <div className="flex items-center space-x-4">
            <span className="text-gray-700 dark:text-gray-300">用户</span>
          </div>
        </header>
        <div className="p-6">{children}</div>
      </main>
    </div>
  )
}
