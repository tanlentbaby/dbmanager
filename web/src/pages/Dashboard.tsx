import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

const data = [
  { name: 'Mon', queries: 12 },
  { name: 'Tue', queries: 19 },
  { name: 'Wed', queries: 15 },
  { name: 'Thu', queries: 22 },
  { name: 'Fri', queries: 28 },
  { name: 'Sat', queries: 10 },
  { name: 'Sun', queries: 8 },
]

const pieData = [
  { name: 'SELECT', value: 60, color: '#0969da' },
  { name: 'INSERT', value: 15, color: '#3fb950' },
  { name: 'UPDATE', value: 15, color: '#d29922' },
  { name: 'DELETE', value: 10, color: '#f85149' },
]

export default function Dashboard() {
  const stats = [
    { name: '数据库连接', value: '3', change: '+1', icon: '🔌' },
    { name: '查询执行', value: '156', change: '+12%', icon: '📝' },
    { name: '书签', value: '24', change: '+3', icon: '🔖' },
    { name: '平均响应', value: '45ms', change: '-10%', icon: '⚡' },
  ]

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">仪表盘</h1>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <div key={stat.name} className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {stat.name}
                </p>
                <p className="text-2xl font-bold mt-1">{stat.value}</p>
                <p
                  className={`text-sm mt-1 ${
                    stat.change.startsWith('+') && !stat.change.includes('-')
                      ? 'text-green-600'
                      : 'text-red-600'
                  }`}
                >
                  {stat.change}
                </p>
              </div>
              <span className="text-4xl">{stat.icon}</span>
            </div>
          </div>
        ))}
      </div>

      {/* 图表 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 查询趋势 */}
        <div className="card">
          <h2 className="text-lg font-semibold mb-4">查询趋势</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="queries" stroke="#0969da" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* SQL 类型分布 */}
        <div className="card">
          <h2 className="text-lg font-semibold mb-4">SQL 类型分布</h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 快速操作 */}
      <div className="card">
        <h2 className="text-lg font-semibold mb-4">快速操作</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <a
            href="/query"
            className="p-4 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors text-center"
          >
            📝 新建查询
          </a>
          <a
            href="/bookmarks"
            className="p-4 bg-gray-200 dark:bg-gray-700 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors text-center"
          >
            🔖 查看书签
          </a>
          <a
            href="/history"
            className="p-4 bg-gray-200 dark:bg-gray-700 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors text-center"
          >
            📜 历史记录
          </a>
        </div>
      </div>
    </div>
  )
}
