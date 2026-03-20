/**
 * v2.0.0 完整验证测试
 */

import { describe, it, expect, beforeEach } from 'vitest'
import {
  nl2sqlOffline,
  explainSQLOffline,
  optimizeSQLOffline,
  chatOffline,
  createChatSession,
  saveChatSession,
  loadChatSession,
  getModelInfo,
} from '../../web/src/lib/aiAssistant'

describe('v2.0.0 完整测试', () => {
  // ==================== NL2SQL 完整测试 ====================
  describe('NL2SQL 完整测试', () => {
    it '转换各种用户查询', async () => {
      const queries = [
        { input: '查询所有用户', expected: 'users' },
        { input: '查询所有订单', expected: 'orders' },
        { input: '查询产品列表', expected: 'products' },
      ]

      for (const { input, expected } of queries) {
        const response = await nl2sqlOffline({ query: input })
        expect(response.sql).toBeDefined()
        expect(response.confidence).toBeGreaterThan(0)
        expect(response.confidence).toBeLessThanOrEqual(1)
      }
    })

    it '处理带条件查询', async () => {
      const response = await nl2sqlOffline({
        query: '查询最近 7 天订单最多的前 10 个用户',
      })

      expect(response.sql).toBeDefined()
      expect(response.sql).toContain('LIMIT 10')
      expect(response.confidence).toBeGreaterThan(0)
    })

    it '处理复杂查询', async () => {
      const response = await nl2sqlOffline({
        query: '查询每个用户的订单总数和平均订单金额，按订单数排序，取前 20 个',
      })

      expect(response.sql).toBeDefined()
      expect(response.sql).toContain('LIMIT 20')
    })

    it '返回表信息', async () => {
      const response = await nl2sqlOffline({ query: '查询用户' })

      expect(response.tables).toBeDefined()
      expect(Array.isArray(response.tables)).toBe(true)
    })

    it '提供替代 SQL', async () => {
      const response = await nl2sqlOffline({ query: '查询用户' })

      expect(response).toBeDefined()
      expect(response.alternativeSQLs).toBeDefined()
    })
  })

  // ==================== SQL 解释完整测试 ====================
  describe('SQL 解释完整测试', () => {
    it '解释简单 SELECT', async () => {
      const response = await explainSQLOffline({
        sql: 'SELECT * FROM users',
      })

      expect(response.summary).toBeDefined()
      expect(response.breakdown.length).toBeGreaterThan(0)
      expect(response.suggestions.length).toBeGreaterThan(0)
      expect(response.complexity).toBe('low')
    })

    it '解释带 WHERE 的查询', async () => {
      const response = await explainSQLOffline({
        sql: 'SELECT * FROM users WHERE status = "active" AND age > 18',
      })

      expect(response.breakdown.some((b) => b.includes('WHERE'))).toBe(true)
      expect(response.complexity).toBe('low')
    })

    it '解释 JOIN 查询', async () => {
      const response = await explainSQLOffline({
        sql: 'SELECT u.name, o.amount FROM users u JOIN orders o ON u.id = o.user_id',
      })

      expect(response.breakdown.some((b) => b.includes('JOIN'))).toBe(true)
      expect(response.complexity).toBe('medium')
    })

    it '解释复杂聚合查询', async () => {
      const response = await explainSQLOffline({
        sql: `
          SELECT u.name, COUNT(o.id) as order_count, AVG(o.amount) as avg_amount
          FROM users u
          LEFT JOIN orders o ON u.id = o.user_id
          WHERE u.status = 'active'
          GROUP BY u.id
          HAVING COUNT(o.id) > 5
          ORDER BY order_count DESC
          LIMIT 10
        `,
      })

      expect(response.breakdown.length).toBeGreaterThan(3)
      expect(response.complexity).toBe('high')
      expect(response.suggestions.length).toBeGreaterThan(0)
    })

    it '估算成本', async () => {
      const response = await explainSQLOffline({
        sql: 'SELECT * FROM users',
      })

      expect(response.estimatedCost).toBeDefined()
    })
  })

  // ==================== SQL 优化完整测试 ====================
  describe('SQL 优化完整测试', () => {
    it '优化 SELECT *', async () => {
      const response = await optimizeSQLOffline({
        sql: 'SELECT * FROM users',
      })

      expect(response.improvements.some((i) => i.includes('SELECT *'))).toBe(true)
      expect(response.optimizedSQL).not.toContain('SELECT *')
    })

    it '优化前缀 LIKE', async () => {
      const response = await optimizeSQLOffline({
        sql: "SELECT * FROM users WHERE name LIKE '%test%'",
      })

      expect(response.improvements.some((i) => i.includes('LIKE'))).toBe(true)
    })

    it '优化无 LIMIT 查询', async () => {
      const response = await optimizeSQLOffline({
        sql: 'SELECT * FROM users WHERE status = "active"',
      })

      expect(response.optimizedSQL).toContain('LIMIT')
    })

    it '优化多问题 SQL', async () => {
      const response = await optimizeSQLOffline({
        sql: 'SELECT * FROM users WHERE name LIKE "%test%" ORDER BY created_at',
      })

      expect(response.improvements.length).toBeGreaterThan(1)
      expect(response.performanceGain).toBeDefined()
    })

    it '计算性能提升', async () => {
      const response = await optimizeSQLOffline({
        sql: 'SELECT * FROM users WHERE name LIKE "%test%"',
      })

      expect(response.beforeCost).toBeDefined()
      expect(response.afterCost).toBeDefined()
      expect(response.afterCost).toBeLessThan(response.beforeCost!)
    })

    it '无需优化的 SQL', async () => {
      const response = await optimizeSQLOffline({
        sql: 'SELECT id, name FROM users WHERE id = 1 LIMIT 10',
      })

      expect(response.improvements.length).toBeLessThan(3)
    })
  })

  // ==================== 聊天完整测试 ====================
  describe('聊天完整测试', () => {
    it '创建和保存会话', () => {
      const session = createChatSession('测试上下文')
      expect(session.id).toBeDefined()
      expect(session.context).toBe('测试上下文')
      expect(session.messages.length).toBe(0)

      const saved = saveChatSession(session)
      expect(saved).toBeDefined()
      expect(saved.length).toBeGreaterThan(0)
    })

    it '加载会话', () => {
      const session = createChatSession()
      const saved = saveChatSession(session)
      const loaded = loadChatSession(saved)

      expect(loaded.id).toBe(session.id)
      expect(loaded.context).toBe(session.context)
    })

    it '回复各种问题', async () => {
      const questions = [
        '如何使用 DBManager？',
        '如何优化 SQL 性能？',
        '如何解释 SQL？',
        '什么是索引？',
        '如何备份数据库？',
      ]

      const session = createChatSession()

      for (const question of questions) {
        const response = await chatOffline(session.id, question)
        expect(response.messages.length).toBe(2)
        expect(response.messages[1].role).toBe('assistant')
        expect(response.messages[1].content.length).toBeGreaterThan(0)
      }
    })

    it '多轮对话', async () => {
      const session = createChatSession()

      // 第一轮
      const response1 = await chatOffline(session.id, '如何优化 SQL？')
      expect(response1.messages.length).toBe(2)

      // 第二轮
      const response2 = await chatOffline(session.id, '能举个例子吗？')
      expect(response2.messages.length).toBe(2)
    })

    it '会话时间戳', async () => {
      const session = createChatSession()
      const response = await chatOffline(session.id, '你好')

      expect(response.createdAt).toBeDefined()
      expect(response.updatedAt).toBeDefined()
      expect(response.updatedAt).toBeGreaterThanOrEqual(response.createdAt)

      expect(response.messages[0].timestamp).toBeDefined()
      expect(response.messages[1].timestamp).toBeDefined()
    })
  })

  // ==================== 模型信息测试 ====================
  describe('模型信息完整测试', () => {
    it '获取所有模型', () => {
      const models = getModelInfo()

      expect(models.length).toBeGreaterThan(0)

      const types = models.map((m) => m.type)
      expect(types).toContain('nl2sql')
      expect(types).toContain('explain')
      expect(types).toContain('optimize')
    })

    it '模型信息完整', () => {
      const models = getModelInfo()

      for (const model of models) {
        expect(model.name).toBeDefined()
        expect(model.type).toBeDefined()
        expect(model.size).toBeDefined()
        expect(model.description).toBeDefined()
      }
    })
  })

  // ==================== 集成测试 ====================
  describe('集成完整测试', () => {
    it '完整 AI 助手工作流', async () => {
      // 1. 用户用自然语言查询
      const nl2sql = await nl2sqlOffline({
        query: '查询订单最多的前 10 个用户',
      })
      expect(nl2sql.sql).toBeDefined()

      // 2. 解释生成的 SQL
      const explain = await explainSQLOffline({ sql: nl2sql.sql })
      expect(explain.summary).toBeDefined()
      expect(explain.breakdown.length).toBeGreaterThan(0)

      // 3. 优化 SQL
      const optimize = await optimizeSQLOffline({ sql: nl2sql.sql })
      expect(optimize.optimizedSQL).toBeDefined()

      // 4. 聊天询问
      const session = createChatSession()
      const chat = await chatOffline(session.id, '这个 SQL 怎么优化？')
      expect(chat.messages.length).toBe(2)

      // 5. 保存会话
      const saved = saveChatSession(chat)
      const loaded = loadChatSession(saved)
      expect(loaded.messages.length).toBe(2)
    })

    it '多轮对话上下文', async () => {
      const session = createChatSession('数据库优化上下文')

      // 第一轮
      await chatOffline(session.id, '如何优化慢查询？')

      // 第二轮 - 应该能理解上下文
      const response2 = await chatOffline(session.id, '有什么具体建议？')
      expect(response2.messages.length).toBe(4) // 2 轮对话
    })
  })

  // ==================== 边界测试 ====================
  describe('边界完整测试', () => {
    it '空查询处理', async () => {
      const response = await nl2sqlOffline({ query: '' })
      expect(response.sql).toBeDefined()
    })

    it '超长 SQL 解释', async () => {
      const longSQL = 'SELECT ' + Array.from({ length: 50 }, (_, i) => `column${i}`).join(', ') + ' FROM users'
      const response = await explainSQLOffline({ sql: longSQL })
      expect(response.summary).toBeDefined()
    })

    it '复杂嵌套查询优化', async () => {
      const complexSQL = `
        SELECT * FROM (
          SELECT u.*, COUNT(o.id) as order_count
          FROM users u
          LEFT JOIN orders o ON u.id = o.user_id
          GROUP BY u.id
        ) AS subquery
        WHERE order_count > 10
      `
      const response = await optimizeSQLOffline({ sql: complexSQL })
      expect(response.optimizedSQL).toBeDefined()
    })

    it '特殊字符处理', async () => {
      const response = await nl2sqlOffline({
        query: "查询名字包含'O'Brien'的用户",
      })
      expect(response.sql).toBeDefined()
    })

    it '多语言查询', async () => {
      const response = await nl2sqlOffline({
        query: 'Query all users',
      })
      expect(response.sql).toBeDefined()
    })
  })
})

console.log('✅ v2.0.0 完整测试套件就绪')
