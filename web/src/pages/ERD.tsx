import React from 'react'
import ERDiagram from '@/components/ERD/ERDiagram'
import { useQuery } from '@tanstack/react-query'
import { dbApi } from '@/lib/api'
import { Toast } from '@/components/Toast'

export default function ERD() {
  const [toast, setToast] = React.useState<{ message: string; type: 'success' | 'error' } | null>(null)

  const { data: tablesData, isLoading } = useQuery({
    queryKey: ['database-tables'],
    queryFn: () => dbApi.getTables(),
  })

  const tables = tablesData?.data || []

  const handleExport = (message: string) => {
    setToast({ message, type: 'success' })
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-gray-500">加载表结构...</p>
        </div>
      </div>
    )
  }

  if (!tables || tables.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <p className="text-gray-500 text-lg">暂无表数据</p>
          <p className="text-gray-400 text-sm mt-2">请先连接数据库并获取表结构</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full">
      <ERDiagram tables={tables} onExport={handleExport} />
      
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onHide={() => setToast(null)}
        />
      )}
    </div>
  )
}
