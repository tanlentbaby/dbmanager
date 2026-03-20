import React, { useCallback, useMemo, useRef } from 'react'
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  ReactFlowProvider,
  ReactFlowInstance,
} from 'reactflow'
import 'reactflow/dist/style.css'
import { toPng } from 'html-to-image'
import { jsPDF } from 'jspdf'
import TableNode from './TableNode'
import { generateERDiagram, exportERDToSQL, TableNode } from '@/lib/erdGenerator'

const nodeTypes = {
  table: TableNode,
}

interface ERDiagramProps {
  tables: any[]
  onExport?: (format: string) => void
}

function ERDiagramContent({ tables, onExport }: ERDiagramProps) {
  const flowRef = useRef<ReactFlowInstance>(null)
  const reactFlowWrapper = useRef<HTMLDivElement>(null)

  // 生成 ER 图数据
  const { initialNodes, initialEdges } = useMemo(() => {
    const erd = generateERDiagram(tables, {
      showColumnTypes: true,
      showPrimaryKey: true,
      showForeignKey: true,
    })
    return {
      initialNodes: erd.nodes,
      initialEdges: erd.edges,
    }
  }, [tables])

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)

  // 导出为图片
  const handleExportImage = useCallback(async (format: 'png' | 'jpeg' | 'svg') => {
    if (!reactFlowWrapper.current) return

    try {
      const dataUrl = await toPng(reactFlowWrapper.current, {
        quality: 1.0,
        backgroundColor: '#ffffff',
      })

      const link = document.createElement('a')
      link.download = `erd.${format}`
      link.href = dataUrl
      link.click()

      onExport?.(`图片导出成功 (${format})`)
    } catch (error) {
      onExport?.(`导出失败：${error}`)
    }
  }, [onExport])

  // 导出为 PDF
  const handleExportPDF = useCallback(async () => {
    if (!reactFlowWrapper.current) return

    try {
      const dataUrl = await toPng(reactFlowWrapper.current, {
        quality: 1.0,
        backgroundColor: '#ffffff',
      })

      const img = new Image()
      img.src = dataUrl

      await new Promise((resolve) => {
        img.onload = resolve
      })

      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4',
      })

      const pageWidth = pdf.internal.pageSize.getWidth()
      const pageHeight = pdf.internal.pageSize.getHeight()
      const imgWidth = img.width
      const imgHeight = img.height

      const ratio = Math.min(
        (pageWidth - 20) / imgWidth,
        (pageHeight - 20) / imgHeight
      )

      const width = imgWidth * ratio
      const height = imgHeight * ratio

      pdf.addImage(dataUrl, 'PNG', 10, 10, width, height)
      pdf.save('erd.pdf')

      onExport?.('PDF 导出成功')
    } catch (error) {
      onExport?.(`导出失败：${error}`)
    }
  }, [onExport])

  // 导出为 SQL
  const handleExportSQL = useCallback(() => {
    try {
      const sql = exportERDToSQL(
        tables.map((t) => ({
          id: t.name,
          name: t.name,
          columns: t.columns,
          primaryKeys: t.primaryKeys || [],
          foreignKeys: t.foreignKeys || [],
        }))
      )

      const blob = new Blob([sql], { type: 'application/sql' })
      const link = document.createElement('a')
      link.download = 'schema.sql'
      link.href = URL.createObjectURL(blob)
      link.click()

      onExport?.('SQL 导出成功')
    } catch (error) {
      onExport?.(`导出失败：${error}`)
    }
  }, [tables, onExport])

  return (
    <div className="h-full flex flex-col">
      {/* 工具栏 */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-2 flex items-center justify-between">
        <h2 className="text-lg font-semibold">ER 图</h2>
        <div className="flex space-x-2">
          <button
            onClick={() => handleExportImage('png')}
            className="btn-secondary text-sm"
          >
            🖼️ PNG
          </button>
          <button
            onClick={() => handleExportImage('jpeg')}
            className="btn-secondary text-sm"
          >
            🖼️ JPEG
          </button>
          <button
            onClick={handleExportPDF}
            className="btn-secondary text-sm"
          >
            📄 PDF
          </button>
          <button
            onClick={handleExportSQL}
            className="btn-secondary text-sm"
          >
            💾 SQL
          </button>
        </div>
      </div>

      {/* ER 图画布 */}
      <div ref={reactFlowWrapper} className="flex-1">
        <ReactFlow
          ref={flowRef}
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          nodeTypes={nodeTypes}
          fitView
          attributionPosition="bottom-left"
        >
          <Background color="#aaa" gap={16} />
          <Controls />
          <MiniMap
            nodeStrokeColor={(n) => {
              if (n.type === 'table') return '#0041d0'
              return '#eee'
            }}
            nodeColor={(n) => {
              if (n.type === 'table') return '#fff'
              return '#f8f8f8'
            }}
            nodeBorderRadius={8}
          />
        </ReactFlow>
      </div>
    </div>
  )
}

export default function ERDiagram(props: ERDiagramProps) {
  return (
    <ReactFlowProvider>
      <ERDiagramContent {...props} />
    </ReactFlowProvider>
  )
}
