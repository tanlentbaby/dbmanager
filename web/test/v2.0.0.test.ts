/**
 * v2.0.0 AI 离线助手测试
 */

import { describe, it, expect } from 'vitest'
import {
  nl2sqlOffline,
  explainSQLOffline,
  optimizeSQLOffline,
  chatOffline,
  createChatSession,
  getModelInfo,
} from '../../web/src/lib/aiAssistant'

describe('v2.0.0 AI 离线助手', () => {
  // ==================== NL2SQL 测试 ====================
  describe('NL2SQL', () => {
    it '转换用户查询', async () => {
      const response = await nl2sqlOffline({
        query: '查询所有用户',
      })

      expect(response.sql).toBeDefined()
      expect(response.confidence).toBeGreaterThan(0)
      expect(response.explanation).toBeDefined()
    })

    it '转换订单查询', async () => {
      const response = await nl2sqlOffline({
        query: '查询最近 10 个订单',
      })

      expect(response.sql).toContain('orders')
      expect(response.sql).toContain('LIMIT')
    })

    it '转换带条件查询', async () => {
      const response = await nl2sqlOffline({
        query: '查询前 10 个用户',
      })

      expect(response.sql).toContain('LIMIT 10')
    })
  })

  // ==================== SQL 解释测试 ====================
  describe('SQL 解释', () => {
    it '解释简单查询', async () => {
      const response = await explainSQLOffline({
        sql: 'SELECT * FROM users',
      })

      expect(response.summary).toBeDefined()
      expect(response.breakdown.length).toBeGreaterThan(0)
      expect(response.suggestions.length).toBeGreaterThan(0)
    })

    it '解释复杂查询', async () => {
      const response = await explainSQLOffline({
        sql: 'SELECT u.name, COUNT(o.id) FROM users u LEFT JOIN orders o ON u.id = o.user_id WHERE u.status = "active" GROUP BY u.id ORDER BY COUNT(o.id) DESC LIMIT 10',
      })

      expect(response.breakdown.some((b) => b.includes('JOIN'))).toBe(true)
      expect(response.breakdown.some((b) => b.includes('GROUP BY'))).toBe(true)
      expect(response.complexity).toBe('high')
    })

    it '检测复杂度', async () => {
      const simple = await explainSQLOffline({ sql: 'SELECT * FROM users' })
      expect(simple.complexity).toBe('low')

      const medium = await explainSQLOffline({ sql: 'SELECT * FROM users u JOIN orders o ON u.id = o.user_id' })
      expect(medium.complexity).toBe('medium')
    })
  })

  // ==================== SQL 优化测试 ====================
  describe('SQL 优化', () => {
    it '优化 SELECT *', async () => {
      const response = await optimizeSQLOffline({
        sql: 'SELECT * FROM users',
      })

      expect(response.improvements.some((i) => i.includes('SELECT *'))).toBe(true)
      expect(response.optimizedSQL).not.toContain('SELECT *')
    })

    it '优化 LIKE', async () => {
      const response = await optimizeSQLOffline({
        sql: "SELECT * FROM users WHERE name LIKE '%test%'",
      })

      expect(response.improvements.some((i) => i.includes('LIKE'))).toBe(true)
    })

    it '添加 LIMIT', async () => {
      const response = await optimizeSQLOffline({
        sql: 'SELECT * FROM users',
      })

      expect(response.optimizedSQL).toContain('LIMIT')
    })

    it '计算性能提升', async () => {
      const response = await optimizeSQLOffline({
        sql: 'SELECT * FROM users WHERE name LIKE "%test%"',
      })

      expect(response.performanceGain).toBeDefined()
    })
  })

  // ==================== 聊天测试 ====================
  describe('聊天', () => {
    it '创建聊天会话', () => {
      const session = createChatSession()
      expect(session.id).toBeDefined()
      expect(session.messages.length).toBe(0)
      expect(session.createdAt).toBeDefined()
    })

    it '回复如何问题', async () => {
      const session = createChatSession()
      const response = await chatOffline(session.id, '如何使用 DBManager？')

      expect(response.messages.length).toBe(2)
      expect(response.messages[1].role).toBe('assistant')
    })

    it '回复优化问题', async () => {
      const session = createChatSession()
      const response = await chatOffline(session.id, '如何优化 SQL 性能？')

      expect(response.messages[1].content).toContain('优化')
    })

    it '回复解释问题', async () => {
      const session = createChatSession()
      const response = await chatOffline(session.id, '如何解释 SQL？')

      expect(response.messages[1].content).toContain('解释')
    })
  })

  // ==================== 模型信息测试 ====================
  describe('模型信息', () => {
    it '获取模型列表', () => {
      const models = getModelInfo()
      expect(models.length).toBeGreaterThan(0)
      expect(models.some((m) => m.type === 'nl2sql')).toBe(true)
      expect(models.some((m) => m.type === 'explain')).toBe(true)
      expect(models.some((m) => m.type === 'optimize')).toBe(true)
    })
  })

  // ==================== 集成测试 ====================
  describe('集成测试', () => {
    it '完整 AI 助手流程', async () => {
      // 1. NL2SQL
      const nl2sql = await nl2sqlOffline({ query: '查询所有用户' })
      expect(nl2sql.sql).toBeDefined()

      // 2. 解释生成的 SQL
      const explain = await explainSQLOffline({ sql: nl2sql.sql })
      expect(explain.summary).toBeDefined()

      // 3. 优化 SQL
      const optimize = await optimizeSQLOffline({ sql: nl2sql.sql })
      expect(optimize.optimizedSQL).toBeDefined()

      // 4. 聊天询问
      const session = createChatSession()
      const chat = await chatOffline(session.id, '这个 SQL 怎么优化？')
      expect(chat.messages.length).toBe(2)
    })
  })
})

console.log('✅ v2.0.0 测试框架就绪')
