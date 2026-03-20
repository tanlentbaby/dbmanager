/**
 * v1.4.0 ER 图功能测试
 */

import { describe, it, expect } from 'vitest'
import {
  generateNodesFromTables,
  generateEdgesFromTables,
  generateERDiagram,
  exportERDToSQL,
  parseDDLToTables,
  autoLayoutNodes,
} from '../../web/src/lib/erdGenerator'

describe('v1.4.0 ER 图功能', () => {
  const mockTables = [
    {
      name: 'users',
      schema: 'public',
      columns: [
        { name: 'id', type: 'INT', nullable: false, isPrimary: true },
        { name: 'name', type: 'VARCHAR(255)', nullable: false },
        { name: 'email', type: 'VARCHAR(255)', nullable: false, isUnique: true },
      ],
      primaryKeys: ['id'],
      foreignKeys: [],
    },
    {
      name: 'orders',
      schema: 'public',
      columns: [
        { name: 'id', type: 'INT', nullable: false, isPrimary: true },
        { name: 'user_id', type: 'INT', nullable: false },
        { name: 'amount', type: 'DECIMAL(10,2)', nullable: false },
      ],
      primaryKeys: ['id'],
      foreignKeys: [
        {
          column: 'user_id',
          referencesTable: 'users',
          referencesColumn: 'id',
          constraintName: 'fk_orders_user',
        },
      ],
    },
  ]

  // ==================== 节点生成测试 ====================
  describe('节点生成', () => {
    it('从表结构生成节点', () => {
      const nodes = generateNodesFromTables(mockTables)
      
      expect(nodes.length).toBe(2)
      expect(nodes[0].name).toBe('users')
      expect(nodes[0].columns.length).toBe(3)
      expect(nodes[0].primaryKeys).toContain('id')
    })

    it('节点包含正确的位置信息', () => {
      const nodes = generateNodesFromTables(mockTables)
      
      expect(nodes[0].position).toBeDefined()
      expect(nodes[0].position.x).toBe(0)
      expect(nodes[0].position.y).toBe(0)
    })

    it('节点包含外键信息', () => {
      const nodes = generateNodesFromTables(mockTables)
      const ordersNode = nodes.find((n) => n.name === 'orders')
      
      expect(ordersNode).toBeDefined()
      expect(ordersNode?.foreignKeys.length).toBe(1)
      expect(ordersNode?.foreignKeys[0].referencesTable).toBe('users')
    })
  })

  // ==================== 边生成测试 ====================
  describe('边生成', () => {
    it('从外键生成边', () => {
      const nodes = generateNodesFromTables(mockTables)
      const edges = generateEdgesFromTables(nodes)
      
      expect(edges.length).toBe(1)
      expect(edges[0].source).toBe('orders')
      expect(edges[0].target).toBe('users')
    })

    it('边包含正确的标签', () => {
      const nodes = generateNodesFromTables(mockTables)
      const edges = generateEdgesFromTables(nodes)
      
      expect(edges[0].label).toContain('user_id')
      expect(edges[0].label).toContain('id')
    })
  })

  // ==================== ER 图生成测试 ====================
  describe('ER 图生成', () => {
    it('生成完整的 ER 图', () => {
      const erd = generateERDiagram(mockTables)
      
      expect(erd).toBeDefined()
      expect(erd.nodes.length).toBe(2)
      expect(erd.edges.length).toBe(1)
      expect(erd.tables.length).toBe(2)
    })

    it('ER 图节点类型正确', () => {
      const erd = generateERDiagram(mockTables)
      
      expect(erd.nodes[0].type).toBe('table')
      expect(erd.nodes[0].data).toBeDefined()
    })

    it('ER 图边类型正确', () => {
      const erd = generateERDiagram(mockTables)
      
      expect(erd.edges[0].type).toBe('smoothstep')
    })
  })

  // ==================== SQL 导出测试 ====================
  describe('SQL 导出', () => {
    it('导出 CREATE TABLE 语句', () => {
      const tables = generateNodesFromTables(mockTables)
      const sql = exportERDToSQL(tables, 'mysql')
      
      expect(sql).toContain('CREATE TABLE users')
      expect(sql).toContain('CREATE TABLE orders')
    })

    it('导出包含主键', () => {
      const tables = generateNodesFromTables(mockTables)
      const sql = exportERDToSQL(tables, 'mysql')
      
      expect(sql).toContain('PRIMARY KEY')
    })

    it('导出包含外键约束', () => {
      const tables = generateNodesFromTables(mockTables)
      const sql = exportERDToSQL(tables, 'mysql')
      
      expect(sql).toContain('FOREIGN KEY')
      expect(sql).toContain('fk_orders_user')
    })

    it('导出包含 NOT NULL', () => {
      const tables = generateNodesFromTables(mockTables)
      const sql = exportERDToSQL(tables, 'mysql')
      
      expect(sql).toContain('NOT NULL')
    })
  })

  // ==================== DDL 解析测试 ====================
  describe('DDL 解析', () => {
    const testDDL = `
      CREATE TABLE users (
        id INT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE
      );

      CREATE TABLE orders (
        id INT PRIMARY KEY,
        user_id INT,
        amount DECIMAL(10,2),
        FOREIGN KEY (user_id) REFERENCES users(id)
      );
    `

    it('解析 CREATE TABLE 语句', () => {
      const tables = parseDDLToTables(testDDL)
      
      expect(tables.length).toBe(2)
      expect(tables[0].name).toBe('users')
      expect(tables[1].name).toBe('orders')
    })

    it('解析列定义', () => {
      const tables = parseDDLToTables(testDDL)
      const usersTable = tables.find((t) => t.name === 'users')
      
      expect(usersTable?.columns.length).toBe(3)
      expect(usersTable?.columns[0].name).toBe('id')
      expect(usersTable?.columns[0].type).toBe('INT')
    })

    it('解析主键', () => {
      const tables = parseDDLToTables(testDDL)
      const usersTable = tables.find((t) => t.name === 'users')
      
      expect(usersTable?.primaryKeys).toContain('id')
    })

    it('解析外键', () => {
      const tables = parseDDLToTables(testDDL)
      const ordersTable = tables.find((t) => t.name === 'orders')
      
      expect(ordersTable?.foreignKeys.length).toBe(1)
      expect(ordersTable?.foreignKeys[0].referencesTable).toBe('users')
    })
  })

  // ==================== 自动布局测试 ====================
  describe('自动布局', () => {
    it('自动布局节点', () => {
      const nodes = generateNodesFromTables(mockTables)
      const layoutedNodes = autoLayoutNodes(nodes)
      
      expect(layoutedNodes.length).toBe(2)
      expect(layoutedNodes[0].position.x).toBe(0)
      expect(layoutedNodes[0].position.y).toBe(0)
      expect(layoutedNodes[1].position.x).toBe(350)
      expect(layoutedNodes[1].position.y).toBe(0)
    })
  })
})

console.log('✅ v1.4.0 ER 图测试框架就绪')
