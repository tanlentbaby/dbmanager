import { memo } from 'react'
import { Handle, Position, NodeProps } from 'reactflow'
import type { TableNodeData } from '@/lib/erdGenerator'

function TableNode({ id, data }: NodeProps<TableNodeData>) {
  const {
    name,
    schema,
    columns = [],
    primaryKeys = [],
    showColumnTypes = true,
    showPrimaryKey = true,
    showForeignKey = true,
    showComments = false,
  } = data

  return (
    <div className="min-w-[280px] bg-white dark:bg-gray-800 rounded-lg shadow-lg border-2 border-gray-300 dark:border-gray-600 overflow-hidden">
      {/* 表头 */}
      <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-4 py-2">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-white text-lg">{name}</h3>
          {schema && (
            <span className="text-xs text-blue-100">{schema}</span>
          )}
        </div>
      </div>

      {/* 列列表 */}
      <div className="divide-y divide-gray-200 dark:divide-gray-700">
        {columns.map((column, index) => {
          const isPrimary = primaryKeys.includes(column.name)
          const isForeignKey = data.foreignKeys?.some(
            (fk) => fk.column === column.name
          )

          return (
            <div
              key={index}
              className={`px-4 py-2 flex items-center justify-between text-sm ${
                isPrimary ? 'bg-yellow-50 dark:bg-yellow-900/20' : ''
              }`}
            >
              <div className="flex items-center space-x-2">
                {/* 输入 Handle (用于外键关系) */}
                <Handle
                  type="target"
                  position={Position.Left}
                  id={column.name}
                  className="!w-2 !h-2 !bg-gray-400 !border-0"
                />

                {/* 列名 */}
                <div className="flex items-center space-x-2">
                  {isPrimary && showPrimaryKey && (
                    <span className="text-yellow-500">🔑</span>
                  )}
                  {isForeignKey && showForeignKey && (
                    <span className="text-blue-500">🔗</span>
                  )}
                  <span className="font-medium text-gray-900 dark:text-gray-100">
                    {column.name}
                  </span>
                </div>
              </div>

              {/* 列类型和属性 */}
              <div className="flex items-center space-x-2">
                {showColumnTypes && (
                  <span className="text-gray-500 dark:text-gray-400 text-xs">
                    {column.type}
                  </span>
                )}
                {!column.nullable && (
                  <span className="text-red-500 text-xs">*</span>
                )}
                {showComments && column.comment && (
                  <span className="text-gray-400 text-xs" title={column.comment}>
                    💬
                  </span>
                )}

                {/* 输出 Handle (用于外键关系) */}
                <Handle
                  type="source"
                  position={Position.Right}
                  id={column.name}
                  className="!w-2 !h-2 !bg-gray-400 !border-0"
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default memo(TableNode)
