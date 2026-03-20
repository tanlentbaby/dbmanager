/**
 * v1.5.0 完整验证测试
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  buildSelectQuery,
  validateQuery,
  formatSQL,
  QueryTemplates,
} from '../../web/src/lib/queryBuilder'
import {
  saveQuery,
  getHistory,
  deleteHistoryItem,
  clearHistory,
  exportHistory,
} from '../../web/src/lib/queryHistory'
import {
  addFavorite,
  getFavorites,
  removeFavorite,
  searchFavorites,
  exportFavorites,
} from '../../web/src/lib/queryFavorites'

describe('v1.5.0 完整测试', () => {
  // ==================== 查询构建器测试 ====================
  describe('查询构建器', () => {
    it('构建完整 SELECT 查询', () => {
      const sql = buildSelectQuery({
        tables: ['users'],
        columns: ['id', 'name', 'email'],
        where: [
          { column: 'status', operator: '=', value: 'active' },
        ],
        orderBy: [{ column: 'created_at', direction: 'DESC' }],
        limit: 100,
      })

      expect(sql).toContain('SELECT id, name, email')
      expect(sql).toContain('FROM users')
      expect(sql).toContain("WHERE status = 'active'")
      expect(sql).toContain('ORDER BY created_at DESC')
      expect(sql).toContain('LIMIT 100')
    })

    it('构建复杂 JOIN 查询', () => {
      const sql = buildSelectQuery({
        tables: ['users'],
        columns: ['users.id', 'users.name', 'posts.title', 'comments.content'],
        joins: [
          {
            type: 'LEFT JOIN',
            table: 'posts',
            on: 'users.id = posts.user_id',
          },
          {
            type: 'LEFT JOIN',
            table: 'comments',
            on: 'posts.id = comments.post_id',
          },
        ],
        where: [
          { column: 'users.status', operator: '=', value: 'active' },
        ],
        groupBy: ['users.id'],
        having: [
          { column: 'COUNT(*)', operator: '>', value: 5 },
        ],
      })

      expect(sql).toContain('LEFT JOIN posts')
      expect(sql).toContain('LEFT JOIN comments')
      expect(sql).toContain('GROUP BY users.id')
      expect(sql).toContain('HAVING COUNT(*) > 5')
    })

    it('验证查询有效性', () => {
      const valid = validateQuery({
        tables: ['users'],
        columns: ['*'],
      })

      expect(valid.valid).toBe(true)
      expect(valid.errors.length).toBe(0)
    })

    it('验证无效查询', () => {
      const invalid = validateQuery({
        tables: [],
        columns: ['*'],
      })

      expect(invalid.valid).toBe(false)
      expect(invalid.errors).toContain('至少需要一个表')
    })

    it('格式化 SQL', () => {
      const sql = 'SELECT * FROM users WHERE id = 1'
      const formatted = formatSQL(sql)

      expect(formatted).toContain('\nSELECT')
      expect(formatted).toContain('\nFROM')
      expect(formatted).toContain('\nWHERE')
    })
  })

  // ==================== 查询模板测试 ====================
  describe('查询模板', () => {
    it('使用 COUNT 模板', () => {
      const query = QueryTemplates.selectCount('users')
      const sql = buildSelectQuery(query)

      expect(sql).toContain('SELECT COUNT(*) as count')
      expect(sql).toContain('FROM users')
    })

    it('使用分页模板', () => {
      const query = QueryTemplates.selectWithPagination('users', 50, 100)
      const sql = buildSelectQuery(query)

      expect(sql).toContain('LIMIT 50')
      expect(sql).toContain('OFFSET 100')
    })

    it('使用分组统计模板', () => {
      const query = QueryTemplates.selectGroupBy('orders', 'user_id', 'amount')
      const sql = buildSelectQuery(query)

      expect(sql).toContain('GROUP BY user_id')
      expect(sql).toContain('ORDER BY count DESC')
    })
  })

  // ==================== 查询历史测试 ====================
  describe('查询历史', () => {
    const testHistory = {
      sql: 'SELECT * FROM users',
      database: 'testdb',
      duration: 45,
      rowCount: 100,
      status: 'success' as const,
    }

    it('保存查询历史', async () => {
      const saved = await saveQuery(testHistory)

      expect(saved.id).toBeDefined()
      expect(saved.sql).toBe(testHistory.sql)
      expect(saved.executedAt).toBeDefined()
    })

    it('获取历史记录', async () => {
      await saveQuery(testHistory)
      const history = await getHistory({ limit: 10 })

      expect(Array.isArray(history)).toBe(true)
      expect(history.length).toBeGreaterThan(0)
    })

    it('搜索历史记录', async () => {
      await saveQuery(testHistory)
      const history = await getHistory({ search: 'SELECT', limit: 10 })

      expect(history.length).toBeGreaterThan(0)
    })

    it('删除历史记录', async () => {
      const saved = await saveQuery(testHistory)
      await deleteHistoryItem(saved.id)
      const history = await getHistory({ limit: 10 })

      expect(history.every((h) => h.id !== saved.id)).toBe(true)
    })

    it('导出历史记录', async () => {
      await saveQuery(testHistory)

      const json = await exportHistory('json')
      expect(json).toContain('SELECT')

      const csv = await exportHistory('csv')
      expect(csv).toContain('sql')

      const sql = await exportHistory('sql')
      expect(sql).toContain('SELECT')
    })

    it('清空历史记录', async () => {
      await saveQuery(testHistory)
      await clearHistory()
      const history = await getHistory({ limit: 10 })

      expect(history.length).toBe(0)
    })
  })

  // ==================== 查询收藏测试 ====================
  describe('查询收藏', () => {
    const testFavorite = {
      name: '测试收藏',
      sql: 'SELECT * FROM users WHERE status = "active"',
      category: '用户管理',
      description: '查询活跃用户',
      tags: ['用户', '查询'],
    }

    it('添加收藏', async () => {
      const favorite = await addFavorite(testFavorite)

      expect(favorite.id).toBeDefined()
      expect(favorite.name).toBe(testFavorite.name)
      expect(favorite.executedCount).toBe(0)
    })

    it('获取所有收藏', async () => {
      await addFavorite(testFavorite)
      const favorites = await getFavorites()

      expect(Array.isArray(favorites)).toBe(true)
      expect(favorites.length).toBeGreaterThan(0)
    })

    it('搜索收藏', async () => {
      await addFavorite(testFavorite)
      const favorites = await searchFavorites('用户')

      expect(favorites.length).toBeGreaterThan(0)
    })

    it('按分类获取收藏', async () => {
      await addFavorite(testFavorite)
      const favorites = await getFavorites('用户管理')

      expect(favorites.some((f) => f.category === '用户管理')).toBe(true)
    })

    it('删除收藏', async () => {
      const favorite = await addFavorite(testFavorite)
      await removeFavorite(favorite.id)
      const favorites = await getFavorites()

      expect(favorites.every((f) => f.id !== favorite.id)).toBe(true)
    })

    it('导出收藏', async () => {
      await addFavorite(testFavorite)

      const json = await exportFavorites('json')
      expect(json).toContain('测试收藏')
      expect(json).toContain('SELECT')
    })
  })

  // ==================== 集成测试 ====================
  describe('集成测试', () => {
    it('完整查询流程', async () => {
      // 1. 构建查询
      const sql = buildSelectQuery({
        tables: ['users'],
        columns: ['*'],
        where: [{ column: 'status', operator: '=', value: 'active' }],
        limit: 100,
      })

      // 2. 保存历史
      const history = await saveQuery({
        sql,
        database: 'testdb',
        duration: 50,
        rowCount: 10,
        status: 'success',
      })

      expect(history.id).toBeDefined()

      // 3. 添加收藏
      const favorite = await addFavorite({
        name: '活跃用户查询',
        sql,
        category: '用户管理',
      })

      expect(favorite.id).toBeDefined()

      // 4. 验证历史
      const historyList = await getHistory({ limit: 10 })
      expect(historyList.some((h) => h.id === history.id)).toBe(true)

      // 5. 验证收藏
      const favorites = await getFavorites()
      expect(favorites.some((f) => f.id === favorite.id)).toBe(true)
    })
  })
})

console.log('✅ v1.5.0 完整测试套件就绪')
