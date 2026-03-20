/**
 * v1.5.0 高级查询功能测试
 */

import { describe, it, expect } from 'vitest'
import {
  buildSelectQuery,
  generateQueryFromTables,
  validateQuery,
  formatSQL,
  QueryTemplates,
} from '../../web/src/lib/queryBuilder'

describe('v1.5.0 高级查询功能', () => {
  // ==================== SELECT 查询构建测试 ====================
  describe('SELECT 查询构建', () => {
    it('构建基本 SELECT 查询', () => {
      const sql = buildSelectQuery({
        tables: ['users'],
        columns: ['id', 'name', 'email'],
      })

      expect(sql).toContain('SELECT id, name, email')
      expect(sql).toContain('FROM users')
    })

    it('构建 DISTINCT 查询', () => {
      const sql = buildSelectQuery({
        tables: ['users'],
        columns: ['name'],
        distinct: true,
      })

      expect(sql).toContain('SELECT DISTINCT name')
    })

    it('构建带 LIMIT 的查询', () => {
      const sql = buildSelectQuery({
        tables: ['users'],
        columns: ['*'],
        limit: 100,
        offset: 50,
      })

      expect(sql).toContain('LIMIT 100')
      expect(sql).toContain('OFFSET 50')
    })
  })

  // ==================== JOIN 查询构建测试 ====================
  describe('JOIN 查询构建', () => {
    it('构建 INNER JOIN 查询', () => {
      const sql = buildSelectQuery({
        tables: ['users'],
        columns: ['users.id', 'users.name', 'orders.amount'],
        joins: [
          {
            type: 'INNER JOIN',
            table: 'orders',
            on: 'users.id = orders.user_id',
          },
        ],
      })

      expect(sql).toContain('INNER JOIN orders ON users.id = orders.user_id')
    })

    it('构建 LEFT JOIN 查询', () => {
      const sql = buildSelectQuery({
        tables: ['users'],
        columns: ['users.id', 'posts.title'],
        joins: [
          {
            type: 'LEFT JOIN',
            table: 'posts',
            on: 'users.id = posts.user_id',
          },
        ],
      })

      expect(sql).toContain('LEFT JOIN posts')
    })

    it('构建多表 JOIN 查询', () => {
      const sql = buildSelectQuery({
        tables: ['users'],
        columns: ['users.id', 'posts.title', 'comments.content'],
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
      })

      expect(sql).toContain('LEFT JOIN posts')
      expect(sql).toContain('LEFT JOIN comments')
    })
  })

  // ==================== WHERE 条件构建测试 ====================
  describe('WHERE 条件构建', () => {
    it('构建等于条件', () => {
      const sql = buildSelectQuery({
        tables: ['users'],
        columns: ['*'],
        where: [
          { column: 'status', operator: '=', value: 'active' },
        ],
      })

      expect(sql).toContain("WHERE status = 'active'")
    })

    it('构建数字条件', () => {
      const sql = buildSelectQuery({
        tables: ['users'],
        columns: ['*'],
        where: [
          { column: 'age', operator: '>=', value: 18 },
        ],
      })

      expect(sql).toContain('WHERE age >= 18')
    })

    it('构建 IN 条件', () => {
      const sql = buildSelectQuery({
        tables: ['users'],
        columns: ['*'],
        where: [
          { column: 'status', operator: 'IN', value: ['active', 'pending'] },
        ],
      })

      expect(sql).toContain("WHERE status IN ('active', 'pending')")
    })

    it('构建 LIKE 条件', () => {
      const sql = buildSelectQuery({
        tables: ['users'],
        columns: ['*'],
        where: [
          { column: 'name', operator: 'LIKE', value: '%John%' },
        ],
      })

      expect(sql).toContain("WHERE name LIKE '%John%'")
    })

    it('构建 IS NULL 条件', () => {
      const sql = buildSelectQuery({
        tables: ['users'],
        columns: ['*'],
        where: [
          { column: 'deleted_at', operator: 'IS NULL' },
        ],
      })

      expect(sql).toContain('WHERE deleted_at IS NULL')
    })

    it('构建多个 WHERE 条件', () => {
      const sql = buildSelectQuery({
        tables: ['users'],
        columns: ['*'],
        where: [
          { column: 'status', operator: '=', value: 'active', logic: 'AND' },
          { column: 'age', operator: '>=', value: 18, logic: 'AND' },
        ],
      })

      expect(sql).toContain('AND status')
      expect(sql).toContain('AND age')
    })
  })

  // ==================== ORDER BY 构建测试 ====================
  describe('ORDER BY 构建', () => {
    it('构建 ASC 排序', () => {
      const sql = buildSelectQuery({
        tables: ['users'],
        columns: ['*'],
        orderBy: [{ column: 'name', direction: 'ASC' }],
      })

      expect(sql).toContain('ORDER BY name ASC')
    })

    it('构建 DESC 排序', () => {
      const sql = buildSelectQuery({
        tables: ['users'],
        columns: ['*'],
        orderBy: [{ column: 'created_at', direction: 'DESC' }],
      })

      expect(sql).toContain('ORDER BY created_at DESC')
    })

    it('构建多列排序', () => {
      const sql = buildSelectQuery({
        tables: ['users'],
        columns: ['*'],
        orderBy: [
          { column: 'status', direction: 'ASC' },
          { column: 'created_at', direction: 'DESC' },
        ],
      })

      expect(sql).toContain('ORDER BY status ASC, created_at DESC')
    })
  })

  // ==================== GROUP BY 构建测试 ====================
  describe('GROUP BY 构建', () => {
    it('构建 GROUP BY 查询', () => {
      const sql = buildSelectQuery({
        tables: ['orders'],
        columns: ['user_id', 'COUNT(*) as count'],
        groupBy: ['user_id'],
      })

      expect(sql).toContain('GROUP BY user_id')
    })

    it('构建带 HAVING 的查询', () => {
      const sql = buildSelectQuery({
        tables: ['orders'],
        columns: ['user_id', 'COUNT(*) as count'],
        groupBy: ['user_id'],
        having: [
          { column: 'COUNT(*)', operator: '>', value: 5 },
        ],
      })

      expect(sql).toContain('HAVING COUNT(*) > 5')
    })
  })

  // ==================== 查询模板测试 ====================
  describe('查询模板', () => {
    it('selectAll 模板', () => {
      const query = QueryTemplates.selectAll('users')
      const sql = buildSelectQuery(query)

      expect(sql).toContain('SELECT *')
      expect(sql).toContain('FROM users')
    })

    it('分页查询模板', () => {
      const query = QueryTemplates.selectWithPagination('users', 100, 50)
      const sql = buildSelectQuery(query)

      expect(sql).toContain('LIMIT 100')
      expect(sql).toContain('OFFSET 50')
    })

    it('条件查询模板', () => {
      const query = QueryTemplates.selectWithWhere('users', 'status', 'active')
      const sql = buildSelectQuery(query)

      expect(sql).toContain("WHERE status = 'active'")
    })

    it('统计查询模板', () => {
      const query = QueryTemplates.selectCount('users')
      const sql = buildSelectQuery(query)

      expect(sql).toContain('SELECT COUNT(*) as count')
    })

    it('分组统计模板', () => {
      const query = QueryTemplates.selectGroupBy('orders', 'user_id', 'amount')
      const sql = buildSelectQuery(query)

      expect(sql).toContain('GROUP BY user_id')
      expect(sql).toContain('ORDER BY count DESC')
    })
  })

  // ==================== 查询验证测试 ====================
  describe('查询验证', () => {
    it('验证有效查询', () => {
      const result = validateQuery({
        tables: ['users'],
        columns: ['*'],
      })

      expect(result.valid).toBe(true)
      expect(result.errors.length).toBe(0)
    })

    it('验证缺少表的查询', () => {
      const result = validateQuery({
        tables: [],
        columns: ['*'],
      })

      expect(result.valid).toBe(false)
      expect(result.errors).toContain('至少需要一个表')
    })

    it('验证缺少 ON 条件的 JOIN', () => {
      const result = validateQuery({
        tables: ['users'],
        columns: ['*'],
        joins: [
          {
            type: 'INNER JOIN',
            table: 'orders',
            on: '',
          },
        ],
      })

      expect(result.errors.some((e) => e.includes('缺少 ON 条件'))).toBe(true)
    })
  })

  // ==================== SQL 格式化测试 ====================
  describe('SQL 格式化', () => {
    it('格式化基本 SQL', () => {
      const sql = 'SELECT * FROM users WHERE id = 1'
      const formatted = formatSQL(sql)

      expect(formatted).toContain('\nSELECT')
      expect(formatted).toContain('\nFROM')
      expect(formatted).toContain('\nWHERE')
    })

    it('格式化复杂 SQL', () => {
      const sql = 'SELECT u.id, u.name FROM users u LEFT JOIN orders o ON u.id = o.user_id WHERE u.status = "active" ORDER BY u.created_at DESC LIMIT 100'
      const formatted = formatSQL(sql)

      expect(formatted).toContain('\nSELECT')
      expect(formatted).toContain('\nFROM')
      expect(formatted).toContain('\nLEFT JOIN')
      expect(formatted).toContain('\nWHERE')
      expect(formatted).toContain('\nORDER BY')
      expect(formatted).toContain('\nLIMIT')
    })
  })
})

console.log('✅ v1.5.0 测试框架就绪')
