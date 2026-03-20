export default function History() {
  const history = [
    { id: 1, sql: 'SELECT * FROM users', time: '2 分钟前', status: 'success' },
    { id: 2, sql: 'UPDATE orders SET status = 1', time: '5 分钟前', status: 'error' },
  ]

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">历史记录</h1>
      <div className="card overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-semibold">SQL</th>
              <th className="px-4 py-3 text-left text-sm font-semibold">时间</th>
              <th className="px-4 py-3 text-left text-sm font-semibold">状态</th>
              <th className="px-4 py-3 text-left text-sm font-semibold">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {history.map((item) => (
              <tr key={item.id}>
                <td className="px-4 py-3 font-mono text-sm">{item.sql}</td>
                <td className="px-4 py-3 text-sm text-gray-500">{item.time}</td>
                <td className="px-4 py-3">
                  <span
                    className={`px-2 py-1 rounded text-xs ${
                      item.status === 'success'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {item.status === 'success' ? '✅ 成功' : '❌ 失败'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <button className="text-primary hover:underline">重新执行</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
