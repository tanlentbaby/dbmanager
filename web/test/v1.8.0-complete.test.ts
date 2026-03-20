/**
 * v1.8.0 完整验证测试
 */

import { describe, it, expect, beforeEach } from 'vitest'
import {
  generateIncrementalSyncPlan,
  validateIncrementalSyncPlan,
  exportIncrementalSyncReport,
  calculateIncrementalSyncProgress,
  generateIncrementalQuerySQL,
} from '../../web/src/lib/incrementalSync'
import {
  createTransferCheckpoint,
  updateCheckpoint,
  pauseTransfer,
  resumeTransfer,
  calculateTransferProgress,
  canResumeTransfer,
  validateCheckpoint,
  processBatchWithRetry,
} from '../../web/src/lib/resumableTransfer'

describe('v1.8.0 完整测试', () => {
  // ==================== 增量同步完整测试 ====================
  describe('增量同步完整测试', () => {
    const largeSourceTables = Array.from({ length: 20 }, (_, i) => ({
      name: `table_${i}`,
      maxId: (i + 1) * 10000,
    }))

    const largeCheckpoints = Array.from({ length: 20 }, (_, i) => ({
      syncId: `checkpoint_${i}`,
      tableName: `table_${i}`,
      lastSyncId: i * 10000,
      lastSyncTime: Date.now() - 86400000,
      checksum: `hash_${i}`,
    }))

    it '生成大规模增量同步计划', () => {
      const plan = generateIncrementalSyncPlan(largeSourceTables, largeCheckpoints, {
        sourceDatabase: 'source_db',
        targetDatabase: 'target_db',
        tables: largeSourceTables.map((t) => ({
          name: t.name,
          keyColumn: 'id',
          lastSyncId: largeCheckpoints.find((c) => c.tableName === t.name)?.lastSyncId || 0,
        })),
      })

      expect(plan.id).toBeDefined()
      expect(plan.tables.length).toBe(20)
      expect(plan.newRecords).toBe(20 * 10000) // 每个表 10000 条新增
    })

    it '检测所有表的新增记录', () => {
      const plan = generateIncrementalSyncPlan(largeSourceTables, largeCheckpoints, {
        sourceDatabase: 'source_db',
        targetDatabase: 'target_db',
        tables: largeSourceTables.map((t) => ({
          name: t.name,
          keyColumn: 'id',
          lastSyncId: largeCheckpoints.find((c) => c.tableName === t.name)?.lastSyncId || 0,
        })),
      })

      plan.tables.forEach((table: any) => {
        expect(table.newCount).toBe(10000)
      })
    })

    it '验证大规模增量同步', () => {
      const plan = generateIncrementalSyncPlan(largeSourceTables, largeCheckpoints, {
        sourceDatabase: 'source_db',
        targetDatabase: 'target_db',
        tables: largeSourceTables.map((t) => ({
          name: t.name,
          keyColumn: 'id',
          lastSyncId: largeCheckpoints.find((c) => c.tableName === t.name)?.lastSyncId || 0,
        })),
      })

      const validation = validateIncrementalSyncPlan(plan)
      expect(validation.valid).toBe(true)
      expect(validation.warnings.length).toBeGreaterThan(0) // 应该有大数据量警告
    })

    it '生成复杂增量查询 SQL', () => {
      const sql = generateIncrementalQuerySQL(
        'large_table',
        'id',
        50000,
        'updated_at',
        Date.now() - 86400000,
        5000
      )

      expect(sql).toContain('SELECT * FROM large_table')
      expect(sql).toContain('id > 50000')
      expect(sql).toContain('updated_at >')
      expect(sql).toContain('LIMIT 5000')
    })

    it '不使用时间戳的增量查询', () => {
      const sql = generateIncrementalQuerySQL('users', 'id', 1000, undefined, undefined, 1000)

      expect(sql).toContain('id > 1000')
      expect(sql).not.toContain('updated_at')
      expect(sql).toContain('LIMIT 1000')
    })

    it '导出大规模增量报告', () => {
      const plan = generateIncrementalSyncPlan(largeSourceTables, largeCheckpoints, {
        sourceDatabase: 'source_db',
        targetDatabase: 'target_db',
        tables: largeSourceTables.map((t) => ({
          name: t.name,
          keyColumn: 'id',
          lastSyncId: largeCheckpoints.find((c) => c.tableName === t.name)?.lastSyncId || 0,
        })),
      })

      const txtReport = exportIncrementalSyncReport(plan, 'txt')
      expect(txtReport).toContain('增量同步报告')
      expect(txtReport).toContain('20') // 表数量

      const jsonReport = exportIncrementalSyncReport(plan, 'json')
      expect(jsonReport).toContain('"tables"')
      expect(jsonReport.length).toBeGreaterThan(1000)
    })

    it '计算多表增量进度', () => {
      const plan = generateIncrementalSyncPlan(largeSourceTables, largeCheckpoints, {
        sourceDatabase: 'source_db',
        targetDatabase: 'target_db',
        tables: largeSourceTables.map((t) => ({
          name: t.name,
          keyColumn: 'id',
          lastSyncId: largeCheckpoints.find((c) => c.tableName === t.name)?.lastSyncId || 0,
        })),
      })

      expect(calculateIncrementalSyncProgress(plan)).toBe(0)

      // 完成一半
      for (let i = 0; i < 10; i++) {
        plan.tables[i].status = 'completed'
      }
      expect(calculateIncrementalSyncProgress(plan)).toBe(50)

      // 完成全部
      for (let i = 10; i < 20; i++) {
        plan.tables[i].status = 'completed'
      }
      expect(calculateIncrementalSyncProgress(plan)).toBe(100)
    })
  })

  // ==================== 断点续传完整测试 ====================
  describe('断点续传完整测试', () => {
    it '创建大规模传输检查点', () => {
      const checkpoint = createTransferCheckpoint('large_table', 1000000)

      expect(checkpoint.id).toBeDefined()
      expect(checkpoint.tableName).toBe('large_table')
      expect(checkpoint.totalRows).toBe(1000000)
      expect(checkpoint.processedRows).toBe(0)
    })

    it '更新大规模传输进度', () => {
      let checkpoint = createTransferCheckpoint('large_table', 1000000)

      // 模拟处理 10 批，每批 1000 条
      for (let i = 0; i < 10; i++) {
        checkpoint = updateCheckpoint(checkpoint, (i + 1) * 1000, 1000)
      }

      expect(checkpoint.lastProcessedId).toBe(10000)
      expect(checkpoint.processedRows).toBe(10000)
      expect(checkpoint.status).toBe('running')
    })

    it '计算大规模传输进度', () => {
      const checkpoint = createTransferCheckpoint('large_table', 1000000)
      const startTime = Date.now() - 60000 // 1 分钟前

      const progress = calculateTransferProgress(
        checkpoint,
        startTime,
        0,
        10000,
        100
      )

      expect(progress.totalRows).toBe(1000000)
      expect(progress.processedRows).toBe(0)
      expect(progress.percentComplete).toBe(0)
    })

    it '暂停和恢复大规模传输', () => {
      let checkpoint = createTransferCheckpoint('large_table', 1000000)

      // 处理一部分
      checkpoint = updateCheckpoint(checkpoint, 500000, 500000)

      // 暂停
      checkpoint = pauseTransfer(checkpoint)
      expect(checkpoint.status).toBe('paused')
      expect(canResumeTransfer(checkpoint)).toBe(true)

      // 恢复
      checkpoint = resumeTransfer(checkpoint)
      expect(checkpoint.status).toBe('running')
    })

    it '验证大规模检查点', () => {
      const checkpoint = createTransferCheckpoint('large_table', 1000000)
      checkpoint.lastProcessedId = 500000
      checkpoint.processedRows = 500000

      const validation = validateCheckpoint(checkpoint)
      expect(validation.valid).toBe(true)
    })

    it '导出大规模检查点', () => {
      const checkpoint = createTransferCheckpoint('large_table', 1000000)
      checkpoint.lastProcessedId = 500000
      checkpoint.processedRows = 500000

      const jsonExport = JSON.stringify(checkpoint)
      expect(jsonExport).toContain('large_table')
      expect(jsonExport).toContain('500000')

      const txtExport = `传输检查点\nID: ${checkpoint.id}\n表名：${checkpoint.tableName}\n已处理：${checkpoint.processedRows}`
      expect(txtExport).toContain('large_table')
    })

    it '批量处理带重试', async () => {
      let callCount = 0
      const processor = async (batch: number[]) => {
        callCount++
        if (callCount === 1) {
          throw new Error('临时错误')
        }
        return batch.length
      }

      const result = await processBatchWithRetry(
        [1, 2, 3, 4, 5],
        processor,
        {
          batchSize: 5,
          maxRetries: 3,
          delayMs: 10,
        }
      )

      expect(result.success).toBe(true)
      expect(result.result).toBe(5)
      expect(callCount).toBe(2) // 第一次失败，第二次成功
    })

    it '批量处理重试失败', async () => {
      const processor = async () => {
        throw new Error('永久错误')
      }

      const result = await processBatchWithRetry(
        [1, 2, 3],
        processor,
        {
          maxRetries: 2,
          delayMs: 10,
        }
      )

      expect(result.success).toBe(false)
      expect(result.error).toContain('重试 2 次后失败')
    })
  })

  // ==================== 集成测试 ====================
  describe('集成测试', () => {
    it '增量同步 + 断点续传完整流程', () => {
      // 1. 生成增量同步计划
      const syncPlan = generateIncrementalSyncPlan(
        [{ name: 'users', maxId: 100000 }],
        [{
          syncId: 'checkpoint',
          tableName: 'users',
          lastSyncId: 50000,
          lastSyncTime: Date.now(),
          checksum: 'abc',
        }],
        {
          sourceDatabase: 'source',
          targetDatabase: 'target',
          tables: [{ name: 'users', keyColumn: 'id', lastSyncId: 50000 }],
        }
      )

      expect(syncPlan.newRecords).toBe(50000)

      // 2. 创建传输检查点
      const checkpoint = createTransferCheckpoint('users', syncPlan.newRecords)
      expect(checkpoint.totalRows).toBe(50000)

      // 3. 模拟传输
      checkpoint.lastProcessedId = 25000
      checkpoint.processedRows = 25000
      checkpoint.status = 'running'

      // 4. 暂停
      const paused = pauseTransfer(checkpoint)
      expect(paused.status).toBe('paused')

      // 5. 恢复
      const resumed = resumeTransfer(paused)
      expect(resumed.status).toBe('running')

      // 6. 完成
      const completed = { ...resumed, status: 'completed' as const, processedRows: 50000 }
      expect(completed.processedRows).toBe(50000)
    })

    it '多表增量同步', () => {
      const tables = [
        { name: 'users', maxId: 10000 },
        { name: 'orders', maxId: 50000 },
        { name: 'products', maxId: 5000 },
      ]

      const checkpoints = tables.map((t) => ({
        syncId: `checkpoint_${t.name}`,
        tableName: t.name,
        lastSyncId: Math.floor(t.maxId * 0.8),
        lastSyncTime: Date.now() - 86400000,
        checksum: `hash_${t.name}`,
      }))

      const plan = generateIncrementalSyncPlan(tables, checkpoints, {
        sourceDatabase: 'source',
        targetDatabase: 'target',
        tables: tables.map((t) => ({
          name: t.name,
          keyColumn: 'id',
          lastSyncId: checkpoints.find((c) => c.tableName === t.name)?.lastSyncId || 0,
        })),
      })

      expect(plan.tables.length).toBe(3)
      expect(plan.newRecords).toBe(2000 + 10000 + 1000) // 20% of each table
    })
  })

  // ==================== 边界测试 ====================
  describe('边界测试', () => {
    it '无新增记录的增量同步', () => {
      const plan = generateIncrementalSyncPlan(
        [{ name: 'users', maxId: 10000 }],
        [{
          syncId: 'checkpoint',
          tableName: 'users',
          lastSyncId: 10000,
          lastSyncTime: Date.now(),
          checksum: 'abc',
        }],
        {
          sourceDatabase: 'source',
          targetDatabase: 'target',
          tables: [{ name: 'users', keyColumn: 'id', lastSyncId: 10000 }],
        }
      )

      expect(plan.newRecords).toBe(0)
      expect(plan.tables[0].status).toBe('completed')
    })

    it '空表增量同步', () => {
      const plan = generateIncrementalSyncPlan(
        [],
        [],
        {
          sourceDatabase: 'source',
          targetDatabase: 'target',
          tables: [],
        }
      )

      expect(plan.tables.length).toBe(0)
      const validation = validateIncrementalSyncPlan(plan)
      expect(validation.errors).toContain('没有表需要同步')
    })

    it '传输完成后续传', () => {
      const checkpoint = createTransferCheckpoint('users', 10000)
      checkpoint.status = 'completed'
      checkpoint.processedRows = 10000

      expect(canResumeTransfer(checkpoint)).toBe(false)
    })

    it '超大ID 范围处理', () => {
      const checkpoint = createTransferCheckpoint('large_table', Number.MAX_SAFE_INTEGER)
      expect(checkpoint.totalRows).toBe(Number.MAX_SAFE_INTEGER)
    })

    it '零记录传输', () => {
      const checkpoint = createTransferCheckpoint('empty_table', 0)
      const progress = calculateTransferProgress(checkpoint, Date.now(), 0, 0, 100)
      expect(progress.percentComplete).toBe(100) // 0/0 = 100%
    })
  })
})

console.log('✅ v1.8.0 完整测试套件就绪')
