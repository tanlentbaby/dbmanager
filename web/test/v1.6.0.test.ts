/**
 * v1.6.0 数据对比和批量操作测试
 */

import { describe, it, expect } from 'vitest'
import {
  compareTableSchemas,
  compareData,
  generateSyncSQL,
  formatDiffReport,
} from '../../web/src/lib/dataCompare'
import {
  executeBatch,
  generateBatchInsert,
  generateBatchUpdate,
  generateBatchDelete,
  validateBatchOperations,
} from '../../web/src/lib/batchOperations'

describe('v1.6.0 数据对比和批量操作', () => {
  // ==================== 表结构对比测试 ====================
  describe('表结构对比', () => {
    const schema1 = [
      { name: 'id', type: 'INT', nullable: false, isPrimary: true },
      { name: 'name', type: 'VARCHAR(255)', nullable: false },
      { name: 'email', type: 'VARCHAR(255)', nullable: true },
    ]

    const schema2 = [
      { name: 'id', type: 'INT', nullable: false, isPrimary: true },
      { name: 'name', type: 'VARCHAR(500)', nullable: false }, // 类型变化
      { name: 'phone', type: 'VARCHAR(20)', nullable: true }, // 新增列
      // email 列被删除
    ]

    it('对比表结构', () => {
      const diff = compareTableSchemas('users', schema1, schema2)

      expect(diff.tableName).toBe('users')
      expect(diff.columnsAdded.length).toBe(1)
      expect(diff.columnsRemoved.length).toBe(1)
      expect(diff.columnsModified.length).toBe(1)
    })

    it('检测新增列', () => {
      const diff = compareTableSchemas('users', schema1, schema2)

      expect(diff.columnsAdded.some((col) => col.name === 'phone')).toBe(true)
    })

    it('检测删除列', () => {
      const diff = compareTableSchemas('users', schema1, schema2)

      expect(diff.columnsRemoved.some((col) => col.name === 'email')).toBe(true)
    })

    it('检测修改列', () => {
      const diff = compareTableSchemas('users', schema1, schema2)

      const modified = diff.columnsModified.find((col) => col.name === 'name')
      expect(modified).toBeDefined()
      expect(modified?.oldValue?.type).toBe('VARCHAR(255)')
      expect(modified?.newValue?.type).toBe('VARCHAR(500)')
    })

    it('相同表结构无变化', () => {
      const diff = compareTableSchemas('users', schema1, schema1)

      expect(diff.columnsAdded.length).toBe(0)
      expect(diff.columnsRemoved.length).toBe(0)
      expect(diff.columnsModified.length).toBe(0)
    })
  })

  // ==================== 数据对比测试 ====================
  describe('数据对比', () => {
    const data1 = [
      { id: 1, name: 'Alice', age: 25 },
      { id: 2, name: 'Bob', age: 30 },
      { id: 3, name: 'Charlie', age: 35 },
    ]

    const data2 = [
      { id: 1, name: 'Alice', age: 26 }, // age 变化
      { id: 2, name: 'Bob', age: 30 },
      { id: 4, name: 'David', age: 40 }, // 新增
      // id: 3 被删除
    ]

    it('对比数据', () => {
      const diffs = compareData(data1, data2, {
        keyColumns: ['id'],
      })

      expect(diffs.length).toBe(3) // 1 修改 + 1 新增 + 1 删除
    })

    it('检测新增记录', () => {
      const diffs = compareData(data1, data2, { keyColumns: ['id'] })
      const inserted = diffs.find((d) => d.changeType === 'inserted')

      expect(inserted).toBeDefined()
      expect(inserted?.key).toBe('4')
    })

    it('检测删除记录', () => {
      const diffs = compareData(data1, data2, { keyColumns: ['id'] })
      const deleted = diffs.find((d) => d.changeType === 'deleted')

      expect(deleted).toBeDefined()
      expect(deleted?.key).toBe('3')
    })

    it('检测修改记录', () => {
      const diffs = compareData(data1, data2, { keyColumns: ['id'] })
      const modified = diffs.find((d) => d.changeType === 'modified')

      expect(modified).toBeDefined()
      expect(modified?.key).toBe('1')
    })
  })

  // ==================== SQL 生成测试 ====================
  describe('SQL 生成', () => {
    it('生成批量 INSERT', () => {
      const sql = generateBatchInsert('users', ['id', 'name', 'email'], [
        [1, 'Alice', 'alice@example.com'],
        [2, 'Bob', 'bob@example.com'],
      ])

      expect(sql).toContain('INSERT INTO users')
      expect(sql).toContain('(id, name, email)')
      expect(sql).toContain("VALUES ('Alice', 'alice@example.com')")
    })

    it('生成批量 UPDATE', () => {
      const sqls = generateBatchUpdate('users', 'id', 'status', [
        { key: 1, value: 'active' },
        { key: 2, value: 'inactive' },
      ])

      expect(sqls.length).toBe(2)
      expect(sqls[0]).toContain("UPDATE users SET status = 'active' WHERE id = 1")
    })

    it('生成批量 DELETE', () => {
      const sql = generateBatchDelete('users', 'id', [1, 2, 3])

      expect(sql).toContain('DELETE FROM users')
      expect(sql).toContain('WHERE id IN (1, 2, 3)')
    })

    it('生成同步 SQL', () => {
      const diff = compareTableSchemas('users', [
        { name: 'id', type: 'INT' },
      ], [
        { name: 'id', type: 'INT' },
        { name: 'name', type: 'VARCHAR(255)' },
      ])

      const sqls = generateSyncSQL(diff, 'mysql')

      expect(sqls.length).toBe(1)
      expect(sqls[0]).toContain('ALTER TABLE users ADD COLUMN name')
    })
  })

  // ==================== 格式化报告测试 ====================
  describe('格式化报告', () => {
    it('生成对比报告', () => {
      const diff = compareTableSchemas('users', [
        { name: 'id', type: 'INT' },
      ], [
        { name: 'id', type: 'INT' },
        { name: 'name', type: 'VARCHAR(255)' },
      ])

      const report = formatDiffReport(diff)

      expect(report).toContain('表结构对比：users')
      expect(report).toContain('新增列')
      expect(report).toContain('name')
    })

    it('无变化报告', () => {
      const diff = compareTableSchemas('users', [
        { name: 'id', type: 'INT' },
      ], [
        { name: 'id', type: 'INT' },
      ])

      const report = formatDiffReport(diff)

      expect(report).toContain('✅ 无变化')
    })
  })

  // ==================== 批量操作验证测试 ====================
  describe('批量操作验证', () => {
    it('验证有效操作', () => {
      const operations = [
        { id: '1', type: 'execute' as const, sql: 'SELECT 1', status: 'pending' as const },
      ]

      const result = validateBatchOperations(operations)

      expect(result.valid).toBe(true)
      expect(result.errors.length).toBe(0)
    })

    it('验证空 SQL', () => {
      const operations = [
        { id: '1', type: 'execute' as const, sql: '', status: 'pending' as const },
      ]

      const result = validateBatchOperations(operations)

      expect(result.valid).toBe(false)
      expect(result.errors).toContain('操作 1: SQL 为空')
    })

    it('验证多个操作', () => {
      const operations = [
        { id: '1', type: 'execute' as const, sql: 'SELECT 1', status: 'pending' as const },
        { id: '2', type: 'execute' as const, sql: 'SELECT 2', status: 'pending' as const },
      ]

      const result = validateBatchOperations(operations)

      expect(result.valid).toBe(true)
    })
  })
})

console.log('✅ v1.6.0 测试框架就绪')
