/**
 * v1.4.0 ER 图完整验证测试
 */

import { describe, it, expect, beforeEach } from 'vitest'
import {
  generateNodesFromTables,
  generateEdgesFromTables,
  generateERDiagram,
  exportERDToSQL,
  parseDDLToTables,
  autoLayoutNodes,
  type TableNode,
} from '../../web/src/lib/erdGenerator'

describe('v1.4.0 ER 图完整测试', () => {
  // 测试数据
  const complexTables = [
    {
      name: 'users',
      schema: 'public',
      columns: [
        { name: 'id', type: 'BIGINT', nullable: false, isPrimary: true },
        { name: 'username', type: 'VARCHAR(50)', nullable: false, isUnique: true },
        { name: 'email', type: 'VARCHAR(255)', nullable: false },
        { name: 'password_hash', type: 'VARCHAR(255)', nullable: false },
        { name: 'created_at', type: 'TIMESTAMP', nullable: false, defaultValue: 'NOW()' },
      ],
      primaryKeys: ['id'],
      foreignKeys: [],
    },
    {
      name: 'posts',
      schema: 'public',
      columns: [
        { name: 'id', type: 'BIGINT', nullable: false, isPrimary: true },
        { name: 'user_id', type: 'BIGINT', nullable: false },
        { name: 'title', type: 'VARCHAR(255)', nullable: false },
        { name: 'content', type: 'TEXT', nullable: true },
        { name: 'published', type: 'BOOLEAN', nullable: false, defaultValue: false },
      ],
      primaryKeys: ['id'],
      foreignKeys: [
        {
          column: 'user_id',
          referencesTable: 'users',
          referencesColumn: 'id',
          constraintName: 'fk_posts_user',
        },
      ],
    },
    {
      name: 'comments',
      schema: 'public',
      columns: [
        { name: 'id', type: 'BIGINT', nullable: false, isPrimary: true },
        { name: 'post_id', type: 'BIGINT', nullable: false },
        { name: 'user_id', type: 'BIGINT', nullable: false },
        { name: 'content', type: 'TEXT', nullable: false },
      ],
      primaryKeys: ['id'],
      foreignKeys: [
        {
          column: 'post_id',
          referencesTable: 'posts',
          referencesColumn: 'id',
          constraintName: 'fk_comments_post',
        },
        {
          column: 'user_id',
          referencesTable: 'users',
          referencesColumn: 'id',
          constraintName: 'fk_comments_user',
        },
      ],
    },
  ]

  // ==================== 节点生成测试 ====================
  describe('节点生成', () => {
    it('生成正确数量的节点', () => {
      const nodes = generateNodesFromTables(complexTables)
      expect(nodes.length).toBe(3)
    })

    it('节点包含正确的表信息', () => {
      const nodes = generateNodesFromTables(complexTables)
      const usersNode = nodes.find((n) => n.name === 'users')

      expect(usersNode).toBeDefined()
      expect(usersNode?.columns.length).toBe(5)
      expect(usersNode?.primaryKeys).toContain('id')
    })

    it('节点包含外键关系', () => {
      const nodes = generateNodesFromTables(complexTables)
      const commentsNode = nodes.find((n) => n.name === 'comments')

      expect(commentsNode?.foreignKeys.length).toBe(2)
      expect(commentsNode?.foreignKeys.some((fk) => fk.referencesTable === 'posts')).toBe(true)
      expect(commentsNode?.foreignKeys.some((fk) => fk.referencesTable === 'users')).toBe(true)
    })

    it('节点位置自动分布', () => {
      const nodes = generateNodesFromTables(complexTables)

      expect(nodes[0].position.x).toBe(0)
      expect(nodes[0].position.y).toBe(0)
      expect(nodes[1].position.x).toBe(350)
      expect(nodes[1].position.y).toBe(0)
      expect(nodes[2].position.x).toBe(700)
      expect(nodes[2].position.y).toBe(0)
    })
  })

  // ==================== 边生成测试 ====================
  describe('边生成', () => {
    it('生成正确数量的边', () => {
      const nodes = generateNodesFromTables(complexTables)
      const edges = generateEdgesFromTables(nodes)

      expect(edges.length).toBe(3) // posts->users, comments->posts, comments->users
    })

    it('边方向正确', () => {
      const nodes = generateNodesFromTables(complexTables)
      const edges = generateEdgesFromTables(nodes)

      const postsToUsers = edges.find((e) => e.source === 'posts' && e.target === 'users')
      expect(postsToUsers).toBeDefined()

      const commentsToPosts = edges.find((e) => e.source === 'comments' && e.target === 'posts')
      expect(commentsToPosts).toBeDefined()

      const commentsToUsers = edges.find((e) => e.source === 'comments' && e.target === 'users')
      expect(commentsToUsers).toBeDefined()
    })

    it('边包含正确的标签', () => {
      const nodes = generateNodesFromTables(complexTables)
      const edges = generateEdgesFromTables(nodes)

      edges.forEach((edge) => {
        expect(edge.label).toBeDefined()
        expect(edge.label).toContain('→')
      })
    })
  })

  // ==================== ER 图生成测试 ====================
  describe('ER 图生成', () => {
    it('生成完整的 ER 图', () => {
      const erd = generateERDiagram(complexTables)

      expect(erd.nodes.length).toBe(3)
      expect(erd.edges.length).toBe(3)
      expect(erd.tables.length).toBe(3)
    })

    it('ER 图节点类型正确', () => {
      const erd = generateERDiagram(complexTables)

      erd.nodes.forEach((node) => {
        expect(node.type).toBe('table')
        expect(node.data).toBeDefined()
        expect(node.data.name).toBeDefined()
        expect(node.data.columns).toBeDefined()
      })
    })

    it('ER 图边样式正确', () => {
      const erd = generateERDiagram(complexTables)

      erd.edges.forEach((edge) => {
        expect(edge.type).toBe('smoothstep')
        expect(edge.style).toBeDefined()
        expect(edge.markerEnd).toBeDefined()
      })
    })
  })

  // ==================== SQL 导出测试 ====================
  describe('SQL 导出', () => {
    it('导出 CREATE TABLE 语句', () => {
      const nodes = generateNodesFromTables(complexTables)
      const sql = exportERDToSQL(nodes, 'mysql')

      expect(sql).toContain('CREATE TABLE users')
      expect(sql).toContain('CREATE TABLE posts')
      expect(sql).toContain('CREATE TABLE comments')
    })

    it('导出包含所有列', () => {
      const nodes = generateNodesFromTables(complexTables)
      const sql = exportERDToSQL(nodes, 'mysql')

      expect(sql).toContain('username')
      expect(sql).toContain('email')
      expect(sql).toContain('password_hash')
      expect(sql).toContain('title')
      expect(sql).toContain('content')
    })

    it('导出包含主键约束', () => {
      const nodes = generateNodesFromTables(complexTables)
      const sql = exportERDToSQL(nodes, 'mysql')

      expect(sql).toContain('PRIMARY KEY')
    })

    it('导出包含外键约束', () => {
      const nodes = generateNodesFromTables(complexTables)
      const sql = exportERDToSQL(nodes, 'mysql')

      expect(sql).toContain('FOREIGN KEY')
      expect(sql).toContain('fk_posts_user')
      expect(sql).toContain('fk_comments_post')
      expect(sql).toContain('fk_comments_user')
    })

    it('导出包含 NOT NULL', () => {
      const nodes = generateNodesFromTables(complexTables)
      const sql = exportERDToSQL(nodes, 'mysql')

      expect(sql).toContain('NOT NULL')
    })

    it('导出包含 DEFAULT 值', () => {
      const nodes = generateNodesFromTables(complexTables)
      const sql = exportERDToSQL(nodes, 'mysql')

      expect(sql).toContain("DEFAULT 'NOW()'")
      expect(sql).toContain('DEFAULT false')
    })

    it('导出包含 UNIQUE 约束', () => {
      const nodes = generateNodesFromTables(complexTables)
      const sql = exportERDToSQL(nodes, 'mysql')

      expect(sql).toContain('UNIQUE')
    })

    it('导出包含 MySQL 特定语法', () => {
      const nodes = generateNodesFromTables(complexTables)
      const sql = exportERDToSQL(nodes, 'mysql')

      expect(sql).toContain('ENGINE=InnoDB')
      expect(sql).toContain('DEFAULT CHARSET=utf8mb4')
    })
  })

  // ==================== DDL 解析测试 ====================
  describe('DDL 解析', () => {
    const complexDDL = `
      CREATE TABLE users (
        id BIGINT PRIMARY KEY,
        username VARCHAR(50) NOT NULL UNIQUE,
        email VARCHAR(255) NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE posts (
        id BIGINT PRIMARY KEY,
        user_id BIGINT NOT NULL,
        title VARCHAR(255) NOT NULL,
        content TEXT,
        published BOOLEAN DEFAULT FALSE,
        CONSTRAINT fk_posts_user FOREIGN KEY (user_id) REFERENCES users(id)
      );

      CREATE TABLE comments (
        id BIGINT PRIMARY KEY,
        post_id BIGINT NOT NULL,
        user_id BIGINT NOT NULL,
        content TEXT NOT NULL,
        FOREIGN KEY (post_id) REFERENCES posts(id),
        FOREIGN KEY (user_id) REFERENCES users(id)
      );
    `

    it('解析多个表', () => {
      const tables = parseDDLToTables(complexDDL)
      expect(tables.length).toBe(3)
    })

    it('解析列定义', () => {
      const tables = parseDDLToTables(complexDDL)
      const usersTable = tables.find((t) => t.name === 'users')

      expect(usersTable?.columns.length).toBe(5)
      expect(usersTable?.columns[0].name).toBe('id')
      expect(usersTable?.columns[0].type).toBe('BIGINT')
    })

    it('解析主键', () => {
      const tables = parseDDLToTables(complexDDL)
      
      tables.forEach((table) => {
        expect(table.primaryKeys.length).toBeGreaterThan(0)
      })
    })

    it('解析外键约束', () => {
      const tables = parseDDLToTables(complexDDL)
      const postsTable = tables.find((t) => t.name === 'posts')
      const commentsTable = tables.find((t) => t.name === 'comments')

      expect(postsTable?.foreignKeys.length).toBe(1)
      expect(commentsTable?.foreignKeys.length).toBe(2)
    })

    it('解析 NOT NULL 约束', () => {
      const tables = parseDDLToTables(complexDDL)
      const usersTable = tables.find((t) => t.name === 'users')

      expect(usersTable?.columns.find((c) => c.name === 'username')?.nullable).toBe(false)
      expect(usersTable?.columns.find((c) => c.name === 'email')?.nullable).toBe(false)
    })
  })

  // ==================== 自动布局测试 ====================
  describe('自动布局', () => {
    it('自动布局多个节点', () => {
      const nodes = generateNodesFromTables(complexTables)
      const layoutedNodes = autoLayoutNodes(nodes)

      expect(layoutedNodes.length).toBe(3)
      expect(layoutedNodes[0].position.x).toBe(0)
      expect(layoutedNodes[1].position.x).toBe(350)
      expect(layoutedNodes[2].position.x).toBe(700)
    })

    it('自动布局换行', () => {
      const manyTables = Array.from({ length: 10 }, (_, i) => ({
        id: `table_${i}`,
        name: `table_${i}`,
        columns: [{ name: 'id', type: 'INT', nullable: false }],
        primaryKeys: ['id'],
        foreignKeys: [],
        position: { x: 0, y: 0 },
      }))

      const layoutedNodes = autoLayoutNodes(manyTables as TableNode[])

      // 每行 4 个，第 5 个应该换行
      expect(layoutedNodes[4].position.x).toBe(0)
      expect(layoutedNodes[4].position.y).toBe(400)
    })
  })

  // ==================== 边界测试 ====================
  describe('边界测试', () => {
    it('处理空表数组', () => {
      const nodes = generateNodesFromTables([])
      expect(nodes.length).toBe(0)

      const erd = generateERDiagram([])
      expect(erd.nodes.length).toBe(0)
      expect(erd.edges.length).toBe(0)
    })

    it('处理没有外键的表', () => {
      const singleTable = [
        {
          name: 'standalone',
          columns: [{ name: 'id', type: 'INT', nullable: false }],
          primaryKeys: ['id'],
          foreignKeys: [],
        },
      ]

      const nodes = generateNodesFromTables(singleTable)
      const edges = generateEdgesFromTables(nodes)

      expect(nodes.length).toBe(1)
      expect(edges.length).toBe(0)
    })

    it('处理自引用外键', () => {
      const selfRefTable = [
        {
          name: 'employees',
          columns: [{ name: 'id', type: 'INT', nullable: false }],
          primaryKeys: ['id'],
          foreignKeys: [
            {
              column: 'manager_id',
              referencesTable: 'employees',
              referencesColumn: 'id',
            },
          ],
        },
      ]

      const nodes = generateNodesFromTables(selfRefTable)
      const edges = generateEdgesFromTables(nodes)

      expect(edges.length).toBe(1)
      expect(edges[0].source).toBe('employees')
      expect(edges[0].target).toBe('employees')
    })
  })
})

console.log('✅ v1.4.0 完整测试套件就绪')
