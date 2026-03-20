/**
 * v2.1.0 模型管理测试
 */

import { describe, it, expect } from 'vitest'
import {
  getInstalledModels,
  checkModelUpdates,
  testModelAccuracy,
  getModelStats,
  collectTrainingData,
  optimizeModelPerformance,
} from '../../web/src/lib/modelManager'
import {
  nl2sqlEnhanced,
  explainSQLEnhanced,
  optimizeSQLEnhanced,
  collectFeedback,
} from '../../web/src/lib/enhancedAI'

describe('v2.1.0 模型管理', () => {
  // ==================== 模型管理测试 ====================
  describe('模型管理', () => {
    it '获取已安装模型', () => {
      const models = getInstalledModels()
      expect(models.length).toBeGreaterThan(0)
      expect(models.every((m) => m.installed)).toBe(true)
    })

    it '获取模型统计', () => {
      const stats = getModelStats()
      expect(stats.totalModels).toBeGreaterThan(0)
      expect(stats.installedModels).toBeGreaterThan(0)
      expect(stats.avgAccuracy).toBeGreaterThan(0)
      expect(stats.avgAccuracy).toBeLessThanOrEqual(1)
    })

    it '检查模型更新', async () => {
      const updates = await checkModelUpdates()
      expect(Array.isArray(updates)).toBe(true)
      
      if (updates.length > 0) {
        const update = updates[0]
        expect(update.modelId).toBeDefined()
        expect(update.currentVersion).toBeDefined()
        expect(update.newVersion).toBeDefined()
        expect(update.changelog).toBeDefined()
      }
    })

    it '测试模型准确性', async () => {
      const models = getInstalledModels()
      if (models.length > 0) {
        const accuracy = await testModelAccuracy(models[0].id)
        expect(accuracy.testCases).toBeGreaterThan(0)
        expect(accuracy.accuracy).toBeGreaterThan(0)
        expect(accuracy.accuracy).toBeLessThanOrEqual(1)
      }
    })

    it '收集训练数据', () => {
      const data = collectTrainingData(
        '查询用户',
        'SELECT * FROM users',
        'SELECT * FROM users'
      )
      expect(data.id).toBeDefined()
      expect(data.query).toBe('查询用户')
      expect(data.expectedSQL).toBe('SELECT * FROM users')
      expect(data.correct).toBe(true)
    })

    it '优化模型性能', async () => {
      const models = getInstalledModels()
      if (models.length > 0) {
        const result = await optimizeModelPerformance(models[0].id)
        expect(result.success).toBe(true)
        expect(result.improvements.length).toBeGreaterThan(0)
      }
    })
  })

  // ==================== 增强 AI 测试 ====================
  describe('增强 AI', () => {
    it '增强的 NL2SQL', async () => {
      const response = await nl2sqlEnhanced({
        query: '查询所有用户',
        useBestModel: true,
      })

      expect(response.sql).toBeDefined()
      expect(response.confidence).toBeGreaterThan(0)
      expect(response.modelUsed).toBeDefined()
      expect(response.modelAccuracy).toBeDefined()
    })

    it '增强的 SQL 解释', async () => {
      const response = await explainSQLEnhanced({
        sql: 'SELECT * FROM users',
        detailed: true,
      })

      expect(response.summary).toBeDefined()
      expect(response.breakdown.length).toBeGreaterThan(0)
      expect(response.modelUsed).toBeDefined()
      expect(response.visualPlan).toBeDefined()
    })

    it '增强的 SQL 优化', async () => {
      const response = await optimizeSQLEnhanced({
        sql: 'SELECT * FROM users',
        aggressive: true,
      })

      expect(response.optimizedSQL).toBeDefined()
      expect(response.improvements.length).toBeGreaterThan(0)
      expect(response.modelUsed).toBeDefined()
    })

    it '收集反馈', () => {
      expect(() => {
        collectFeedback('nl2sql', '查询用户', 'SELECT * FROM users', 5, '很好')
      }).not.toThrow()
    })
  })

  // ==================== 集成测试 ====================
  describe('集成测试', () => {
    it '完整模型管理流程', async () => {
      // 1. 获取模型列表
      const models = getInstalledModels()
      expect(models.length).toBeGreaterThan(0)

      // 2. 检查更新
      const updates = await checkModelUpdates()
      expect(Array.isArray(updates)).toBe(true)

      // 3. 测试准确性
      if (models.length > 0) {
        const accuracy = await testModelAccuracy(models[0].id)
        expect(accuracy.accuracy).toBeGreaterThan(0)
      }

      // 4. 获取统计
      const stats = getModelStats()
      expect(stats.avgAccuracy).toBeGreaterThan(0)
    })

    it '增强 AI 完整流程', async () => {
      // 1. NL2SQL
      const nl2sql = await nl2sqlEnhanced({ query: '查询用户' })
      expect(nl2sql.sql).toBeDefined()

      // 2. 解释
      const explain = await explainSQLEnhanced({ sql: nl2sql.sql })
      expect(explain.summary).toBeDefined()

      // 3. 优化
      const optimize = await optimizeSQLEnhanced({ sql: nl2sql.sql })
      expect(optimize.optimizedSQL).toBeDefined()

      // 4. 收集反馈
      expect(() => {
        collectFeedback('nl2sql', '查询用户', nl2sql.sql, 5)
      }).not.toThrow()
    })
  })
})

console.log('✅ v2.1.0 测试框架就绪')
