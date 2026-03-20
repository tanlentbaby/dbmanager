import React, { useState, useRef } from 'react'
import { useMutation } from '@tanstack/react-query'
import { importData, exportData, getSupportedFormats, getExportFormats } from '@/lib/importExport'
import { Toast } from '@/components/Toast'

interface ImportExportProps {
  tableName?: string
  data?: any[]
  columns?: string[]
  onImport?: (data: any[]) => void
}

export default function ImportExport({
  tableName,
  data = [],
  columns = [],
  onImport,
}: ImportExportProps) {
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const [isImporting, setIsImporting] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const importMutation = useMutation({
    mutationFn: async (file: File) => {
      setIsImporting(true)
      try {
        const result = await importData(file)
        return result
      } finally {
        setIsImporting(false)
      }
    },
    onSuccess: (result) => {
      setToast({ message: `成功导入 ${result.rowCount} 行数据`, type: 'success' })
      onImport?.(result.data)
    },
    onError: (error: any) => {
      setToast({ message: error.message, type: 'error' })
    },
  })

  const exportMutation = useMutation({
    mutationFn: async ({ format, filename }: { format: string; filename: string }) => {
      setIsExporting(true)
      try {
        exportData({
          format: format as any,
          data,
          columns: tableName ? [tableName] : undefined,
          filename,
        })
      } finally {
        setIsExporting(false)
      }
    },
    onSuccess: () => {
      setToast({ message: '导出成功', type: 'success' })
    },
    onError: (error: any) => {
      setToast({ message: error.message, type: 'error' })
    },
  })

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    importMutation.mutate(file)
    // 重置 input 以允许重复选择同一文件
    event.target.value = ''
  }

  const handleExport = (format: string) => {
    if (!data || data.length === 0) {
      setToast({ message: '没有数据可导出', type: 'error' })
      return
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5)
    const filename = `${tableName || 'export'}_${timestamp}.${format}`

    exportMutation.mutate({ format, filename })
  }

  return (
    <div className="space-y-4">
      {/* 导入区域 */}
      <div className="card">
        <h3 className="text-lg font-semibold mb-4">📥 导入数据</h3>
        <div className="flex items-center space-x-4">
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.json,.xlsx,.xls"
            onChange={handleFileSelect}
            className="hidden"
            disabled={isImporting}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isImporting}
            className="btn-primary"
          >
            {isImporting ? '导入中...' : '选择文件'}
          </button>
          <span className="text-sm text-gray-500">
            支持格式：{getSupportedFormats().join(', ')}
          </span>
        </div>
      </div>

      {/* 导出区域 */}
      <div className="card">
        <h3 className="text-lg font-semibold mb-4">📤 导出数据</h3>
        <div className="flex flex-wrap gap-4">
          {getExportFormats().map((format) => (
            <button
              key={format}
              onClick={() => handleExport(format)}
              disabled={isExporting || data.length === 0}
              className="btn-secondary"
            >
              {isExporting ? '导出中...' : `导出为 ${format.toUpperCase()}`}
            </button>
          ))}
        </div>
        {data.length > 0 && (
          <p className="text-sm text-gray-500 mt-2">
            共 {data.length} 行数据
          </p>
        )}
      </div>

      {/* Toast 提示 */}
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
