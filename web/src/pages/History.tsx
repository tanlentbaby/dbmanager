import { dbApi } from '@/lib/api'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

export default function History() {
  const queryClient = useQueryClient()

  const { data: historyData, isLoading } = useQuery({
    queryKey: ['history'],
    queryFn: () => dbApi.getHistory(50),
  })

  const clearMutation = useMutation({
    mutationFn: () => Promise.resolve(), // TODO: API
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['history'] })
    },
  })

  const history = historyData?.data || []

  const handleClear = () => {
    if (confirm('确定要清除所有历史记录吗？')) {
      clearMutation.mutate()
    }
  }

  const handleRerun = (sql: string) => {
    // 跳转到查询页面并执行
    console.log('重新执行:', sql)
  }

  if (isLoading) {
    return <div className="text-center py-12">加载中...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">历史记录</h1>
        <button
          onClick={handleClear}
          disabled={clearMutation.isPending || history.length === 0}
          className="btn-secondary text-red-600 hover:text-red-700"
        >
          🗑️ 清除历史
        </button>
      </div>

      {history.length === 0 ? (
        <div className="card text-center py-12 text-gray-500">
          暂无历史记录
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold">SQL</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">时间</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">耗时</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">状态</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {history.map((item: any) => (
                  <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-4 py-3 font-mono text-sm truncate max-w-md">
                      {item.sql}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {new Date(item.executedAt).toLocaleString('zh-CN')}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {item.duration}ms
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-1 rounded text-xs ${
                          item.status === 'success'
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                            : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                        }`}
                      >
                        {item.status === 'success' ? '✅ 成功' : '❌ 失败'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleRerun(item.sql)}
                        className="text-primary hover:underline text-sm"
                      >
                        重新执行
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
