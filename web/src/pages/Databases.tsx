import React, { useState } from 'react'
import { dbApi } from '@/lib/api'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

interface DatabaseType {
  type: string
  name: string
  icon: string
  defaultPort: number
}

interface Connection {
  id: string
  name: string
  config: any
  connected: boolean
  createdAt: number
}

export default function Databases() {
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    type: 'mysql' as DatabaseType['type'],
    host: 'localhost',
    port: '',
    user: '',
    password: '',
    database: '',
    serviceName: '',
    schema: '',
  })

  const queryClient = useQueryClient()

  const { data: typesData } = useQuery({
    queryKey: ['database-types'],
    queryFn: () => dbApi.getDatabaseTypes(),
  })

  const { data: connectionsData } = useQuery({
    queryKey: ['connections'],
    queryFn: () => dbApi.getConnections(),
  })

  const connectMutation = useMutation({
    mutationFn: (id: string) => dbApi.connectDatabase(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['connections'] })
    },
  })

  const disconnectMutation = useMutation({
    mutationFn: (id: string) => dbApi.disconnectDatabase(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['connections'] })
    },
  })

  const createMutation = useMutation({
    mutationFn: (data: any) => dbApi.createConnection(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['connections'] })
      setShowForm(false)
      setFormData({
        name: '',
        type: 'mysql',
        host: 'localhost',
        port: '',
        user: '',
        password: '',
        database: '',
        serviceName: '',
        schema: '',
      })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => dbApi.deleteConnection(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['connections'] })
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const config: any = {
      type: formData.type,
      host: formData.host,
      port: formData.port ? parseInt(formData.port) : undefined,
      user: formData.user,
      password: formData.password,
      database: formData.database,
    }

    if (formData.serviceName) config.serviceName = formData.serviceName
    if (formData.schema) config.schema = formData.schema

    createMutation.mutate({ name: formData.name, config })
  }

  const connections: Connection[] = connectionsData?.data || []
  const types: DatabaseType[] = typesData?.data || []

  const getTypeInfo = (type: string) => {
    const defaults = {
      mysql: { name: 'MySQL', icon: '🐬', defaultPort: 3306 },
      postgresql: { name: 'PostgreSQL', icon: '🐘', defaultPort: 5432 },
      oracle: { name: 'Oracle', icon: '🔶', defaultPort: 1521 },
      dm: { name: '达梦', icon: '🔷', defaultPort: 5236 },
      sqlite: { name: 'SQLite', icon: '🗄️', defaultPort: 0 },
    }
    return defaults[type as keyof typeof defaults] || { name: type, icon: '📦', defaultPort: 0 }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">数据库连接</h1>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary">
          ➕ 新建连接
        </button>
      </div>

      {/* 连接表单 */}
      {showForm && (
        <div className="card">
          <h2 className="text-lg font-semibold mb-4">新建数据库连接</h2>
          <form onSubmit={handleSubmit} className="space-y-4 max-w-2xl">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">连接名称</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="input"
                  placeholder="我的数据库"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">数据库类型</label>
                <select
                  value={formData.type}
                  onChange={(e) => {
                    const type = e.target.value
                    const info = getTypeInfo(type)
                    setFormData({
                      ...formData,
                      type,
                      port: info.defaultPort ? String(info.defaultPort) : '',
                    })
                  }}
                  className="input"
                >
                  {types.map((t) => (
                    <option key={t.type} value={t.type}>
                      {t.icon} {t.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {formData.type !== 'sqlite' && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">主机</label>
                    <input
                      type="text"
                      value={formData.host}
                      onChange={(e) => setFormData({ ...formData, host: e.target.value })}
                      className="input"
                      placeholder="localhost"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">端口</label>
                    <input
                      type="number"
                      value={formData.port}
                      onChange={(e) => setFormData({ ...formData, port: e.target.value })}
                      className="input"
                      placeholder="3306"
                    />
                  </div>
                </div>

                {(formData.type === 'oracle' || formData.type === 'dm') && (
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      {formData.type === 'oracle' ? 'Service Name' : 'Schema'}
                    </label>
                    <input
                      type="text"
                      value={formData.type === 'oracle' ? formData.serviceName : formData.schema}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          [formData.type === 'oracle' ? 'serviceName' : 'schema']: e.target.value,
                        })
                      }
                      className="input"
                      placeholder={formData.type === 'oracle' ? 'ORCL' : 'SYSDBA'}
                    />
                  </div>
                )}
              </>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">用户名</label>
                <input
                  type="text"
                  value={formData.user}
                  onChange={(e) => setFormData({ ...formData, user: e.target.value })}
                  className="input"
                  placeholder="root"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">密码</label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="input"
                  placeholder="••••••"
                />
              </div>
            </div>

            {formData.type !== 'oracle' && formData.type !== 'dm' && (
              <div>
                <label className="block text-sm font-medium mb-2">数据库名</label>
                <input
                  type="text"
                  value={formData.database}
                  onChange={(e) => setFormData({ ...formData, database: e.target.value })}
                  className="input"
                  placeholder="mydb"
                />
              </div>
            )}

            <div className="flex space-x-4 pt-4">
              <button type="submit" className="btn-primary" disabled={createMutation.isPending}>
                {createMutation.isPending ? '创建中...' : '创建连接'}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="btn-secondary"
              >
                取消
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 连接列表 */}
      <div className="space-y-4">
        {connections.length === 0 ? (
          <div className="card text-center py-12 text-gray-500">
            暂无数据库连接，点击右上角新建
          </div>
        ) : (
          connections.map((conn) => {
            const typeInfo = getTypeInfo(conn.config.type)
            return (
              <div key={conn.id} className="card">
                <div className="flex justify-between items-center">
                  <div className="flex items-center space-x-4">
                    <span className="text-4xl">{typeInfo.icon}</span>
                    <div>
                      <h3 className="font-semibold text-lg">{conn.name}</h3>
                      <p className="text-sm text-gray-500">
                        {typeInfo.name} • {conn.config.host || '本地'}:{conn.config.port || typeInfo.defaultPort}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <span
                      className={`px-3 py-1 rounded-full text-sm ${
                        conn.connected
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                          : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400'
                      }`}
                    >
                      {conn.connected ? '🟢 已连接' : '⚪ 未连接'}
                    </span>
                    {conn.connected ? (
                      <button
                        onClick={() => disconnectMutation.mutate(conn.id)}
                        className="btn-secondary text-red-600"
                      >
                        断开
                      </button>
                    ) : (
                      <button
                        onClick={() => connectMutation.mutate(conn.id)}
                        className="btn-primary"
                      >
                        连接
                      </button>
                    )}
                    <button
                      onClick={() => {
                        if (confirm(`确定要删除"${conn.name}"吗？`)) {
                          deleteMutation.mutate(conn.id)
                        }
                      }}
                      className="text-gray-500 hover:text-red-600"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
