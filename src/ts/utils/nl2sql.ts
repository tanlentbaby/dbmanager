/**
 * NL2SQL - 自然语言生成 SQL
 * v0.5.0 新功能 - 智能查询助手
 * 
 * 功能：
 * - 解析自然语言查询
 * - 生成 SQL 语句
 * - 支持简单到中等复杂度的查询
 * 
 * 注意：当前版本为规则引擎，v0.6.0 将集成 LLM
 */

export interface SchemaInfo {
  tableName: string;
  columns: ColumnInfo[];
  primaryKey?: string;
  foreignKeys?: ForeignKeyInfo[];
}

export interface ColumnInfo {
  name: string;
  type: string;
  nullable: boolean;
  defaultValue?: string;
}

export interface ForeignKeyInfo {
  column: string;
  referencesTable: string;
  referencesColumn: string;
}

export interface NLQuery {
  intent: 'select' | 'count' | 'insert' | 'update' | 'delete' | 'unknown';
  table?: string;
  columns?: string[];
  conditions?: Condition[];
  orderBy?: OrderBy[];
  limit?: number;
  groupBy?: string[];
  having?: Condition[];
  values?: Record<string, unknown>; // for INSERT/UPDATE
}

export interface Condition {
  column: string;
  operator: '=' | '!=' | '>' | '<' | '>=' | '<=' | 'LIKE' | 'IN' | 'IS' | 'BETWEEN';
  value: unknown;
  logicalOp?: 'AND' | 'OR';
}

export interface OrderBy {
  column: string;
  direction: 'ASC' | 'DESC';
}

export interface GenerationResult {
  success: boolean;
  sql?: string;
  confidence: number;
  explanation: string;
  warnings: string[];
}

/**
 * 关键词映射
 */
const KEYWORDS = {
  // 查询意图
  select: ['查询', '查找', '搜索', '显示', '列出', '查看', 'select', 'show', 'list', 'get'],
  count: ['统计', '计数', '多少个', '多少条', 'count', 'how many'],
  insert: ['添加', '插入', '创建', '新增', 'insert', 'add', 'create'],
  update: ['更新', '修改', '更改', 'update', 'modify', 'change'],
  delete: ['删除', '移除', 'delete', 'remove'],
  
  // 排序
  asc: ['升序', '从小到大', 'asc', 'ascending'],
  desc: ['降序', '从大到小', 'desc', 'descending'],
  
  // 条件
  where: ['其中', '满足', '条件是', 'where'],
  and: ['并且', '而且', '且', 'and'],
  or: ['或者', '或', 'or'],
  
  // 聚合
  groupBy: ['按...分组', '根据...分组', 'group by'],
  orderBy: ['按...排序', '根据...排序', '排序', 'order by'],
  limit: ['前', '限制', '条', 'limit', 'top'],
};

/**
 * 操作符映射
 */
const OPERATORS: Record<string, Condition['operator']> = {
  '=': '=',
  '等于': '=',
  '是': '=',
  '!=': '!=',
  '不等于': '!=',
  '>': '>',
  '大于': '>',
  '<': '<',
  '小于': '<',
  '>=': '>=',
  '大于等于': '>=',
  '<=': '<=',
  '小于等于': '<=',
  'like': 'LIKE',
  '包含': 'LIKE',
  'in': 'IN',
  '在...中': 'IN',
  'is null': 'IS',
  '为空': 'IS',
  'is not null': 'IS',
  '不为空': 'IS',
};

/**
 * NL2SQL 转换器（规则引擎版本）
 */
export class NL2SQLConverter {
  private schemas: Map<string, SchemaInfo> = new Map();

  /**
   * 注册表结构
   */
  registerSchema(schema: SchemaInfo): void {
    this.schemas.set(schema.tableName.toLowerCase(), schema);
  }

  /**
   * 清除所有表结构
   */
  clearSchemas(): void {
    this.schemas.clear();
  }

