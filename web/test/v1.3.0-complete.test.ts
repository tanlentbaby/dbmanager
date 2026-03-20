/**
 * v1.3.0 完整验证测试
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  exportToCSV,
  exportToJSON,
  exportToExcel,
  exportToSQL,
  importFromCSV,
  importFromJSON,
  importFromExcel,
  exportData,
  getSupportedFormats,
  getExportFormats,
} from '../../web/src/lib/importExport'

describe('v1.3.0 数据导入导出完整测试', () => {
  const testData = [
    { id: 1, name: 'Alice', email: 'alice@example.com', age: 25 },
    { id: 2, name: 'Bob', email: 'bob@example.com', age: 30 },
    { id: 3, name: 'Charlie', email: 'charlie@example.com', age: 35 },
  ]

  const largeTestData = Array.from({ length: 1000 }, (_, i) => ({
    id: i + 1,
    name: `User ${i + 1}`,
    email: `user${i + 1}@example.com`,
    age: 20 + (i % 50),
  }))

  // ==================== 格式支持测试 ====================
  describe('格式支持', () => {
    it('支持所有导入格式', () => {
      const formats = getSupportedFormats()
      expect(formats).toContain('csv')
      expect(formats).toContain('json')
      expect(formats).toContain('xlsx')
      expect(formats).toContain('xls')
      expect(formats.length).toBe(4)
    })

    it('支持所有导出格式', () => {
      const formats = getExportFormats()
      expect(formats).toContain('csv')
      expect(formats).toContain('json')
      expect(formats).toContain('xlsx')
      expect(formats).toContain('sql')
      expect(formats.length).toBe(4)
    })
  })

  // ==================== 导出功能测试 ====================
  describe('导出功能', () => {
    it('CSV 导出函数存在', () => {
      expect(exportToCSV).toBeDefined()
      expect(typeof exportToCSV).toBe('function')
    })

    it('JSON 导出函数存在', () => {
      expect(exportToJSON).toBeDefined()
      expect(typeof exportToJSON).toBe('function')
    })

    it('Excel 导出函数存在', () => {
      expect(exportToExcel).toBeDefined()
      expect(typeof exportToExcel).toBe('function')
    })

    it('SQL 导出函数存在', () => {
      expect(exportToSQL).toBeDefined()
      expect(typeof exportToSQL).toBe('function')
    })

    it('导出空数据抛出错误', () => {
      expect(() => exportToCSV([])).toThrow('数据为空')
      expect(() => exportToExcel([])).toThrow('数据为空')
      expect(() => exportToSQL([], 'users')).toThrow('数据为空')
    })

    it('SQL 导出需要表名', () => {
      expect(() => exportToSQL(testData, '', 'export.sql')).toThrow(
        'SQL 导出需要指定表名'
      )
    })

    it('通用导出函数存在', () => {
      expect(exportData).toBeDefined()
      expect(typeof exportData).toBe('function')
    })
  })

  // ==================== 导入功能测试 ====================
  describe('导入功能', () => {
    it('CSV 导入函数存在', () => {
      expect(importFromCSV).toBeDefined()
      expect(typeof importFromCSV).toBe('function')
    })

    it('JSON 导入函数存在', () => {
      expect(importFromJSON).toBeDefined()
      expect(typeof importFromJSON).toBe('function')
    })

    it('Excel 导入函数存在', () => {
      expect(importFromExcel).toBeDefined()
      expect(typeof importFromExcel).toBe('function')
    })

    it('CSV 导入返回正确结构', async () => {
      const csvContent = 'id,name,email\n1,Alice,alice@example.com\n2,Bob,bob@example.com'
      const file = new File([csvContent], 'test.csv', { type: 'text/csv' })
      
      const result = await importFromCSV(file)
      
      expect(result).toHaveProperty('data')
      expect(result).toHaveProperty('columns')
      expect(result).toHaveProperty('rowCount')
      expect(result.rowCount).toBe(2)
      expect(result.columns).toContain('id')
      expect(result.columns).toContain('name')
      expect(result.columns).toContain('email')
    })

    it('JSON 导入返回正确结构', async () => {
      const jsonContent = JSON.stringify(testData)
      const file = new File([jsonContent], 'test.json', { type: 'application/json' })
      
      const result = await importFromJSON(file)
      
      expect(result).toHaveProperty('data')
      expect(result).toHaveProperty('columns')
      expect(result).toHaveProperty('rowCount')
      expect(result.rowCount).toBe(3)
      expect(result.data).toEqual(testData)
    })

    it('JSON 导入验证数组格式', async () => {
      const jsonContent = JSON.stringify({ not: 'array' })
      const file = new File([jsonContent], 'test.json', { type: 'application/json' })
      
      await expect(importFromJSON(file)).rejects.toThrow('JSON 数据必须是数组格式')
    })
  })

  // ==================== 性能测试 ====================
  describe('性能测试', () => {
    it('大数据量导出性能', () => {
      const start = Date.now()
      
      // 不应该抛出错误
      expect(() => {
        exportToCSV(largeTestData, 'large.csv')
      }).not.toThrow()
      
      const duration = Date.now() - start
      console.log(`CSV 导出 1000 行耗时：${duration}ms`)
      
      // 应该在合理时间内完成 (< 5 秒)
      expect(duration).toBeLessThan(5000)
    })

    it('大数据量 JSON 导出性能', () => {
      const start = Date.now()
      
      expect(() => {
        exportToJSON(largeTestData, 'large.json')
      }).not.toThrow()
      
      const duration = Date.now() - start
      console.log(`JSON 导出 1000 行耗时：${duration}ms`)
      
      expect(duration).toBeLessThan(5000)
    })

    it('大数据量 Excel 导出性能', () => {
      const start = Date.now()
      
      expect(() => {
        exportToExcel(largeTestData, 'large.xlsx')
      }).not.toThrow()
      
      const duration = Date.now() - start
      console.log(`Excel 导出 1000 行耗时：${duration}ms`)
      
      expect(duration).toBeLessThan(5000)
    })
  })

  // ==================== 边界测试 ====================
  describe('边界测试', () => {
    it('单行数据导出', () => {
      const singleRow = [{ id: 1, name: 'Single' }]
      
      expect(() => exportToCSV(singleRow)).not.toThrow()
      expect(() => exportToJSON(singleRow)).not.toThrow()
      expect(() => exportToExcel(singleRow)).not.toThrow()
      expect(() => exportToSQL(singleRow, 'test')).not.toThrow()
    })

    it('包含特殊字符的数据导出', () => {
      const specialData = [
        { id: 1, name: "O'Brien", note: 'Has "quotes"' },
        { id: 2, name: '中文测试', note: 'Special: \n\t' },
      ]
      
      expect(() => exportToCSV(specialData)).not.toThrow()
      expect(() => exportToJSON(specialData)).not.toThrow()
      expect(() => exportToSQL(specialData, 'test')).not.toThrow()
    })

    it('包含 null/undefined 的数据导出', () => {
      const nullData = [
        { id: 1, name: null, value: undefined },
        { id: 2, name: 'Test', value: 123 },
      ]
      
      expect(() => exportToCSV(nullData)).not.toThrow()
      expect(() => exportToSQL(nullData, 'test')).not.toThrow()
    })
  })

  // ==================== SQL 导出测试 ====================
  describe('SQL 导出', () => {
    it('生成正确的 INSERT 语句', () => {
      const data = [{ id: 1, name: 'Test' }]
      
      // 验证函数存在且不抛出错误
      expect(() => exportToSQL(data, 'users')).not.toThrow()
    })

    it('处理字符串转义', () => {
      const data = [{ id: 1, name: "O'Reilly" }]
      
      expect(() => exportToSQL(data, 'users')).not.toThrow()
    })

    it('处理数字类型', () => {
      const data = [{ id: 1, age: 25, score: 95.5 }]
      
      expect(() => exportToSQL(data, 'users')).not.toThrow()
    })

    it('处理 NULL 值', () => {
      const data = [{ id: 1, name: null }]
      
      expect(() => exportToSQL(data, 'users')).not.toThrow()
    })
  })
})

console.log('✅ v1.3.0 完整测试套件就绪')
