import { useState } from 'react'
import { dbApi } from '@/lib/api'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

export default function Bookmarks() {
  const [searchQuery, setSearchQuery] = useState('')
  const queryClient = useQueryClient()

  const { data: bookmarksData, isLoading } = useQuery({
    queryKey: ['bookmarks'],
    queryFn: () => dbApi.getBookmarks(),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => dbApi.deleteBookmark(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookmarks'] })
    },
  })

  const bookmarks = bookmarksData?.data || []

  const filteredBookmarks = searchQuery
    ? bookmarks.filter(
        (b: any) =>
          b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          b.sql.toLowerCase().includes(searchQuery.toLowerCase()) ||
          b.tags?.some((t: string) => t.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : bookmarks

  const handleDelete = (id: string, name: string) => {
    if (confirm(`确定要删除"${name}"吗？`)) {
      deleteMutation.mutate(id)
    }
  }

  if (isLoading) {
    return <div className="text-center py-12">加载中...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">书签</h1>
        <button className="btn-primary">➕ 新建书签</button>
      </div>

      {/* 搜索框 */}
      <div className="card">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="搜索书签..."
          className="input"
        />
      </div>

      {/* 书签列表 */}
      <div className="space-y-4">
        {filteredBookmarks.length === 0 ? (
          <div className="card text-center py-12 text-gray-500">
            {searchQuery ? '没有找到匹配的书签' : '暂无书签'}
          </div>
        ) : (
          filteredBookmarks.map((bookmark: any) => (
            <div key={bookmark.id} className="card">
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-semibold text-lg">{bookmark.name}</h3>
                <div className="flex space-x-2">
                  <button
                    onClick={() => console.log('编辑:', bookmark.id)}
                    className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                  >
                    ✏️
                  </button>
                  <button
                    onClick={() => handleDelete(bookmark.id, bookmark.name)}
                    disabled={deleteMutation.isPending}
                    className="text-gray-500 hover:text-red-600 disabled:opacity-50"
                  >
                    🗑️
                  </button>
                </div>
              </div>
              <pre className="bg-gray-50 dark:bg-gray-900 p-3 rounded text-sm overflow-x-auto">
                <code className="font-mono">{bookmark.sql}</code>
              </pre>
              {bookmark.description && (
                <p className="text-sm text-gray-500 mt-2">{bookmark.description}</p>
              )}
              {bookmark.tags && bookmark.tags.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {bookmark.tags.map((tag: string, i: number) => (
                    <span
                      key={i}
                      className="px-2 py-1 bg-primary/10 text-primary text-xs rounded"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
