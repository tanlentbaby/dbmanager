/**
 * v1.9.0 定时任务和并行同步测试
 */

import { describe, it, expect } from 'vitest'
import {
  parseCronExpression,
  calculateNextRun,
  createScheduledTask,
  validateCronExpression,
  getCommonCronExpressions,
} from '../../web/src/lib/scheduledTasks'
import {
  createParallelSyncPlan,
  assignTasksToWorkers,
  calculateParallelSyncProgress,
  validateParallelSyncPlan,
  estimateParallelSyncTime,
} from '../../web/src/lib/parallelSync'

describe('v1.9.0 定时任务和并行同步', () => {
  // ==================== 定时任务测试 ====================
  describe('定时任务', () => {
    it '解析 Cron 表达式', () => {
      const parsed = parseCronExpression('0 0 * * *')
      expect(parsed.minute).toEqual([0])
      expect(parsed.hour).toEqual([0])
      expect(parsed.dayOfMonth.length).toBe(31)
      expect(parsed.month.length).toBe(12)
      expect(parsed.dayOfWeek.length).toBe(7)
    })

    it '解析复杂 Cron 表达式', () => {
      const parsed = parseCronExpression('*/15 9-17 * * 1-5')
      expect(parsed.minute).toEqual([0, 15, 30, 45])
      expect(parsed.hour).toEqual([9, 10, 11, 12, 13, 14, 15, 16, 17])
      expect(parsed.dayOfWeek).toEqual([1, 2, 3, 4, 5])
    })

    it '计算下次运行时间', () => {
      const now = new Date('2026-03-20T10:00:00Z')
      const next = calculateNextRun('0 0 * * *', now)
      expect(next.getHours()).toBe(0)
      expect(next.getMinutes()).toBe(0)
    })

    it '验证 Cron 表达式', () => {
      expect(validateCronExpression('0 0 * * *').valid).toBe(true)
      expect(validateCronExpression('invalid').valid).toBe(false)
      expect(validateCronExpression('60 0 * * *').valid).toBe(false)
    })

    it '创建定时任务', () => {
      const task = createScheduledTask(
        '每日同步',
        'incremental_sync',
        '0 0 * * *',
        { sourceDatabase: 'source', targetDatabase: 'target' }
      )

      expect(task.id).toBeDefined()
      expect(task.name).toBe('每日同步')
      expect(task.cronExpression).toBe('0 0 * * *')
      expect(task.enabled).toBe(true)
      expect(task.nextRun).toBeDefined()
    })

    it '获取常用 Cron 表达式', () => {
      const templates = getCommonCronExpressions()
      expect(templates.length).toBeGreaterThan(0)
      expect(templates.some((t) => t.name === '每分钟')).toBe(true)
      expect(templates.some((t) => t.name === '每天')).toBe(true)
    })
  })

  // ==================== 并行同步测试 ====================
  describe('并行同步', () => {
    const tables = [
      { name: 'users', rowCount: 10000 },
      { name: 'orders', rowCount: 50000 },
      { name: 'products', rowCount: 5000 },
      { name: 'logs', rowCount: 100000 },
    ]

    it '创建并行同步计划', () => {
      const plan = createParallelSyncPlan(tables, {
        sourceDatabase: 'source',
        targetDatabase: 'target',
        tables: tables.map((t) => t.name),
        concurrency: 4,
      })

      expect(plan.id).toBeDefined()
      expect(plan.tables.length).toBe(4)
      expect(plan.concurrency).toBe(4)
      expect(plan.totalRows).toBe(165000)
    })

    it '分配任务到工作线程', () => {
      const tasks = tables.map((t) => ({
        tableName: t.name,
        status: 'pending' as const,
        totalRows: t.rowCount,
        processedRows: 0,
      }))

      const workers = assignTasksToWorkers(tasks, 2)
      expect(workers.length).toBe(2)
      expect(workers[0].length + workers[1].length).toBe(4)
    })

    it '计算并行同步进度', () => {
      const plan = createParallelSyncPlan(tables, {
        sourceDatabase: 'source',
        targetDatabase: 'target',
        tables: tables.map((t) => t.name),
        concurrency: 4,
      })

      expect(calculateParallelSyncProgress(plan)).toBe(0)

      plan.tables[0].processedRows = 10000
      plan.tables[0].status = 'completed'
      expect(calculateParallelSyncProgress(plan)).toBeGreaterThan(0)

      plan.tables.forEach((t: any) => {
        t.processedRows = t.totalRows
        t.status = 'completed'
      })
      expect(calculateParallelSyncProgress(plan)).toBe(100)
    })

    it '验证并行同步计划', () => {
      const plan = createParallelSyncPlan(tables, {
        sourceDatabase: 'source',
        targetDatabase: 'target',
        tables: tables.map((t) => t.name),
        concurrency: 4,
      })

      const validation = validateParallelSyncPlan(plan)
      expect(validation.valid).toBe(true)
    })

    it '估算并行同步时间', () => {
      const plan = createParallelSyncPlan(tables, {
        sourceDatabase: 'source',
        targetDatabase: 'target',
        tables: tables.map((t) => t.name),
        concurrency: 4,
      })

      const estimatedTime = estimateParallelSyncTime(plan, 1000)
      expect(estimatedTime).toBeGreaterThan(0)
    })

    it '验证大并发数警告', () => {
      const plan = createParallelSyncPlan(tables, {
        sourceDatabase: 'source',
        targetDatabase: 'target',
        tables: tables.map((t) => t.name),
        concurrency: 20,
      })

      const validation = validateParallelSyncPlan(plan)
      expect(validation.warnings.some((w) => w.includes('并发数过大'))).toBe(true)
    })
  })

  // ==================== 集成测试 ====================
  describe('集成测试', () => {
    it '定时任务 + 并行同步组合', () => {
      // 1. 创建定时任务
      const task = createScheduledTask(
        '每日并行同步',
        'incremental_sync',
        '0 0 * * *',
        { sourceDatabase: 'source', targetDatabase: 'target' }
      )

      expect(task.type).toBe('incremental_sync')

      // 2. 创建并行同步计划
      const plan = createParallelSyncPlan(
        [{ name: 'users', rowCount: 10000 }],
        {
          sourceDatabase: 'source',
          targetDatabase: 'target',
          tables: ['users'],
          concurrency: 2,
        }
      )

      expect(plan.concurrency).toBe(2)
    })
  })
})

console.log('✅ v1.9.0 测试框架就绪')
