/**
 * v1.7.0 数据结构同步和迁移测试
 */

import { describe, it, expect } from 'vitest'
import {
  generateSyncPlan,
  validateSyncPlan,
  exportSyncPlan,
  calculateSyncProgress,
} from '../../web/src/lib/schemaSync'
import {
  generateMigrationPlan,
  validateMigrationPlan,
  exportMigrationReport,
  calculateMigrationProgress,
  generateBatchInsertSQL,
  generateTruncateSQL,
} from '../../web/src/lib/dataMigration'

describe('v1.7.0 数据结构同步和迁移', () => {
  // ==================== 结构同步测试 ====================
  describe('结构同步', () => {
    const sourceTables = [
      {
        name: 'users',
        columns: [
          { name: 'id', type: 'INT', nullable: false, isPrimary: true },
          { name: 'name', type: 'VARCHAR(255)', nullable: false },
          { name: 'email', type: 'VARCHAR(255)', nullable: false },
        ],
        foreignKeys: [],
      },
    ]

    const targetTables = [
      {
        name: 'users',
        columns: [
          { name: 'id', type: 'INT', nullable: false, isPrimary: true },
          { name: 'name', type: 'VARCHAR(500)', nullable: false }, // 类型不同
          // email 列缺失
        ],
        foreignKeys: [],
      },
    ]

    it('生成同步计划', () => {
      const plan = generateSyncPlan(sourceTables, targetTables, {
        sourceDatabase: 'source',
        targetDatabase: 'target',
      })

      expect(plan.id).toBeDefined()
      expect(plan.tables.length).toBe(1)
      expect(plan.status).toBe('pending')
    })

    it('检测列修改', () => {
      const plan = generateSyncPlan(sourceTables, targetTables, {
        sourceDatabase: 'source',
        targetDatabase: 'target',
      })

      const table = plan.tables[0]
      expect(table.action).toBe('modify')
      expect(table.columns.some((c: any) => c.action === 'add')).toBe(true) // email
      expect(table.columns.some((c: any) => c.action === 'modify')).toBe(true) // name
    })

    it('验证同步计划', () => {
      const plan = generateSyncPlan(sourceTables, [], {
        sourceDatabase: 'source',
        targetDatabase: 'target',
      })

      const validation = validateSyncPlan(plan)
      expect(validation.valid).toBe(true)
    })

    it('导出 SQL', () => {
      const plan = generateSyncPlan(sourceTables, targetTables, {
        sourceDatabase: 'source',
        targetDatabase: 'target',
      })

      const sql = exportSyncPlan(plan, 'sql')
      expect(sql).toContain('-- 同步计划')
      expect(sql).toContain('ALTER TABLE')
    })

    it('导出 JSON', () => {
      const plan = generateSyncPlan(sourceTables, targetTables, {
        sourceDatabase: 'source',
        targetDatabase: 'target',
      })

      const json = exportSyncPlan(plan, 'json')
      expect(json).toContain('"id"')
      expect(json).toContain('"tables"')
    })

    it('计算进度', () => {
      const plan = generateSyncPlan(sourceTables, targetTables, {
        sourceDatabase: 'source',
        targetDatabase: 'target',
      })

      plan.tables[0].status = 'completed'
      const progress = calculateSyncProgress(plan)
      expect(progress).toBe(100)
    })
  })

  // ==================== 数据迁移测试 ====================
  describe('数据迁移', () => {
    const sourceTables = [
      { name: 'users', rowCount: 1000 },
      { name: 'orders', rowCount: 5000 },
      { name: 'products', rowCount: 500 },
    ]

    it('生成迁移计划', () => {
      const plan = generateMigrationPlan(sourceTables, {
        sourceDatabase: 'source',
        targetDatabase: 'target',
      })

      expect(plan.id).toBeDefined()
      expect(plan.tables.length).toBe(3)
      expect(plan.totalRows).toBe(6500)
    })

    it('过滤表迁移', () => {
      const plan = generateMigrationPlan(sourceTables, {
        sourceDatabase: 'source',
        targetDatabase: 'target',
        tables: ['users', 'orders'],
      })

      expect(plan.tables.length).toBe(2)
    })

    it('排除表迁移', () => {
      const plan = generateMigrationPlan(sourceTables, {
        sourceDatabase: 'source',
        targetDatabase: 'target',
        excludeTables: ['products'],
      })

      expect(plan.tables.length).toBe(2)
    })

    it('验证迁移计划', () => {
      const plan = generateMigrationPlan(sourceTables, {
        sourceDatabase: 'source',
        targetDatabase: 'target',
      })

      const validation = validateMigrationPlan(plan)
      expect(validation.valid).toBe(true)
    })

    it('生成批量 INSERT', () => {
      const rows = [
        [1, 'Alice', 'alice@example.com'],
        [2, 'Bob', 'bob@example.com'],
      ]

      const sqls = generateBatchInsertSQL('users', ['id', 'name', 'email'], rows, 100)
      expect(sqls.length).toBe(1)
      expect(sqls[0]).toContain('INSERT INTO users')
    })

    it('生成 TRUNCATE', () => {
      const sql = generateTruncateSQL('users')
      expect(sql).toBe('TRUNCATE TABLE users')
    })

    it '导出迁移报告 (TXT)', () => {
      const plan = generateMigrationPlan(sourceTables, {
        sourceDatabase: 'source',
        targetDatabase: 'target',
      })

      const report = exportMigrationReport(plan, 'txt')
      expect(report).toContain('数据迁移报告')
      expect(report).toContain('users')
    })

    it '导出迁移报告 (CSV)', () => {
      const plan = generateMigrationPlan(sourceTables, {
        sourceDatabase: 'source',
        targetDatabase: 'target',
      })

      const report = exportMigrationReport(plan, 'csv')
      expect(report).toContain('Table,Source Rows')
    })

    it '导出迁移报告 (JSON)', () => {
      const plan = generateMigrationPlan(sourceTables, {
        sourceDatabase: 'source',
        targetDatabase: 'target',
      })

      const report = exportMigrationReport(plan, 'json')
      expect(report).toContain('"totalRows"')
    })

    it '计算迁移进度', () => {
      const plan = generateMigrationPlan(sourceTables, {
        sourceDatabase: 'source',
        targetDatabase: 'target',
      })

      plan.migratedRows = 3250
      const progress = calculateMigrationProgress(plan)
      expect(progress).toBe(50)
    })
  })

  // ==================== 集成测试 ====================
  describe('集成测试', () => {
    it '完整同步流程', () => {
      // 1. 生成同步计划
      const syncPlan = generateSyncPlan(
        [{ name: 'users', columns: [{ name: 'id', type: 'INT' }] }],
        [],
        { sourceDatabase: 'source', targetDatabase: 'target' }
      )

      // 2. 验证
      const validation = validateSyncPlan(syncPlan)
      expect(validation.valid).toBe(true)

      // 3. 导出
      const sql = exportSyncPlan(syncPlan, 'sql')
      expect(sql).toContain('CREATE TABLE')
    })

    it '完整迁移流程', () => {
      // 1. 生成迁移计划
      const migrationPlan = generateMigrationPlan(
        [{ name: 'users', rowCount: 100 }],
        { sourceDatabase: 'source', targetDatabase: 'target' }
      )

      // 2. 验证
      const validation = validateMigrationPlan(migrationPlan)
      expect(validation.valid).toBe(true)

      // 3. 导出
      const report = exportMigrationReport(migrationPlan, 'txt')
      expect(report).toContain('迁移 ID')
    })
  })
})

console.log('✅ v1.7.0 测试框架就绪')
