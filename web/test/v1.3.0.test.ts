/**
 * v1.3.0 数据导入导出测试
 */

import { describe, it, expect } from 'vitest'
import {
  exportToCSV,
  exportToJSON,
  exportToExcel,
  exportToSQL,
  importFromCSV,
  importFromJSON,
  getSupportedFormats,
  getExportFormats,
} from '../../web/src/lib/importExport'

describe('v1.3.0 数据导入导出', () => {
  const testData = [
    { id: 1, name: 'Alice', email: 'alice@example.com' },
    { id: 2, name: 'Bob', email: 'bob@example.com' },
    { id: 3, name: 'Charlie', email: 'charlie@example.com' },
  ]

  it('支持导入格式', () => {
    const formats = getSupportedFormats()
    expect(formats).toContain('csv')
    expect(formats).toContain('json')
    expect(formats).toContain('xlsx')
    expect(formats.length).toBe(4)
  })

  it('支持导出格式', () => {
    const formats = getExportFormats()
    expect(formats).toContain('csv')
    expect(formats).toContain('json')
    expect(formats).toContain('xlsx')
    expect(formats).toContain('sql')
  })

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

  it('CSV 导入函数存在', () => {
    expect(importFromCSV).toBeDefined()
    expect(typeof importFromCSV).toBe('function')
  })

  it('JSON 导入函数存在', () => {
    expect(importFromJSON).toBeDefined()
    expect(typeof importFromJSON).toBe('function')
  })

  it('导出空数据抛出错误', () => {
    expect(() => exportToCSV([])).toThrow('数据为空')
    expect(() => exportToExcel([])).toThrow('数据为空')
    expect(() => exportToSQL([], 'users')).toThrow('数据为空')
  })

  it('SQL 导出需要表名', () => {
    expect(() =>
      exportToSQL(testData, '', 'export.sql')
    ).toThrow('SQL 导出需要指定表名')
  })
})

console.log('✅ v1.3.0 测试框架就绪')