  /**
   * 转换自然语言为 SQL
   */
  convert(naturalLanguage: string): GenerationResult {
    const trimmedInput = naturalLanguage.trim();
    
    // 1. 检测查询意图
    const intent = this.detectIntent(trimmedInput);
    
    // 2. 提取表名
    const table = this.extractTable(trimmedInput);
    
    // 3. 构建查询对象
    const query: NLQuery = { intent };
    
    if (table) {
      query.table = table;
    }
    
    // 4. 注册 schema 中的列信息
    if (query.table) {
      const schema = this.schemas.get(query.table.toLowerCase());
      if (schema) {
        query.columns = schema.columns.map(c => c.name);
      }
    }
    
    // 5. 根据意图解析
    let sql: string;
    let explanation: string;
    const warnings: string[] = [];
    
    switch (intent) {
      case 'select':
      case 'count':
        sql = this.parseSelect(trimmedInput, query, warnings);
        explanation = this.generateExplanation(query);
        break;
      case 'insert':
        sql = this.parseInsert(trimmedInput, query, warnings);
        explanation = '生成 INSERT 语句';
        break;
      case 'update':
        sql = this.parseUpdate(trimmedInput, query, warnings);
        explanation = '生成 UPDATE 语句';
        break;
      case 'delete':
        sql = this.parseDelete(trimmedInput, query, warnings);
        explanation = '生成 DELETE 语句';
        break;
      default:
        return {
          success: false,
          confidence: 0,
          explanation: '无法识别查询意图，请尝试更明确的表达',
          warnings: [],
        };
    }
    
    // 6. 验证 SQL
    const isValid = this.validateSQL(sql);
    if (!isValid) {
      warnings.push('生成的 SQL 可能需要手动检查');
    }
    
    return {
      success: true,
      sql,
      confidence: this.calculateConfidence(query),
      explanation,
      warnings,
    };
  }

  /**
   * 检测查询意图
   */
  private detectIntent(input: string): NLQuery['intent'] {
    const lower = input.toLowerCase();
    
    // 按优先级检测：DELETE > UPDATE > INSERT > COUNT > SELECT
    // 避免"删除"被误判为包含"除"(SELECT 关键词)
    if (KEYWORDS.delete.some(k => lower.includes(k))) {
      return 'delete';
    }
    if (KEYWORDS.update.some(k => lower.includes(k))) {
      return 'update';
    }
    if (KEYWORDS.insert.some(k => lower.includes(k))) {
      return 'insert';
    }
    if (KEYWORDS.count.some(k => lower.includes(k))) {
      return 'count';
    }
    if (KEYWORDS.select.some(k => lower.includes(k))) {
      return 'select';
    }
    
    // 默认当作 SELECT
    return 'select';
  }

  /**
   * 提取表名
   */
  private extractTable(input: string): string | undefined {
    // 尝试从已注册的 schema 中匹配
    for (const [tableName, schema] of this.schemas) {
      // 匹配表名（中英文）
      if (input.toLowerCase().includes(tableName)) {
        return tableName;
      }
      // 匹配中文表名映射
      if (this.matchChineseTable(input, tableName)) {
        return tableName;
      }
    }
    
    // 尝试匹配常见的表名模式
    const tablePattern = /(用户 | 订单 | 产品 | 商品 | 客户 | 员工 | 部门 | 类别|category|categories|user|users|order|orders|product|products|customer|customers|employee|employees|department|departments|item|items)/i;
    const match = input.match(tablePattern);
    
    if (match) {
      const chineseToEnglish: Record<string, string> = {
        '用户': 'users',
        '订单': 'orders',
        '产品': 'products',
        '商品': 'products',
        '客户': 'customers',
        '员工': 'employees',
        '部门': 'departments',
        '类别': 'categories',
      };
      const matched = match[1];
      return chineseToEnglish[matched] || matched.toLowerCase();
    }
    
    return undefined;
  }

  /**
   * 匹配中文表名
   */
  private matchChineseTable(input: string, tableName: string): boolean {
    const chineseMap: Record<string, string[]> = {
      'users': ['用户'],
      'orders': ['订单'],
      'products': ['产品', '商品'],
      'customers': ['客户'],
      'employees': ['员工'],
      'departments': ['部门'],
      'categories': ['类别'],
    };
    
    const chineseNames = chineseMap[tableName] || [];
    return chineseNames.some(cn => input.includes(cn));
  }

