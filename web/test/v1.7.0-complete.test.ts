/**
 * v1.7.0 完整验证测试
 */

import { describe, it, expect, beforeEach } from 'vitest'
import {
  generateSyncPlan,
  validateSyncPlan,
  exportSyncPlan,
  calculateSyncProgress,
  generateSyncSQL,
} from '../../web/src/lib/schemaSync'
import {
  generateMigrationPlan,
  validateMigrationPlan,
  exportMigrationReport,
  calculateMigrationProgress,
  generateBatchInsertSQL,
  processInChunks,
} from '../../web/src/lib/dataMigration'

describe('v1.7.0 完整测试', () => {
  // ==================== 结构同步完整测试 ====================
  describe('结构同步完整测试', () => {
    const complexSourceTables = [
      {
        name: 'users',
        columns: [
          { name: 'id', type: 'BIGINT', nullable: false, isPrimary: true, defaultValue: null },
          { name: 'username', type: 'VARCHAR(50)', nullable: false, isUnique: true },
          { name: 'email', type: 'VARCHAR(255)', nullable: false },
          { name: 'password_hash', type: 'VARCHAR(255)', nullable: false },
          { name: 'status', type: 'VARCHAR(20)', nullable: false, defaultValue: "'pending'" },
          { name: 'created_at', type: 'TIMESTAMP', nullable: false, defaultValue: 'NOW()' },
        ],
        foreignKeys: [],
      },
      {
        name: 'posts',
        columns: [
          { name: 'id', type: 'BIGINT', nullable: false, isPrimary: true },
          { name: 'user_id', type: 'BIGINT', nullable: false },
          { name: 'title', type: 'VARCHAR(255)', nullable: false },
          { name: 'content', type: 'TEXT', nullable: true },
        ],
        foreignKeys: [
          {
            column: 'user_id',
            referencesTable: 'users',
            referencesColumn: 'id',
            constraintName: 'fk_posts_user',
          },
        ],
      },
    ]

    const complexTargetTables = [
      {
        name: 'users',
        columns: [
          { name: 'id', type: 'BIGINT', nullable: false, isPrimary: true, defaultValue: null },
          { name: 'username', type: 'VARCHAR(100)', nullable: false, isUnique: true }, // 类型变化
          { name: 'email', type: 'VARCHAR(255)', nullable: true }, // nullable 变化
          { name: 'phone', type: 'VARCHAR(20)', nullable: true }, // 新增列
          { name: 'password_hash', type: 'VARCHAR(255)', nullable: false },
          { name: 'status', type: 'VARCHAR(20)', nullable: false, defaultValue: "'active'" }, // 默认值变化
          // created_at 被删除
        ],
        foreignKeys: [],
      },
      {
        name: 'posts',
        columns: [
          { name: 'id', type: 'BIGINT', nullable: false, isPrimary: true },
          { name: 'user_id', type: 'BIGINT', nullable: false },
          { name: 'title', type: 'VARCHAR(255)', nullable: false },
          { name: 'content', type: 'TEXT', nullable: true },
        ],
        foreignKeys: [
          {
            column: 'user_id',
            referencesTable: 'users',
            referencesColumn: 'id',
            constraintName: 'fk_posts_user',
          },
        ],
      },
    ]

    it '完整对比复杂表结构', () => {
      const plan = generateSyncPlan(complexSourceTables, complexTargetTables, {
        sourceDatabase: 'source_db',
        targetDatabase: 'target_db',
      })

      expect(plan.id).toBeDefined()
      expect(plan.tables.length).toBe(2)
      expect(plan.sourceDatabase).toBe('source_db')
      expect(plan.targetDatabase).toBe('target_db')
    })

    it '检测所有表变化', () => {
      const plan = generateSyncPlan(complexSourceTables, complexTargetTables, {
        sourceDatabase: 'source_db',
        targetDatabase: 'target_db',
      })

      const usersTable = plan.tables.find((t: any) => t.tableName === 'users')
      expect(usersTable).toBeDefined()
      expect(usersTable?.action).toBe('modify')

      // 检测新增列
      expect(usersTable?.columns.some((c: any) => c.name === 'phone' && c.action === 'add')).toBe(true)

      // 检测删除列
      expect(usersTable?.columns.some((c: any) => c.name === 'created_at' && c.action === 'drop')).toBe(true)

      // 检测修改列
      expect(usersTable?.columns.some((c: any) => c.name === 'username' && c.action === 'modify')).toBe(true)
    })

    it '验证复杂同步计划', () => {
      const plan = generateSyncPlan(complexSourceTables, complexTargetTables, {
        sourceDatabase: 'source_db',
        targetDatabase: 'target_db',
      })

      const validation = validateSyncPlan(plan)
      expect(validation.valid).toBe(true)
      expect(validation.warnings.length).toBeGreaterThanOrEqual(0)
    })

    it '导出复杂同步 SQL', () => {
      const plan = generateSyncPlan(complexSourceTables, complexTargetTables, {
        sourceDatabase: 'source_db',
        targetDatabase: 'target_db',
      })

      const sql = exportSyncPlan(plan, 'sql')
      expect(sql).toContain('-- 同步计划')
      expect(sql).toContain('ALTER TABLE')
      expect(sql.length).toBeGreaterThan(100)
    })

    it '计算多表进度', () => {
      const plan = generateSyncPlan(complexSourceTables, complexTargetTables, {
        sourceDatabase: 'source_db',
        targetDatabase: 'target_db',
      })

      // 初始进度
      expect(calculateSyncProgress(plan)).toBe(0)

      // 完成一个表
      plan.tables[0].status = 'completed'
      expect(calculateSyncProgress(plan)).toBe(50)

      // 完成所有表
      plan.tables[1].status = 'completed'
      expect(calculateSyncProgress(plan)).toBe(100)
    })

    it '生成同步 SQL 语句', () => {
      const plan = generateSyncPlan(complexSourceTables, complexTargetTables, {
        sourceDatabase: 'source_db',
        targetDatabase: 'target_db',
      })

      const usersTable = plan.tables.find((t: any) => t.tableName === 'users')
      expect(usersTable?.sql).toBeDefined()
      expect(usersTable?.sql.length).toBeGreaterThan(0)
    })
  })

  // ==================== 数据迁移完整测试 ====================
  describe '数据迁移完整测试', () => {
    const largeTables = Array.from({ length: 10 }, (_, i) => ({
      name: `table_${i}`,
      rowCount: 10000 * (i + 1),
    }))

    it '生成大规模迁移计划', () => {
      const plan = generateMigrationPlan(largeTables, {
        sourceDatabase: 'source_db',
        targetDatabase: 'target_db',
      })

      expect(plan.tables.length).toBe(10)
      expect(plan.totalRows).toBe(550000) // 10000+20000+...+100000
    })

    it '分批迁移配置', () => {
      const plan = generateMigrationPlan(largeTables, {
        sourceDatabase: 'source_db',
        targetDatabase: 'target_db',
        batchSize: 500,
      })

      expect(plan).toBeDefined()
    })

    it '验证大规模迁移', () => {
      const plan = generateMigrationPlan(largeTables, {
        sourceDatabase: 'source_db',
        targetDatabase: 'target_db',
      })

      const validation = validateMigrationPlan(plan)
      expect(validation.valid).toBe(true)
      expect(validation.warnings.length).toBeGreaterThan(0) // 应该有大数据量警告
    })

    it '生成大批量 INSERT', () => {
      const rows = Array.from({ length: 1000 }, (_, i) => [
        i + 1,
        `User ${i + 1}`,
        `user${i + 1}@example.com`,
      ])

      const sqls = generateBatchInsertSQL('users', ['id', 'name', 'email'], rows, 100)
      expect(sqls.length).toBe(10) // 1000 / 100
      expect(sqls[0]).toContain('INSERT INTO users')
    })

    it '生成特殊字符的 SQL', () => {
      const rows = [
        [1, "O'Brien", "obrien@example.com"],
        [2, "Test \"Quotes\"", "test@example.com"],
        [3, "中文测试", "chinese@example.com"],
      ]

      const sqls = generateBatchInsertSQL('users', ['id', 'name', 'email'], rows, 100)
      expect(sqls[0]).toContain("O''Brien")
    })

    it '导出大规模迁移报告', () => {
      const plan = generateMigrationPlan(largeTables, {
        sourceDatabase: 'source_db',
        targetDatabase: 'target_db',
      })

      const txtReport = exportMigrationReport(plan, 'txt')
      expect(txtReport).toContain('数据迁移报告')
      expect(txtReport.length).toBeGreaterThan(100)

      const csvReport = exportMigrationReport(plan, 'csv')
      expect(csvReport).toContain('Table,Source Rows')

      const jsonReport = exportMigrationReport(plan, 'json')
      expect(jsonReport).toContain('"totalRows"')
    })

    it '计算迁移进度', () => {
      const plan = generateMigrationPlan(largeTables, {
        sourceDatabase: 'source_db',
        targetDatabase: 'target_db',
      })

      expect(calculateMigrationProgress(plan)).toBe(0)

      plan.migratedRows = 275000
      expect(calculateMigrationProgress(plan)).toBe(50)

      plan.migratedRows = 550000
      expect(calculateMigrationProgress(plan)).toBe(100)
    })

    it '分块处理数据', async () => {
      const items = Array.from({ length: 100 }, (_, i) => i)
      const chunkSize = 10
      const results: number[] = []

      await processInChunks(
        items,
        async (chunk) => {
          results.push(chunk.length)
          return chunk.length
        },
        chunkSize
      )

      expect(results.length).toBe(10)
      expect(results.every((r) => r === chunkSize)).toBe(true)
    })
  })

  // ==================== 集成测试 ====================
  describe '集成测试', () => {
    it '完整结构同步流程', () => {
      // 1. 生成计划
      const plan = generateSyncPlan(
        [{ name: 'users', columns: [{ name: 'id', type: 'INT' }, { name: 'name', type: 'VARCHAR(255)' }] }],
        [{ name: 'users', columns: [{ name: 'id', type: 'INT' }] }],
        { sourceDatabase: 'source', targetDatabase: 'target' }
      )

      // 2. 验证
      const validation = validateSyncPlan(plan)
      expect(validation.valid).toBe(true)

      // 3. 导出
      const sql = exportSyncPlan(plan, 'sql')
      expect(sql).toContain('ALTER TABLE')

      // 4. 计算进度
      expect(calculateSyncProgress(plan)).toBe(0)
      plan.tables[0].status = 'completed'
      expect(calculateSyncProgress(plan)).toBe(100)
    })

    it '完整数据迁移流程', () => {
      // 1. 生成计划
      const plan = generateMigrationPlan(
        [{ name: 'users', rowCount: 1000 }],
        { sourceDatabase: 'source', targetDatabase: 'target', batchSize: 100 }
      )

      // 2. 验证
      const validation = validateMigrationPlan(plan)
      expect(validation.valid).toBe(true)

      // 3. 生成 SQL
      const rows = Array.from({ length: 100 }, (_, i) => [i + 1, `User ${i + 1}`])
      const sqls = generateBatchInsertSQL('users', ['id', 'name'], rows, 50)
      expect(sqls.length).toBe(2)

      // 4. 导出报告
      const report = exportMigrationReport(plan, 'txt')
      expect(report).toContain('迁移 ID')
    })

    it '结构同步 + 数据迁移组合', () => {
      // 1. 先同步结构
      const syncPlan = generateSyncPlan(
        [{ name: 'users', columns: [{ name: 'id', type: 'INT' }, { name: 'name', type: 'VARCHAR(255)' }] }],
        [],
        { sourceDatabase: 'source', targetDatabase: 'target' }
      )

      expect(syncPlan.tables[0].action).toBe('create')

      // 2. 再迁移数据
      const migrationPlan = generateMigrationPlan(
        [{ name: 'users', rowCount: 100 }],
        { sourceDatabase: 'source', targetDatabase: 'target' }
      )

      expect(migrationPlan.tables.length).toBe(1)
    })
  })

  // ==================== 边界测试 ====================
  describe '边界测试', () => {
    it '空表同步', () => {
      const plan = generateSyncPlan([], [], {
        sourceDatabase: 'source',
        targetDatabase: 'target',
      })

      expect(plan.tables.length).toBe(0)
      const validation = validateSyncPlan(plan)
      expect(validation.errors).toContain('没有表需要同步')
    })

    it '空表迁移', () => {
      const plan = generateMigrationPlan([], {
        sourceDatabase: 'source',
        targetDatabase: 'target',
      })

      expect(plan.tables.length).toBe(0)
      const validation = validateMigrationPlan(plan)
      expect(validation.errors).toContain('没有表需要迁移')
    })

    it '单表同步', () => {
      const plan = generateSyncPlan(
        [{ name: 'users', columns: [{ name: 'id', type: 'INT' }] }],
        [{ name: 'users', columns: [{ name: 'id', type: 'INT' }] }],
        { sourceDatabase: 'source', targetDatabase: 'target' }
      )

      expect(plan.tables.length).toBe(1)
      expect(plan.tables[0].action).toBe('skip')
    })

    it '单表迁移', () => {
      const plan = generateMigrationPlan(
        [{ name: 'users', rowCount: 0 }],
        { sourceDatabase: 'source', targetDatabase: 'target' }
      )

      expect(plan.tables.length).toBe(1)
      expect(plan.totalRows).toBe(0)
    })

    it '超大行数处理', () => {
      const plan = generateMigrationPlan(
        [{ name: 'large_table', rowCount: 10000000 }],
        { sourceDatabase: 'source', targetDatabase: 'target' }
      )

      const validation = validateMigrationPlan(plan)
      expect(validation.warnings.some((w) => w.includes('数据量较大'))).toBe(true)
    })
  })
})

console.log('✅ v1.7.0 完整测试套件就绪')
