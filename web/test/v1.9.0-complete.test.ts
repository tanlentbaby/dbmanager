/**
 * v1.9.0 完整验证测试
 */

import { describe, it, expect, beforeEach } from 'vitest'
import {
  parseCronExpression,
  calculateNextRun,
  createScheduledTask,
  updateScheduledTask,
  toggleTask,
  validateCronExpression,
  getCommonCronExpressions,
  calculateTaskHistory,
} from '../../web/src/lib/scheduledTasks'
import {
  createParallelSyncPlan,
  assignTasksToWorkers,
  calculateParallelSyncProgress,
  validateParallelSyncPlan,
  estimateParallelSyncTime,
  updateTableTask,
  exportParallelSyncReport,
} from '../../web/src/lib/parallelSync'

describe('v1.9.0 完整测试', () => {
  // ==================== 定时任务完整测试 ====================
  describe('定时任务完整测试', () => {
    it '解析各种 Cron 表达式', () => {
      // 每分钟
      const everyMinute = parseCronExpression('* * * * *')
      expect(everyMinute.minute.length).toBe(60)

      // 每小时
      const everyHour = parseCronExpression('0 * * * *')
      expect(everyHour.minute).toEqual([0])

      // 每天
      const everyDay = parseCronExpression('0 0 * * *')
      expect(everyDay.hour).toEqual([0])

      // 每周
      const everyWeek = parseCronExpression('0 0 * * 0')
      expect(everyWeek.dayOfWeek).toEqual([0])

      // 每月
      const everyMonth = parseCronExpression('0 0 1 * *')
      expect(everyMonth.dayOfMonth).toEqual([1])

      // 每 5 分钟
      const every5Min = parseCronExpression('*/5 * * * *')
      expect(every5Min.minute).toEqual([0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55])

      // 工作时间
      const workHours = parseCronExpression('0 9-17 * * 1-5')
      expect(workHours.hour).toEqual([9, 10, 11, 12, 13, 14, 15, 16, 17])
      expect(workHours.dayOfWeek).toEqual([1, 2, 3, 4, 5])
    })

    it '计算复杂下次运行时间', () => {
      const now = new Date('2026-03-20T10:30:00Z')

      // 下一个整点
      const nextHour = calculateNextRun('0 * * * *', now)
      expect(nextHour.getHours()).toBe(11)
      expect(nextHour.getMinutes()).toBe(0)

      // 下一个午夜
      const nextMidnight = calculateNextRun('0 0 * * *', now)
      expect(nextMidnight.getHours()).toBe(0)
      expect(nextMidnight.getMinutes()).toBe(0)
      expect(nextMidnight.getDate()).toBe(21)
    })

    it '创建和管理定时任务', () => {
      const task = createScheduledTask(
        '每日备份',
        'backup',
        '0 2 * * *',
        { sourceDatabase: 'prod', targetDatabase: 'backup' }
      )

      expect(task.enabled).toBe(true)
      expect(task.nextRun).toBeDefined()
      expect(task.createdAt).toBeDefined()

      // 更新任务
      const updated = updateScheduledTask(task, {
        cronExpression: '0 3 * * *',
      })
      expect(updated.cronExpression).toBe('0 3 * * *')
      expect(updated.updatedAt).toBeGreaterThan(task.updatedAt)

      // 禁用任务
      const disabled = toggleTask(task, false)
      expect(disabled.enabled).toBe(false)
    })

    it '验证 Cron 表达式边界', () => {
      // 有效表达式
      expect(validateCronExpression('0 0 1 1 *').valid).toBe(true)
      expect(validateCronExpression('*/15 */2 * * *').valid).toBe(true)
      expect(validateCronExpression('0,30 8-18 * * 1-5').valid).toBe(true)

      // 无效表达式
      expect(validateCronExpression('60 0 * * *').valid).toBe(false)
      expect(validateCronExpression('0 25 * * *').valid).toBe(false)
      expect(validateCronExpression('0 0 32 * *').valid).toBe(false)
      expect(validateCronExpression('invalid').valid).toBe(false)
    })

    it '计算任务历史统计', () => {
      const executions = [
        { id: '1', taskId: 'task1', startTime: 1000, endTime: 2000, status: 'success' as const },
        { id: '2', taskId: 'task1', startTime: 3000, endTime: 5000, status: 'success' as const },
        { id: '3', taskId: 'task1', startTime: 6000, endTime: 6500, status: 'failed' as const },
      ]

      const history = calculateTaskHistory(executions)
      expect(history.totalExecutions).toBe(3)
      expect(history.successCount).toBe(2)
      expect(history.failedCount).toBe(1)
      expect(history.avgDuration).toBe(1000) // (1000 + 2000) / 2
    })

    it '获取所有常用模板', () => {
      const templates = getCommonCronExpressions()
      expect(templates.length).toBeGreaterThanOrEqual(8)

      // 验证包含所有预期模板
      const names = templates.map((t) => t.name)
      expect(names).toContain('每分钟')
      expect(names).toContain('每小时')
      expect(names).toContain('每天')
      expect(names).toContain('每周')
      expect(names).toContain('每月')
    })
  })

  // ==================== 并行同步完整测试 ====================
  describe('并行同步完整测试', () => {
    const largeTables = Array.from({ length: 50 }, (_, i) => ({
      name: `table_${i}`,
      rowCount: (i + 1) * 10000,
    }))

    it '创建大规模并行同步计划', () => {
      const plan = createParallelSyncPlan(largeTables, {
        sourceDatabase: 'source',
        targetDatabase: 'target',
        tables: largeTables.map((t) => t.name),
        concurrency: 8,
      })

      expect(plan.tables.length).toBe(50)
      expect(plan.concurrency).toBe(8)
      expect(plan.totalRows).toBe(12750000) // sum of 10000 to 500000
    })

    it '负载均衡分配任务', () => {
      const tables = [
        { name: 'large', rowCount: 1000000 },
        { name: 'medium1', rowCount: 500000 },
        { name: 'medium2', rowCount: 500000 },
        { name: 'small1', rowCount: 100000 },
        { name: 'small2', rowCount: 100000 },
      ]

      const tasks = tables.map((t) => ({
        tableName: t.name,
        status: 'pending' as const,
        totalRows: t.rowCount,
        processedRows: 0,
      }))

      const workers = assignTasksToWorkers(tasks, 2)

      // 验证负载均衡
      const worker0Load = workers[0].reduce((sum, t) => sum + t.totalRows, 0)
      const worker1Load = workers[1].reduce((sum, t) => sum + t.totalRows, 0)

      // 两个工作线程的负载应该相对均衡
      expect(Math.abs(worker0Load - worker1Load)).toBeLessThan(1000000)
    })

    it '计算复杂进度', () => {
      const plan = createParallelSyncPlan(largeTables.slice(0, 10), {
        sourceDatabase: 'source',
        targetDatabase: 'target',
        tables: largeTables.slice(0, 10).map((t) => t.name),
        concurrency: 4,
      })

      expect(calculateParallelSyncProgress(plan)).toBe(0)

      // 完成一半
      for (let i = 0; i < 5; i++) {
        plan.tables[i].processedRows = plan.tables[i].totalRows
        plan.tables[i].status = 'completed'
      }
      expect(calculateParallelSyncProgress(plan)).toBeGreaterThan(0)
      expect(calculateParallelSyncProgress(plan)).toBeLessThan(100)

      // 完成全部
      for (let i = 5; i < 10; i++) {
        plan.tables[i].processedRows = plan.tables[i].totalRows
        plan.tables[i].status = 'completed'
      }
      expect(calculateParallelSyncProgress(plan)).toBe(100)
    })

    it '验证大规模并行计划', () => {
      const plan = createParallelSyncPlan(largeTables, {
        sourceDatabase: 'source',
        targetDatabase: 'target',
        tables: largeTables.map((t) => t.name),
        concurrency: 8,
      })

      const validation = validateParallelSyncPlan(plan)
      expect(validation.valid).toBe(true)
      expect(validation.warnings.length).toBeGreaterThan(0) // 应该有大数据量警告
    })

    it '估算大规模同步时间', () => {
      const plan = createParallelSyncPlan(largeTables, {
        sourceDatabase: 'source',
        targetDatabase: 'target',
        tables: largeTables.map((t) => t.name),
        concurrency: 8,
      })

      const estimatedTime = estimateParallelSyncTime(plan, 1000)
      expect(estimatedTime).toBeGreaterThan(0)

      // 验证并发数影响
      const plan4Concurrency = createParallelSyncPlan(largeTables, {
        sourceDatabase: 'source',
        targetDatabase: 'target',
        tables: largeTables.map((t) => t.name),
        concurrency: 4,
      })

      const estimatedTime4 = estimateParallelSyncTime(plan4Concurrency, 1000)
      expect(estimatedTime4).toBeGreaterThan(estimatedTime) // 并发数少，时间长
    })

    it '更新表任务状态', () => {
      const plan = createParallelSyncPlan(largeTables.slice(0, 5), {
        sourceDatabase: 'source',
        targetDatabase: 'target',
        tables: largeTables.slice(0, 5).map((t) => t.name),
        concurrency: 2,
      })

      const updated = updateTableTask(plan, 'table_0', {
        status: 'completed',
        processedRows: largeTables[0].rowCount,
        duration: 1000,
      })

      expect(updated.tables[0].status).toBe('completed')
      expect(updated.tables[0].duration).toBe(1000)
      expect(updated.progress).toBeGreaterThan(0)
    })

    it '导出并行同步报告', () => {
      const plan = createParallelSyncPlan(largeTables.slice(0, 5), {
        sourceDatabase: 'source',
        targetDatabase: 'target',
        tables: largeTables.slice(0, 5).map((t) => t.name),
        concurrency: 2,
      })

      const txtReport = exportParallelSyncReport(plan, 'txt')
      expect(txtReport).toContain('并行同步报告')
      expect(txtReport).toContain('并发数：2')

      const jsonReport = exportParallelSyncReport(plan, 'json')
      expect(jsonReport).toContain('"concurrency"')
      expect(jsonReport).toContain('"tables"')
    })

    it '处理失败任务', () => {
      const plan = createParallelSyncPlan(largeTables.slice(0, 3), {
        sourceDatabase: 'source',
        targetDatabase: 'target',
        tables: largeTables.slice(0, 3).map((t) => t.name),
        concurrency: 2,
      })

      // 一个失败，其他成功
      plan.tables[0].status = 'failed'
      plan.tables[0].error = 'Connection timeout'
      plan.tables[1].status = 'completed'
      plan.tables[2].status = 'completed'

      expect(plan.status).toBe('running')

      // 所有任务完成，但有失败
      const allDone = plan.tables.every((t) => t.status === 'completed' || t.status === 'failed')
      expect(allDone).toBe(true)
    })
  })

  // ==================== 集成测试 ====================
  describe('集成测试', () => {
    it '定时任务触发并行同步', () => {
      // 1. 创建定时任务
      const task = createScheduledTask(
        '每日并行同步',
        'incremental_sync',
        '0 2 * * *',
        { sourceDatabase: 'source', targetDatabase: 'target' }
      )

      expect(task.type).toBe('incremental_sync')
      expect(task.cronExpression).toBe('0 2 * * *')

      // 2. 创建并行同步计划
      const plan = createParallelSyncPlan(
        [{ name: 'users', rowCount: 100000 }],
        {
          sourceDatabase: 'source',
          targetDatabase: 'target',
          tables: ['users'],
          concurrency: 4,
        }
      )

      expect(plan.concurrency).toBe(4)

      // 3. 验证任务下次运行时间
      expect(task.nextRun).toBeDefined()
      expect(task.nextRun!).toBeGreaterThan(Date.now())
    })

    it '多任务并行执行', () => {
      const tasks = [
        createScheduledTask('任务 1', 'incremental_sync', '0 0 * * *', {}),
        createScheduledTask('任务 2', 'backup', '0 1 * * *', {}),
        createScheduledTask('任务 3', 'full_sync', '0 2 * * *', {}),
      ]

      expect(tasks.length).toBe(3)
      expect(tasks.every((t) => t.enabled)).toBe(true)

      // 验证运行时间不冲突
      const runTimes = tasks.map((t) => t.cronExpression)
      expect(runTimes).toEqual(['0 0 * * *', '0 1 * * *', '0 2 * * *'])
    })
  })

  // ==================== 边界测试 ====================
  describe('边界测试', () => {
    it '空表并行同步', () => {
      const plan = createParallelSyncPlan([], {
        sourceDatabase: 'source',
        targetDatabase: 'target',
        tables: [],
        concurrency: 4,
      })

      expect(plan.tables.length).toBe(0)
      const validation = validateParallelSyncPlan(plan)
      expect(validation.errors).toContain('没有表需要同步')
    })

    it '单表并行同步', () => {
      const plan = createParallelSyncPlan(
        [{ name: 'single', rowCount: 1000 }],
        {
          sourceDatabase: 'source',
          targetDatabase: 'target',
          tables: ['single'],
          concurrency: 4,
        }
      )

      expect(plan.tables.length).toBe(1)
      expect(plan.concurrency).toBe(4) // 并发数可以大于表数
    })

    it '并发数为 1', () => {
      const plan = createParallelSyncPlan(
        [{ name: 'users', rowCount: 1000 }],
        {
          sourceDatabase: 'source',
          targetDatabase: 'target',
          tables: ['users'],
          concurrency: 1,
        }
      )

      expect(plan.concurrency).toBe(1)
      const validation = validateParallelSyncPlan(plan)
      expect(validation.valid).toBe(true)
    })

    it 'Cron 表达式边界值', () => {
      // 最小值
      expect(validateCronExpression('0 0 1 1 0').valid).toBe(true)

      // 最大值
      expect(validateCronExpression('59 23 31 12 6').valid).toBe(true)

      // 超出范围
      expect(validateCronExpression('60 0 1 1 0').valid).toBe(false)
      expect(validateCronExpression('0 24 1 1 0').valid).toBe(false)
    })

    it '零行数据同步', () => {
      const plan = createParallelSyncPlan(
        [{ name: 'empty', rowCount: 0 }],
        {
          sourceDatabase: 'source',
          targetDatabase: 'target',
          tables: ['empty'],
          concurrency: 2,
        }
      )

      expect(plan.totalRows).toBe(0)
      expect(calculateParallelSyncProgress(plan)).toBe(100)
    })
  })
})

console.log('✅ v1.9.0 完整测试套件就绪')
