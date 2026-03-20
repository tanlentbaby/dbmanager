import React, { useState } from 'react'
import { buildSelectQuery, SelectQuery, Join, WhereCondition, OrderBy, QueryTemplates } from '@/lib/queryBuilder'
import { Button } from '@/components/Button'
import { Toast } from '@/components/Toast'

interface QueryBuilderProps {
  tables: any[]
  onExecute: (sql: string) => void
}

export default function QueryBuilder({ tables, onExecute }: QueryBuilderProps) {
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  
  const [query, setQuery] = useState<SelectQuery>({
    tables: [],
    columns: [],
    joins: [],
    where: [],
    orderBy: [],
    groupBy: [],
    limit: 100,
  })

  const [selectedTable, setSelectedTable] = useState('')

  // 选择主表
  const handleSelectTable = (tableName: string) => {
    const table = tables.find((t) => t.name === tableName)
    if (!table) return

    const columns = table.columns?.map((col: any) => `${tableName}.${col.name}`) || []

    setQuery({
      ...query,
      tables: [tableName],
      columns,
    })
    setSelectedTable(tableName)
  }

  // 添加列
  const handleAddColumn = (columnName: string) => {
    if (!query.tables[0]) return
    const fullColumn = `${query.tables[0]}.${columnName}`
    if (!query.columns.includes(fullColumn)) {
      setQuery({
        ...query,
        columns: [...query.columns, fullColumn],
      })
    }
  }

  // 添加 JOIN
  const handleAddJoin = (joinTable: string, joinType: Join['type'] = 'LEFT JOIN') => {
    if (!query.tables[0]) return
    
    const newJoin: Join = {
      type: joinType,
      table: joinTable,
      on: `${query.tables[0]}.id = ${joinTable}.${query.tables[0]}_id`,
    }

    setQuery({
      ...query,
      joins: [...(query.joins || []), newJoin],
    })
  }

  // 添加 WHERE 条件
  const handleAddWhere = (column: string, operator: WhereCondition['operator'], value: any) => {
    const newCondition: WhereCondition = {
      column,
      operator,
      value,
      logic: query.where?.length ? 'AND' : undefined,
    }

    setQuery({
      ...query,
      where: [...(query.where || []), newCondition],
    })
  }

  // 添加 ORDER BY
  const handleAddOrderBy = (column: string, direction: OrderBy['direction'] = 'ASC') => {
    const newOrderBy: OrderBy = { column, direction }
    setQuery({
      ...query,
      orderBy: [...(query.orderBy || []), newOrderBy],
    })
  }

  // 生成 SQL
  const generatedSQL = buildSelectQuery(query)

  // 执行查询
  const handleExecute = () => {
    onExecute(generatedSQL)
    setToast({ message: '查询已执行', type: 'success' })
  }

  // 使用模板
  const handleUseTemplate = (templateName: string) => {
    if (!query.tables[0]) {
      setToast({ message: '请先选择表', type: 'error' })
      return
    }

    const table = query.tables[0]
    let template: SelectQuery

    switch (templateName) {
      case 'count':
        template = QueryTemplates.selectCount(table)
        break
      case 'pagination':
        template = QueryTemplates.selectWithPagination(table, 100, 0)
        break
      default:
        return
    }

    setQuery(template)
    setToast({ message: '模板已应用', type: 'success' })
  }

  return (
    <div className="space-y-6">
      {/* 表选择 */}
      <div className="card">
        <h3 className="text-lg font-semibold mb-4">1. 选择表</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
          {tables.map((table) => (
            <button
              key={table.name}
              onClick={() => handleSelectTable(table.name)}
              className={`px-4 py-2 rounded-lg text-sm ${
                query.tables.includes(table.name)
                  ? 'bg-primary text-white'
                  : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600'
              }`}
            >
              {table.name}
            </button>
          ))}
        </div>
      </div>

      {/* 列选择 */}
      {selectedTable && (
        <div className="card">
          <h3 className="text-lg font-semibold mb-4">2. 选择列</h3>
          <div className="flex flex-wrap gap-2">
            {tables
              .find((t) => t.name === selectedTable)
              ?.columns?.map((col: any) => (
                <button
                  key={col.name}
                  onClick={() => handleAddColumn(col.name)}
                  className="px-3 py-1 bg-gray-200 dark:bg-gray-700 rounded text-sm hover:bg-gray-300 dark:hover:bg-gray-600"
                >
                  {col.name}
                </button>
              ))}
          </div>
          <div className="mt-4">
            <p className="text-sm text-gray-500">已选列：</p>
            <div className="flex flex-wrap gap-2 mt-2">
              {query.columns.map((col) => (
                <span key={col} className="px-2 py-1 bg-primary/10 text-primary rounded text-sm">
                  {col}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* JOIN 配置 */}
      {selectedTable && (
        <div className="card">
          <h3 className="text-lg font-semibold mb-4">3. 添加 JOIN</h3>
          <div className="flex flex-wrap gap-2">
            {tables
              .filter((t) => t.name !== selectedTable)
              .map((table) => (
                <button
                  key={table.name}
                  onClick={() => handleAddJoin(table.name)}
                  className="px-3 py-1 bg-gray-200 dark:bg-gray-700 rounded text-sm hover:bg-gray-300 dark:hover:bg-gray-600"
                >
                  + {table.name}
                </button>
              ))}
          </div>
        </div>
      )}

      {/* 查询模板 */}
      <div className="card">
        <h3 className="text-lg font-semibold mb-4">📋 查询模板</h3>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => handleUseTemplate('count')} className="btn-secondary text-sm">
            📊 COUNT 统计
          </button>
          <button onClick={() => handleUseTemplate('pagination')} className="btn-secondary text-sm">
            📄 分页查询
          </button>
        </div>
      </div>

      {/* SQL 预览 */}
      <div className="card">
        <h3 className="text-lg font-semibold mb-4">📝 生成的 SQL</h3>
        <pre className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg overflow-x-auto text-sm font-mono">
          {generatedSQL || '-- 请先选择表'}
        </pre>
        <div className="mt-4 flex gap-4">
          <Button onClick={handleExecute} disabled={!query.tables.length}>
            ▶️ 执行查询
          </Button>
          <Button
            onClick={() => {
              navigator.clipboard.writeText(generatedSQL)
              setToast({ message: 'SQL 已复制到剪贴板', type: 'success' })
            }}
            variant="secondary"
            disabled={!query.tables.length}
          >
            📋 复制 SQL
          </Button>
        </div>
      </div>

      {/* Toast 提示 */}
      {toast && (
        <Toast message={toast.message} type={toast.type} onHide={() => setToast(null)} />
      )}
    </div>
  )
}
