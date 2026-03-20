export default function Bookmarks() {
  const bookmarks = [
    { id: 1, name: '查询所有用户', sql: 'SELECT * FROM users', tags: ['users'] },
    { id: 2, name: '最近订单', sql: 'SELECT * FROM orders LIMIT 10', tags: ['orders'] },
  ]

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">书签</h1>
      <div className="space-y-4">
        {bookmarks.map((bookmark) => (
          <div key={bookmark.id} className="card">
            <div className="flex justify-between items-start mb-2">
              <h3 className="font-semibold">{bookmark.name}</h3>
              <div className="flex space-x-2">
                <button className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
                  ✏️
                </button>
                <button className="text-gray-500 hover:text-red-600">
                  🗑️
                </button>
              </div>
            </div>
            <pre className="bg-gray-50 dark:bg-gray-900 p-3 rounded text-sm overflow-x-auto">
              <code>{bookmark.sql}</code>
            </pre>
            <div className="mt-2 flex space-x-2">
              {bookmark.tags.map((tag) => (
                <span
                  key={tag}
                  className="px-2 py-1 bg-primary/10 text-primary text-xs rounded"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
