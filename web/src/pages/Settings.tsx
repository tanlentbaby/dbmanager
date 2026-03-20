export default function Settings() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">设置</h1>
      <div className="space-y-6">
        <div className="card">
          <h2 className="text-lg font-semibold mb-4">数据库连接</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">主机</label>
              <input type="text" className="input" placeholder="localhost" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">端口</label>
              <input type="number" className="input" placeholder="3306" />
            </div>
            <button className="btn-primary">保存配置</button>
          </div>
        </div>

        <div className="card">
          <h2 className="text-lg font-semibold mb-4">外观</h2>
          <div className="flex items-center justify-between">
            <span>深色模式</span>
            <button className="relative w-12 h-6 bg-gray-300 rounded-full">
              <span className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
