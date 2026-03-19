/**
 * 查询模板管理器
 * v0.6.0 新功能 - 协作共享
 * 
 * 功能：
 * - 模板库管理（添加/删除/更新）
 * - 内置模板（常用查询）
 * - 模板搜索（名称/标签/描述）
 * - 模板应用
 * - 导出/导入（JSON 格式）
 * - 标签分类
 */

export interface QueryTemplate {
  id: string;
  name: string;
  description: string;
  sql: string;
  category: string;
  tags: string[];
  databaseType?: 'mysql' | 'postgresql' | 'sqlite' | 'all';
  variables?: TemplateVariable[];
  createdAt: string;
  updatedAt: string;
  usageCount: number;
}

export interface TemplateVariable {
  name: string;
  description: string;
  defaultValue?: string;
  required: boolean;
}

export interface TemplateCategory {
  id: string;
  name: string;
  description: string;
  icon: string;
}

export class TemplateManager {
  private templates: Map<string, QueryTemplate> = new Map();
  private readonly storagePath: string;

  // 内置模板
  private readonly builtinTemplates: QueryTemplate[] = [
    // CRUD 基础
    {
      id: 'crud_select_all',
      name: '查询所有记录',
      description: '查询表中的所有数据',
      sql: 'SELECT * FROM {{table}};',
      category: 'crud',
      tags: ['select', 'basic', 'crud'],
      databaseType: 'all',
      variables: [{ name: 'table', description: '表名', required: true }],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      usageCount: 0,
    },
    {
      id: 'crud_select_by_id',
      name: '按 ID 查询',
      description: '根据主键 ID 查询单条记录',
      sql: 'SELECT * FROM {{table}} WHERE id = {{id}};',
      category: 'crud',
      tags: ['select', 'where', 'id', 'crud'],
      databaseType: 'all',
      variables: [
        { name: 'table', description: '表名', required: true },
        { name: 'id', description: '主键 ID', required: true },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      usageCount: 0,
    },
    {
      id: 'crud_insert',
      name: '插入记录',
      description: '向表中插入新记录',
      sql: 'INSERT INTO {{table}} ({{columns}}) VALUES ({{values}});',
      category: 'crud',
      tags: ['insert', 'create', 'crud'],
      databaseType: 'all',
      variables: [
        { name: 'table', description: '表名', required: true },
        { name: 'columns', description: '列名列表', required: true },
        { name: 'values', description: '值列表', required: true },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      usageCount: 0,
    },
    {
      id: 'crud_update',
      name: '更新记录',
      description: '更新表中的记录',
      sql: 'UPDATE {{table}} SET {{column}} = {{value}} WHERE {{condition}};',
      category: 'crud',
      tags: ['update', 'modify', 'crud'],
      databaseType: 'all',
      variables: [
        { name: 'table', description: '表名', required: true },
        { name: 'column', description: '要更新的列', required: true },
        { name: 'value', description: '新值', required: true },
        { name: 'condition', description: 'WHERE 条件', required: true },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      usageCount: 0,
    },
    {
      id: 'crud_delete',
      name: '删除记录',
      description: '从表中删除记录',
      sql: 'DELETE FROM {{table}} WHERE {{condition}};',
      category: 'crud',
      tags: ['delete', 'remove', 'crud'],
      databaseType: 'all',
      variables: [
        { name: 'table', description: '表名', required: true },
        { name: 'condition', description: 'WHERE 条件', required: true },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      usageCount: 0,
    },

    // 统计分析
    {
      id: 'stats_count',
      name: '统计数量',
      description: '统计表中的记录数',
      sql: 'SELECT COUNT(*) AS total FROM {{table}};',
      category: 'statistics',
      tags: ['count', 'aggregate', 'stats'],
      databaseType: 'all',
      variables: [{ name: 'table', description: '表名', required: true }],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      usageCount: 0,
    },
    {
      id: 'stats_group_by',
      name: '分组统计',
      description: '按指定列分组统计',
      sql: 'SELECT {{column}}, COUNT(*) AS count FROM {{table}} GROUP BY {{column}} ORDER BY count DESC;',
      category: 'statistics',
      tags: ['group', 'count', 'aggregate', 'stats'],
      databaseType: 'all',
      variables: [
        { name: 'table', description: '表名', required: true },
        { name: 'column', description: '分组列', required: true },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      usageCount: 0,
    },
    {
      id: 'stats_avg',
      name: '平均值统计',
      description: '计算数值列的平均值',
      sql: 'SELECT AVG({{column}}) AS average FROM {{table}} WHERE {{column}} IS NOT NULL;',
      category: 'statistics',
      tags: ['avg', 'average', 'aggregate', 'stats'],
      databaseType: 'all',
      variables: [
        { name: 'table', description: '表名', required: true },
        { name: 'column', description: '数值列', required: true },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      usageCount: 0,
    },

    // 分页查询
    {
      id: 'pagination_limit',
      name: '分页查询',
      description: '带 LIMIT 的分页查询',
      sql: 'SELECT * FROM {{table}} ORDER BY {{order_column}} {{order_direction}} LIMIT {{limit}} OFFSET {{offset}};',
      category: 'pagination',
      tags: ['limit', 'offset', 'page', 'pagination'],
      databaseType: 'all',
      variables: [
        { name: 'table', description: '表名', required: true },
        { name: 'order_column', description: '排序列', required: true, defaultValue: 'created_at' },
        { name: 'order_direction', description: '排序方向', required: true, defaultValue: 'DESC' },
        { name: 'limit', description: '每页数量', required: true, defaultValue: '10' },
        { name: 'offset', description: '偏移量', required: true, defaultValue: '0' },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      usageCount: 0,
    },

    // 时间相关
    {
      id: 'time_recent',
      name: '最近记录',
      description: '查询最近 N 条记录',
      sql: 'SELECT * FROM {{table}} ORDER BY {{time_column}} DESC LIMIT {{limit}};',
      category: 'time',
      tags: ['recent', 'latest', 'time', 'order'],
      databaseType: 'all',
      variables: [
        { name: 'table', description: '表名', required: true },
        { name: 'time_column', description: '时间列', required: true, defaultValue: 'created_at' },
        { name: 'limit', description: '记录数量', required: true, defaultValue: '10' },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      usageCount: 0,
    },
    {
      id: 'time_range',
      name: '时间范围查询',
      description: '查询指定时间范围内的记录',
      sql: 'SELECT * FROM {{table}} WHERE {{time_column}} BETWEEN {{start_date}} AND {{end_date}};',
      category: 'time',
      tags: ['range', 'between', 'time', 'date'],
      databaseType: 'all',
      variables: [
        { name: 'table', description: '表名', required: true },
        { name: 'time_column', description: '时间列', required: true },
        { name: 'start_date', description: '开始日期', required: true },
        { name: 'end_date', description: '结束日期', required: true },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      usageCount: 0,
    },

    // JOIN 查询
    {
      id: 'join_inner',
      name: '内连接查询',
      description: '两表内连接查询',
      sql: 'SELECT {{select_columns}} FROM {{table1}} INNER JOIN {{table2}} ON {{table1}}.{{join_column}} = {{table2}}.{{join_column}} WHERE {{condition}};',
      category: 'join',
      tags: ['join', 'inner', 'relational'],
      databaseType: 'all',
      variables: [
        { name: 'select_columns', description: '查询列', required: true, defaultValue: '*' },
        { name: 'table1', description: '主表', required: true },
        { name: 'table2', description: '关联表', required: true },
        { name: 'join_column', description: '连接列', required: true },
        { name: 'condition', description: 'WHERE 条件', required: false },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      usageCount: 0,
    },

    // 模糊搜索
    {
      id: 'search_like',
      name: '模糊搜索',
      description: '使用 LIKE 进行模糊搜索',
      sql: "SELECT * FROM {{table}} WHERE {{column}} LIKE '%{{keyword}}%';",
      category: 'search',
      tags: ['like', 'search', 'fuzzy', 'match'],
      databaseType: 'all',
      variables: [
        { name: 'table', description: '表名', required: true },
        { name: 'column', description: '搜索列', required: true },
        { name: 'keyword', description: '关键词', required: true },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      usageCount: 0,
    },

    // 去重查询
    {
      id: 'distinct',
      name: '去重查询',
      description: '查询不重复的记录',
      sql: 'SELECT DISTINCT {{column}} FROM {{table}};',
      category: 'basic',
      tags: ['distinct', 'unique', 'dedup'],
      databaseType: 'all',
      variables: [
        { name: 'table', description: '表名', required: true },
        { name: 'column', description: '去重列', required: true },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      usageCount: 0,
    },
  ];

  constructor(storagePath?: string) {
    this.storagePath = storagePath || './templates.json';
    this.loadBuiltinTemplates();
  }

  /**
   * 加载内置模板
   */
  private loadBuiltinTemplates(): void {
    for (const template of this.builtinTemplates) {
      this.templates.set(template.id, template);
    }
  }

  /**
   * 添加自定义模板
   */
  addTemplate(template: Omit<QueryTemplate, 'id' | 'createdAt' | 'updatedAt' | 'usageCount'>): QueryTemplate {
    const id = this.generateId(template.name);
    const now = new Date().toISOString();
    
    const newTemplate: QueryTemplate = {
      ...template,
      id,
      createdAt: now,
      updatedAt: now,
      usageCount: 0,
    };

    this.templates.set(id, newTemplate);
    return newTemplate;
  }

  /**
   * 更新模板
   */
  updateTemplate(id: string, updates: Partial<QueryTemplate>): QueryTemplate | null {
    const template = this.templates.get(id);
    if (!template) return null;

    const updated: QueryTemplate = {
      ...template,
      ...updates,
      id, // 不允许修改 ID
      createdAt: template.createdAt,
      updatedAt: new Date().toISOString(),
    };

    this.templates.set(id, updated);
    return updated;
  }

  /**
   * 删除模板
   */
  deleteTemplate(id: string): boolean {
    // 不允许删除内置模板
    const template = this.templates.get(id);
    if (template && this.isBuiltinTemplate(template)) {
      return false;
    }
    return this.templates.delete(id);
  }

  /**
   * 获取模板
   */
  getTemplate(id: string): QueryTemplate | null {
    return this.templates.get(id) || null;
  }

  /**
   * 列出所有模板
   */
  listTemplates(category?: string, tag?: string): QueryTemplate[] {
    let templates = Array.from(this.templates.values());

    if (category) {
      templates = templates.filter(t => t.category === category);
    }

    if (tag) {
      templates = templates.filter(t => t.tags.includes(tag));
    }

    return templates.sort((a, b) => b.usageCount - a.usageCount);
  }

  /**
   * 搜索模板
   */
  searchTemplates(query: string): QueryTemplate[] {
    const lowerQuery = query.toLowerCase();
    
    return Array.from(this.templates.values()).filter(template => {
      return template.name.toLowerCase().includes(lowerQuery) ||
             template.description.toLowerCase().includes(lowerQuery) ||
             template.tags.some(tag => tag.toLowerCase().includes(lowerQuery)) ||
             template.sql.toLowerCase().includes(lowerQuery);
    }).sort((a, b) => b.usageCount - a.usageCount);
  }

  /**
   * 应用模板（替换变量）
   */
  applyTemplate(id: string, variables?: Record<string, string>): string | null {
    const template = this.templates.get(id);
    if (!template) return null;

    let sql = template.sql;

    // 替换变量
    if (variables) {
      for (const [key, value] of Object.entries(variables)) {
        sql = sql.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
      }
    }

    // 增加使用计数
    template.usageCount++;
    template.updatedAt = new Date().toISOString();

    return sql;
  }

  /**
   * 获取所有分类
   */
  getCategories(): TemplateCategory[] {
    const categories: Record<string, TemplateCategory> = {
      crud: { id: 'crud', name: 'CRUD 操作', icon: '📝', description: '增删改查基础操作' },
      statistics: { id: 'statistics', name: '统计分析', icon: '📊', description: '聚合函数和统计查询' },
      pagination: { id: 'pagination', name: '分页查询', icon: '📄', description: 'LIMIT/OFFSET 分页' },
      time: { id: 'time', name: '时间查询', icon: '⏰', description: '时间范围和排序' },
      join: { id: 'join', name: '连接查询', icon: '🔗', description: '多表 JOIN 查询' },
      search: { id: 'search', name: '搜索查询', icon: '🔍', description: '模糊搜索和匹配' },
      basic: { id: 'basic', name: '基础查询', icon: '📋', description: '简单查询操作' },
    };

    return Object.values(categories);
  }

  /**
   * 获取所有标签
   */
  getTags(): string[] {
    const tagSet = new Set<string>();
    for (const template of this.templates.values()) {
      for (const tag of template.tags) {
        tagSet.add(tag);
      }
    }
    return Array.from(tagSet).sort();
  }

  /**
   * 导出模板
   */
  exportTemplates(ids?: string[]): string {
    let templates = Array.from(this.templates.values());
    
    if (ids && ids.length > 0) {
      templates = templates.filter(t => ids.includes(t.id));
    }

    // 导出时排除内置模板
    const customTemplates = templates.filter(t => !this.isBuiltinTemplate(t));

    return JSON.stringify({
      version: '1.0',
      exportedAt: new Date().toISOString(),
      templates: customTemplates,
    }, null, 2);
  }

  /**
   * 导入模板
   */
  importTemplates(json: string): { success: number; failed: number; errors: string[] } {
    try {
      const data = JSON.parse(json);
      const result = { success: 0, failed: 0, errors: [] as string[] };

      if (!data.templates || !Array.isArray(data.templates)) {
        result.errors.push('无效的模板文件格式');
        return result;
      }

      for (const template of data.templates) {
        try {
          // 验证必填字段
          if (!template.name || !template.sql || !template.category) {
            result.errors.push(`模板 "${template.name || '未知'}" 缺少必填字段`);
            result.failed++;
            continue;
          }

          // 生成新 ID 避免冲突
          const id = this.generateId(template.name);
          const now = new Date().toISOString();

          const newTemplate: QueryTemplate = {
            ...template,
            id,
            tags: template.tags || [],
            variables: template.variables || [],
            databaseType: template.databaseType || 'all',
            description: template.description || '',
            createdAt: now,
            updatedAt: now,
            usageCount: 0,
          };

          this.templates.set(id, newTemplate);
          result.success++;
        } catch (error) {
          result.errors.push(`导入模板 "${template.name || '未知'}" 失败：${error}`);
          result.failed++;
        }
      }

      return result;
    } catch (error) {
      return {
        success: 0,
        failed: 0,
        errors: [`JSON 解析失败：${error}`],
      };
    }
  }

  /**
   * 获取统计信息
   */
  getStats(): { total: number; builtin: number; custom: number; byCategory: Record<string, number> } {
    const templates = Array.from(this.templates.values());
    const builtin = templates.filter(t => this.isBuiltinTemplate(t)).length;
    const custom = templates.length - builtin;

    const byCategory: Record<string, number> = {};
    for (const template of templates) {
      byCategory[template.category] = (byCategory[template.category] || 0) + 1;
    }

    return {
      total: templates.length,
      builtin,
      custom,
      byCategory,
    };
  }

  /**
   * 生成 ID
   */
  private generateId(name: string): string {
    const base = name.toLowerCase().replace(/[^a-z0-9]+/g, '_');
    const timestamp = Date.now().toString(36);
    return `${base}_${timestamp}`;
  }

  /**
   * 判断是否是内置模板
   */
  private isBuiltinTemplate(template: QueryTemplate): boolean {
    return this.builtinTemplates.some(t => t.id === template.id);
  }

  /**
   * 格式化输出模板列表
   */
  formatTemplateList(templates: QueryTemplate[]): string {
    if (templates.length === 0) {
      return '暂无模板';
    }

    const lines: string[] = [];
    
    for (const template of templates) {
      const icon = this.getCategoryIcon(template.category);
      lines.push(`${icon} **${template.name}** (${template.id})`);
      lines.push(`   ${template.description}`);
      lines.push(`   标签：${template.tags.join(', ')}`);
      lines.push(`   使用次数：${template.usageCount}`);
      if (template.variables && template.variables.length > 0) {
        lines.push(`   变量：${template.variables.map(v => v.name).join(', ')}`);
      }
      lines.push('');
    }

    return lines.join('\n');
  }

  /**
   * 获取分类图标
   */
  private getCategoryIcon(category: string): string {
    const icons: Record<string, string> = {
      crud: '📝',
      statistics: '📊',
      pagination: '📄',
      time: '⏰',
      join: '🔗',
      search: '🔍',
      basic: '📋',
    };
    return icons[category] || '📋';
  }

  /**
   * 格式化输出搜索结果
   */
  formatSearchResults(query: string, templates: QueryTemplate[]): string {
    const lines: string[] = [];
    lines.push(`🔍 搜索 "${query}" 找到 ${templates.length} 个模板:\n`);
    lines.push(this.formatTemplateList(templates));
    return lines.join('\n');
  }

  /**
   * 格式化输出统计信息
   */
  formatStats(): string {
    const stats = this.getStats();
    const categories = this.getCategories();

    const lines: string[] = [];
    lines.push('📊 模板统计:\n');
    lines.push(`总数：${stats.total}`);
    lines.push(`内置：${stats.builtin}`);
    lines.push(`自定义：${stats.custom}`);
    lines.push('\n按分类:');

    for (const cat of categories) {
      const count = stats.byCategory[cat.id] || 0;
      if (count > 0) {
        lines.push(`  ${cat.icon} ${cat.name}: ${count}`);
      }
    }

    return lines.join('\n');
  }
}
