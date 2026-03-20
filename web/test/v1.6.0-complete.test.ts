/**
 * v1.6.0 完整验证测试
 */

import { describe, it, expect, beforeEach } from 'vitest'
import {
  compareTableSchemas,
  compareData,
  generateSyncSQL,
  generateDataSyncSQL,
  formatDiffReport,
} from '../../web/src/lib/dataCompare'
import {
  executeBatch,
  generateBatchInsert,
  generateBatchUpdate,
  generateBatchDelete,
  validateBatchOperations,
  exportBatchResult,
} from '../../web/src/lib/batchOperations'

describe('v1.6.0 完整测试', () => {
  // ==================== 表结构对比完整测试 ====================
  describe('表结构对比完整测试', () => {
    const complexSchema1 = [
      { name: 'id', type: 'BIGINT', nullable: false, isPrimary: true, defaultValue: null },
      { name: 'username', type: 'VARCHAR(50)', nullable: false, isUnique: true, defaultValue: null },
      { name: 'email', type: 'VARCHAR(255)', nullable: false, defaultValue: null },
      { name: 'password_hash', type: 'VARCHAR(255)', nullable: false, defaultValue: null },
      { name: 'status', type: 'VARCHAR(20)', nullable: false, defaultValue: "'pending'" },
      { name: 'created_at', type: 'TIMESTAMP', nullable: false, defaultValue: 'NOW()' },
      { name: 'updated_at', type: 'TIMESTAMP', nullable: true, defaultValue: null },
    ]

    const complexSchema2 = [
      { name: 'id', type: 'BIGINT', nullable: false, isPrimary: true, defaultValue: null },
      { name: 'username', type: 'VARCHAR(100)', nullable: false, isUnique: true, defaultValue: null }, // 类型变化
      { name: 'email', type: 'VARCHAR(255)', nullable: true, defaultValue: null }, // nullable 变化
      { name: 'phone', type: 'VARCHAR(20)', nullable: true, defaultValue: null }, // 新增列
      { name: 'password_hash', type: 'VARCHAR(255)', nullable: false, defaultValue: null },
      { name: 'status', type: 'VARCHAR(20)', nullable: false, defaultValue: "'active'" }, // 默认值变化
      { name: 'created_at', type: 'TIMESTAMP', nullable: false, defaultValue: 'NOW()' },
      // updated_at 被删除
    ]

    it('完整对比复杂表结构', () => {
      const diff = compareTableSchemas('users', complexSchema1, complexSchema2)

      expect(diff.tableName).toBe('users')
      expect(diff.columnsAdded.length).toBe(1)
      expect(diff.columnsRemoved.length).toBe(1)
      expect(diff.columnsModified.length).toBeGreaterThanOrEqual(3)
    })

    it('检测所有新增列', () => {
      const diff = compareTableSchemas('users', complexSchema1, complexSchema2)
      
      expect(diff.columnsAdded.some(col => col.name === 'phone')).toBe(true)
      expect(diff.columnsAdded[0].changeType).toBe('added')
    })

    it('检测所有删除列', () => {
      const diff = compareTableSchemas('users', complexSchema1, complexSchema2)
      
      expect(diff.columnsRemoved.some(col => col.name === 'updated_at')).toBe(true)
      expect(diff.columnsRemoved[0].changeType).toBe('removed')
    })

    it('检测所有修改列', () => {
      const diff = compareTableSchemas('users', complexSchema1, complexSchema2)
      
      const usernameModified = diff.columnsModified.some(col => col.name === 'username')
      const emailModified = diff.columnsModified.some(col => col.name === 'email')
      const statusModified = diff.columnsModified.some(col => col.name === 'status')
      
      expect(usernameModified).toBe(true)
      expect(emailModified).toBe(true)
      expect(statusModified).toBe(true)
    })

    it('生成同步 SQL', () => {
      const diff = compareTableSchemas('users', complexSchema1, complexSchema2)
      const sqls = generateSyncSQL(diff, 'mysql')

      expect(sqls.length).toBeGreaterThan(0)
      expect(sqls.some(sql => sql.includes('ADD COLUMN phone'))).toBe(true)
      expect(sqls.some(sql => sql.includes('DROP COLUMN updated_at'))).toBe(true)
    })

    it('生成完整对比报告', () => {
      const diff = compareTableSchemas('users', complexSchema1, complexSchema2)
      const report = formatDiffReport(diff)

      expect(report).toContain('表结构对比：users')
      expect(report).toContain('新增列')
      expect(report).toContain('删除列')
      expect(report).toContain('修改列')
      expect(report).toContain('phone')
      expect(report).toContain('updated_at')
    })
  })

  // ==================== 数据对比完整测试 ====================
  describe('数据对比完整测试', () => {
    const largeData1 = Array.from({ length: 100 }, (_, i) => ({
      id: i + 1,
      name: `User ${i + 1}`,
      email: `user${i + 1}@example.com`,
      age: 20 + (i % 50),
      status: i % 3 === 0 ? 'active' : 'pending',
    }))

    const largeData2 = largeData1.map((item, i) => {
      if (i < 10) {
        // 修改前 10 条
        return { ...item, age: item.age + 1 }
      } else if (i >= 10 && i < 20) {
        // 删除 10-20 条
        return null
      } else {
        return item
      }
    }).filter(Boolean)

    // 新增 5 条
    for (let i = 0; i < 5; i++) {
      largeData2.push({
        id: 101 + i,
        name: `User ${101 + i}`,
        email: `user${101 + i}@example.com`,
        age: 25,
        status: 'active',
      })
    }

    it('对比大数据集', () => {
      const diffs = compareData(largeData1, largeData2, {
        keyColumns: ['id'],
      })

      expect(diffs.length).toBe(25) // 10 修改 + 10 删除 + 5 新增
    })

    it('检测所有新增记录', () => {
      const diffs = compareData(largeData1, largeData2, { keyColumns: ['id'] })
      const inserted = diffs.filter(d => d.changeType === 'inserted')

      expect(inserted.length).toBe(5)
      expect(inserted[0].key).toBe('101')
    })

    it('检测所有删除记录', () => {
      const diffs = compareData(largeData1, largeData2, { keyColumns: ['id'] })
      const deleted = diffs.filter(d => d.changeType === 'deleted')

      expect(deleted.length).toBe(10)
      expect(deleted[0].key).toBe('11')
    })

    it('检测所有修改记录', () => {
      const diffs = compareData(largeData1, largeData2, { keyColumns: ['id'] })
      const modified = diffs.filter(d => d.changeType === 'modified')

      expect(modified.length).toBe(10)
      expect(modified[0].key).toBe('1')
    })

    it('忽略指定列对比', () => {
      const diffs = compareData(largeData1, largeData2, {
        keyColumns: ['id'],
        ignoreColumns: ['age'],
      })

      // 忽略 age 列后，修改记录应该减少
      expect(diffs.length).toBeLessThan(25)
    })

    it('只对比指定列', () => {
      const diffs = compareData(largeData1, largeData2, {
        keyColumns: ['id'],
        compareColumns: ['status'],
      })

      // 只对比 status 列
      expect(diffs.length).toBeLessThan(25)
    })

    it('生成数据同步 SQL', () => {
      const diffs = compareData(largeData1, largeData2, { keyColumns: ['id'] })
      const sqls = generateDataSyncSQL('users', diffs, ['id'])

      expect(sqls.length).toBe(25)
      expect(sqls.some(sql => sql.includes('INSERT'))).toBe(true)
      expect(sqls.some(sql => sql.includes('DELETE'))).toBe(true)
      expect(sqls.some(sql => sql.includes('UPDATE'))).toBe(true)
    })
  })

  // ==================== 批量操作完整测试 ====================
  describe('批量操作完整测试', () => {
    it('生成大批量 INSERT', () => {
      const rows = Array.from({ length: 100 }, (_, i) => [
        i + 1,
        `User ${i + 1}`,
        `user${i + 1}@example.com`,
      ])

      const sql = generateBatchInsert('users', ['id', 'name', 'email'], rows)

      expect(sql).toContain('INSERT INTO users')
      expect(sql).toContain('VALUES')
      expect((sql.match(/\(/g) || []).length).toBeGreaterThan(100)
    })

    it('生成特殊字符的 INSERT', () => {
      const rows = [
        [1, "O'Brien", "obrien@example.com"],
        [2, "Test \"Quotes\"", "test@example.com"],
      ]

      const sql = generateBatchInsert('users', ['id', 'name', 'email'], rows)

      expect(sql).toContain("O''Brien")
      expect(sql).toContain('Test \\"Quotes\\"')
    })

    it('生成大批量 UPDATE', () => {
      const updates = Array.from({ length: 50 }, (_, i) => ({
        key: i + 1,
        value: i % 2 === 0 ? 'active' : 'inactive',
      }))

      const sqls = generateBatchUpdate('users', 'id', 'status', updates)

      expect(sqls.length).toBe(50)
      expect(sqls[0]).toContain("UPDATE users SET status = 'active'")
    })

    it('生成大批量 DELETE', () => {
      const keys = Array.from({ length: 100 }, (_, i) => i + 1)

      const sql = generateBatchDelete('users', 'id', keys)

      expect(sql).toContain('DELETE FROM users')
      expect(sql).toContain('WHERE id IN')
      expect((sql.match(/,/g) || []).length).toBe(99)
    })

    it('验证大批量操作', () => {
      const operations = Array.from({ length: 100 }, (_, i) => ({
        id: `op_${i}`,
        type: 'execute' as const,
        sql: `SELECT ${i}`,
        status: 'pending' as const,
      }))

      const result = validateBatchOperations(operations)

      expect(result.valid).toBe(true)
      expect(result.errors.length).toBe(0)
    })

    it('导出大批量结果', () => {
      const result = {
        total: 100,
        success: 95,
        failed: 5,
        duration: 1000,
        operations: Array.from({ length: 100 }, (_, i) => ({
          id: `op_${i}`,
          type: 'execute' as const,
          sql: `SELECT ${i}`,
          status: i < 95 ? 'success' as const : 'error' as const,
          error: i < 95 ? undefined : 'Error',
          rowCount: i < 95 ? 1 : 0,
        })),
      }

      const json = exportBatchResult(result, 'json')
      expect(json).toContain('"total": 100')

      const csv = exportBatchResult(result, 'csv')
      expect(csv).toContain('id,type,sql,status')

      const sql = exportBatchResult(result, 'sql')
      expect(sql).toContain('SELECT')
    })
  })

  // ==================== 集成测试 ====================
  describe('集成测试', () => {
    it('完整数据迁移流程', () => {
      // 1. 对比表结构
      const schemaDiff = compareTableSchemas('users', [
        { name: 'id', type: 'INT' },
        { name: 'name', type: 'VARCHAR(255)' },
      ], [
        { name: 'id', type: 'INT' },
        { name: 'name', type: 'VARCHAR(500)' },
        { name: 'email', type: 'VARCHAR(255)' },
      ])

      // 2. 生成同步 SQL
      const syncSQL = generateSyncSQL(schemaDiff, 'mysql')

      // 3. 对比数据
      const dataDiff = compareData(
        [{ id: 1, name: 'Alice' }],
        [{ id: 1, name: 'Alice', email: 'alice@example.com' }],
        { keyColumns: ['id'] }
      )

      // 4. 生成数据同步 SQL
      const dataSyncSQL = generateDataSyncSQL('users', dataDiff, ['id'])

      // 5. 生成报告
      const report = formatDiffReport(schemaDiff, dataDiff)

      expect(syncSQL.length).toBeGreaterThan(0)
      expect(dataSyncSQL.length).toBeGreaterThan(0)
      expect(report).toContain('表结构对比')
    })

    it('完整批量操作流程', () => {
      // 1. 生成批量 SQL
      const insertSQL = generateBatchInsert('users', ['id', 'name'], [
        [1, 'Alice'],
        [2, 'Bob'],
      ])

      const updateSQL = generateBatchUpdate('users', 'id', 'status', [
        { key: 1, value: 'active' },
        { key: 2, value: 'active' },
      ])

      // 2. 创建操作列表
      const operations = [
        { id: '1', type: 'execute' as const, sql: insertSQL, status: 'pending' as const },
        { id: '2', type: 'execute' as const, sql: updateSQL.join(';'), status: 'pending' as const },
      ]

      // 3. 验证操作
      const validation = validateBatchOperations(operations)
      expect(validation.valid).toBe(true)

      // 4. 导出结果 (模拟)
      const result = {
        total: 2,
        success: 2,
        failed: 0,
        duration: 100,
        operations,
      }

      const exported = exportBatchResult(result, 'json')
      expect(exported).toContain('"success": 2')
    })
  })

  // ==================== 边界测试 ====================
  describe('边界测试', () => {
    it('空表对比', () => {
      const diff = compareTableSchemas('users', [], [])
      
      expect(diff.columnsAdded.length).toBe(0)
      expect(diff.columnsRemoved.length).toBe(0)
      expect(diff.columnsModified.length).toBe(0)
    })

    it('空数据对比', () => {
      const diffs = compareData([], [], { keyColumns: ['id'] })
      
      expect(diffs.length).toBe(0)
    })

    it('单条记录对比', () => {
      const diffs = compareData(
        [{ id: 1, name: 'Alice' }],
        [{ id: 1, name: 'Alice' }],
        { keyColumns: ['id'] }
      )
      
      expect(diffs.length).toBe(0)
    })

    it('单条 SQL 批量执行', () => {
      const sql = generateBatchInsert('users', ['id'], [[1]])
      expect(sql).toContain('INSERT INTO users')
    })

    it('超大字符串处理', () => {
      const longString = 'a'.repeat(10000)
      const sql = generateBatchInsert('users', ['name'], [[longString]])
      
      expect(sql.length).toBeGreaterThan(10000)
      expect(sql).toContain(longString)
    })
  })
})

console.log('✅ v1.6.0 完整测试套件就绪')
