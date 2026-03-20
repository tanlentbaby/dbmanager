export default function Query() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">查询编辑器</h1>
      <div className="card">
        <textarea
          className="w-full h-48 p-4 font-mono text-sm bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
          placeholder="SELECT * FROM ..."
        />
        <div className="mt-4 flex space-x-4">
          <button className="btn-primary">▶️ 执行</button>
          <button className="btn-secondary">💾 保存</button>
          <button className="btn-secondary">🤖 AI 优化</button>
        </div>
      </div>
    </div>
  )
}