  /**
   * 解析 SELECT 查询
   */
  private parseSelect(input: string, query: NLQuery, warnings: string[]): string {
    const parts: string[] = [];
    
    // SELECT 子句
    const columns = this.extractColumns(input, query);
    if (query.intent === 'count') {
      parts.push('SELECT COUNT(*)');
    } else if (columns.length > 0) {
      parts.push(`SELECT ${columns.join(', ')}`);
    } else {
      parts.push('SELECT *');
      warnings.push('未指定列，使用 SELECT *');
    }
    
    // FROM 子句
    if (query.table) {
      parts.push(`FROM ${query.table}`);
    } else {
      warnings.push('未指定表名');
    }
    
    // WHERE 子句
    const conditions = this.extractConditions(input);
    if (conditions.length > 0) {
      const whereClause = this.buildWhereClause(conditions);
      parts.push(whereClause);
    }
    
    // ORDER BY 子句
    const orderBy = this.extractOrderBy(input);
    if (orderBy.length > 0) {
      const orderClause = orderBy.map(o => `${o.column} ${o.direction}`).join(', ');
      parts.push(`ORDER BY ${orderClause}`);
    }
    
    // LIMIT 子句
    const limit = this.extractLimit(input);
    if (limit) {
      parts.push(`LIMIT ${limit}`);
    }
    
    return parts.join(' ');
  }

  /**
   * 解析 INSERT 查询
   */
  private parseInsert(input: string, query: NLQuery, warnings: string[]): string {
    // 简单实现：提取值和列
    warnings.push('INSERT 语句生成需要更详细的上下文，请指定列名和值');
    
    if (!query.table) {
      return 'INSERT INTO table_name VALUES (...)';
    }
    
    return `INSERT INTO ${query.table} VALUES (...)`;
  }

  /**
   * 解析 UPDATE 查询
   */
  private parseUpdate(input: string, query: NLQuery, warnings: string[]): string {
    warnings.push('UPDATE 语句生成需要指定更新的列和值');
    
    if (!query.table) {
      return 'UPDATE table_name SET column = value';
    }
    
    return `UPDATE ${query.table} SET column = value`;
  }

  /**
   * 解析 DELETE 查询
   */
  private parseDelete(input: string, query: NLQuery, warnings: string[]): string {
    const parts: string[] = [];
    
    parts.push('DELETE');
    
    if (query.table) {
      parts.push(`FROM ${query.table}`);
    }
    
    const conditions = this.extractConditions(input);
    if (conditions.length > 0) {
      const whereClause = this.buildWhereClause(conditions);
      parts.push(whereClause);
    } else {
      warnings.push('⚠️ DELETE 没有 WHERE 条件会删除所有数据！');
    }
    
    return parts.join(' ');
  }

  /**
   * 提取列名
   */
  private extractColumns(input: string, query: NLQuery): string[] {
    const columns: string[] = [];
    
    // 尝试从 schema 中匹配列
    if (query.table) {
      const schema = this.schemas.get(query.table.toLowerCase());
      if (schema) {
        for (const col of schema.columns) {
          if (input.toLowerCase().includes(col.name.toLowerCase())) {
            columns.push(col.name);
          }
        }
      }
    }
    
    return columns;
  }

