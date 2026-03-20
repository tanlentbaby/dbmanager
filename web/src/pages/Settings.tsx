import { useState } from 'react'

export default function Settings() {
  const [config, setConfig] = useState({
    host: 'localhost',
    port: '3306',
    user: 'root',
    database: '',
  })

  const handleSave = () => {
    console.log('保存配置:', config)
    alert('配置已保存')
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">设置</h1>

      {/* 数据库连接 */}
      <div className="card">
        <h2 className="text-lg font-semibold mb-4">数据库连接</h2>
        <div className="space-y-4 max-w-md">
          <div>
            <label className="block text-sm font-medium mb-2">主机</label>
            <input
              type="text"
              value={config.host}
              onChange={(e) => setConfig({ ...config, host: e.target.value })}
              className="input"
              placeholder="localhost"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">端口</label>
            <input
              type="number"
              value={config.port}
              onChange={(e) => setConfig({ ...config, port: e.target.value })}
              className="input"
              placeholder="3306"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">用户名</label>
            <input
              type="text"
              value={config.user}
              onChange={(e) => setConfig({ ...config, user: e.target.value })}
              className="input"
              placeholder="root"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">数据库</label>
            <input
              type="text"
              value={config.database}
              onChange={(e) => setConfig({ ...config, database: e.target.value })}
              className="input"
              placeholder="mydb"
            />
          </div>
          <button onClick={handleSave} className="btn-primary">
            保存配置
          </button>
        </div>
      </div>

      {/* 外观设置 */}
      <div className="card">
        <h2 className="text-lg font-semibold mb-4">外观</h2>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">深色模式</p>
              <p className="text-sm text-gray-500">切换深色/浅色主题</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" />
              <div className="w-11 h-6 bg-gray-300 peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary"></div>
            </label>
          </div>
        </div>
      </div>

      {/* 关于 */}
      <div className="card">
        <h2 className="text-lg font-semibold mb-4">关于</h2>
        <div className="space-y-2 text-sm text-gray-500">
          <p>版本：1.1.0</p>
          <p>构建：2026-03-20</p>
          <p>技术栈：React 18 + TypeScript + Tailwind CSS</p>
        </div>
      </div>
    </div>
  )
}