  /**
   * 提取条件
   */
  private extractConditions(input: string): Condition[] {
    const conditions: Condition[] = [];
    
    // 查找 "年龄大于 25" 模式 - 提取列名
    const gtIndex = input.indexOf('大于');
    if (gtIndex > 0) {
      // 向前找列名（最多 10 个字符）
      const before = input.substring(Math.max(0, gtIndex - 10), gtIndex).trim();
      const after = input.substring(gtIndex + 2).trim();
      const numMatch = after.match(/^(\d+)/);
      // 提取最后一个词作为列名（支持中文，排除动词）
      const colMatch = before.match(/([^\s,]+)$/);
      if (numMatch && colMatch) {
        let column = colMatch[1];
        // 排除常见动词前缀
        if (column === '查找' || column === '查询' || column === '搜索') {
          // 尝试再往前找
          const before2 = before.substring(0, before.length - column.length).trim();
          const colMatch2 = before2.match(/([^\s,]+)$/);
          if (colMatch2) {
            column = colMatch2[1];
          }
        }
        conditions.push({
          column,
          operator: '>',
          value: parseInt(numMatch[1]),
          logicalOp: 'AND',
        });
      }
    }
    
    // 查找 "年龄小于 25" 模式
    const ltIndex = input.indexOf('小于');
    if (ltIndex > 0) {
      const before = input.substring(Math.max(0, ltIndex - 10), ltIndex).trim();
      const after = input.substring(ltIndex + 2).trim();
      const numMatch = after.match(/^(\d+)/);
      if (numMatch && before.length > 0) {
        conditions.push({
          column: before,
          operator: '<',
          value: parseInt(numMatch[1]),
          logicalOp: 'AND',
        });
      }
    }
    
    // 查找 "id 等于 1" 模式
    const eqIndex = input.indexOf('等于');
    if (eqIndex > 0) {
      const before = input.substring(Math.max(0, eqIndex - 20), eqIndex).trim();
      const after = input.substring(eqIndex + 2).trim();
      // 提取列名（最后一个词）
      const colMatch = before.match(/(\w+)$/);
      const numMatch = after.match(/^['"]?([^'"\s,]+)/);
      if (colMatch && numMatch) {
        conditions.push({
          column: colMatch[1],
          operator: '=',
          value: numMatch[1],
          logicalOp: 'AND',
        });
      }
    }
    
    return conditions;
  }

  /**
   * 构建 WHERE 子句
   */
  private buildWhereClause(conditions: Condition[]): string {
    if (conditions.length === 0) return '';
    
    const parts = conditions.map((cond, index) => {
      const value = typeof cond.value === 'string' ? `'${cond.value}'` : String(cond.value);
      const logicalOp = index > 0 ? (cond.logicalOp || 'AND') : '';
      return `${logicalOp} ${cond.column} ${cond.operator} ${value}`;
    });
    
    return `WHERE ${parts.join(' ')}`;
  }

  /**
   * 提取 ORDER BY
   */
  private extractOrderBy(input: string): OrderBy[] {
    const orderBy: OrderBy[] = [];
    
    // 检测排序关键词
    const hasAsc = input.includes('升序');
    const hasDesc = input.includes('降序');
    const direction = hasDesc ? 'DESC' : 'ASC';
    
    // 查找"按...排序"模式
    const startIndex = input.indexOf('按');
    const endIndex = input.indexOf('排序');
    
    if (startIndex >= 0 && endIndex > startIndex) {
      let column = input.substring(startIndex + 1, endIndex).trim();
      // 去掉"降序"/"升序"
      column = column.replace(/降序 | 升序/g, '').trim();
      
      if (column.length > 0) {
        orderBy.push({
          column,
          direction,
        });
      }
    }
    
    return orderBy;
  }

  /**
   * 提取 LIMIT
   */
  private extractLimit(input: string): number | undefined {
    // 匹配 "前 N 条" 或 "LIMIT N"
    const limitPattern = /(?:前 |limit)\s*(\d+)/i;
    const match = input.match(limitPattern);
    
    if (match) {
      return parseInt(match[1]);
    }
    
    return undefined;
  }

  /**
   * 生成解释
   */
  private generateExplanation(query: NLQuery): string {
    const parts: string[] = [];
    
    if (query.intent === 'count') {
      parts.push('统计');
    } else {
      parts.push('查询');
    }
    
    if (query.table) {
      parts.push(`${query.table}表`);
    }
    
    if (query.columns && query.columns.length > 0) {
      parts.push(`的${query.columns.join('、')}列`);
    }
    
    if (query.conditions && query.conditions.length > 0) {
      parts.push(`，条件：${query.conditions.length}个`);
    }
    
    if (query.orderBy && query.orderBy.length > 0) {
      parts.push(`，排序：${query.orderBy[0].column}`);
    }
    
    if (query.limit) {
      parts.push(`，限制${query.limit}条`);
    }
    
    return parts.join('');
  }

  /**
   * 计算置信度
   */
  private calculateConfidence(query: NLQuery): number {
    let confidence = 0.5;
    
    // 有表名 +0.2
    if (query.table) {
      confidence += 0.2;
    }
    
    // 有条件 +0.15
    if (query.conditions && query.conditions.length > 0) {
      confidence += 0.15;
    }
    
    // 有排序 +0.1
    if (query.orderBy && query.orderBy.length > 0) {
      confidence += 0.1;
    }
    
    // 有限制 +0.05
    if (query.limit) {
      confidence += 0.05;
    }
    
    return Math.min(confidence, 1.0);
  }

  /**
   * 验证 SQL
   */
  private validateSQL(sql: string): boolean {
    // 简单验证：检查基本语法
    const upperSql = sql.toUpperCase();
    
    // 必须有关键词
    const hasValidStart = 
      upperSql.startsWith('SELECT') ||
      upperSql.startsWith('INSERT') ||
      upperSql.startsWith('UPDATE') ||
      upperSql.startsWith('DELETE');
    
    if (!hasValidStart) {
      return false;
    }
    
    // 不能有明显的语法错误
    if (sql.includes('  ')) { // 多个连续空格
      return false;
    }
    
    return true;
  }
}

// 导出单例
export const nl2sqlConverter = new NL2SQLConverter();
