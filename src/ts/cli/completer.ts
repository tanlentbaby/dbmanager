/**
 * 智能自动补全引擎
 * 支持命令、表名、列名、关键字补全
 */

import { ConnectionManager } from '../database/connection.js';
import { ConfigManager } from '../config/manager.js';

export interface CompletionItem {
  label: string;
  type: 'command' | 'keyword' | 'table' | 'column' | 'function' | 'database';
  description?: string;
  detail?: string;
}

export interface CompletionContext {
  input: string;
  cursorPosition: number;
  previousToken: string;
  currentToken: string;
  isInQuote: boolean;
  quoteChar: string | null;
}

export class CompletionEngine {
  private configManager: ConfigManager;
  private connectionManager: ConnectionManager;
  
  // 元数据缓存
  private tableCache: Map<string, string[]> = new Map();
  private columnCache: Map<string, string[]> = new Map();
  private lastCacheUpdate: number = 0;
  private cacheTTL: number = 60000; // 1 分钟

  // SQL 关键字
  private readonly keywords = [
    'SELECT', 'FROM', 'WHERE', 'AND', 'OR', 'NOT', 'IN', 'IS', 'NULL',
    'LIKE', 'BETWEEN', 'EXISTS', 'CASE', 'WHEN', 'THEN', 'ELSE', 'END',
    'JOIN', 'INNER', 'LEFT', 'RIGHT', 'OUTER', 'ON', 'AS',
    'GROUP', 'BY', 'HAVING', 'ORDER', 'ASC', 'DESC', 'LIMIT', 'OFFSET',
    'UNION', 'ALL', 'INTERSECT', 'EXCEPT',
    'INSERT', 'INTO', 'VALUES', 'UPDATE', 'SET', 'DELETE',
    'CREATE', 'DROP', 'ALTER', 'TABLE', 'INDEX', 'VIEW', 'TRIGGER',
    'DATABASE', 'SCHEMA', 'PRIMARY', 'KEY', 'FOREIGN', 'REFERENCES',
    'UNIQUE', 'CHECK', 'DEFAULT', 'CONSTRAINT', 'ADD', 'MODIFY',
    'CHANGE', 'RENAME', 'COLUMN', 'IF', 'USE', 'SHOW', 'DESCRIBE',
    'EXPLAIN', 'ANALYZE', 'TRUE', 'FALSE', 'DISTINCT',
    'WITH', 'RECURSIVE', 'TEMP', 'TEMPORARY',
    'TRANSACTION', 'BEGIN', 'COMMIT', 'ROLLBACK',
    'INDEXED', 'CROSS', 'NATURAL', 'USING', 'NULLS', 'FIRST', 'AFTER',
  ];

  // SQL 函数
  private readonly functions = [
    'COUNT', 'SUM', 'AVG', 'MIN', 'MAX', 'ABS', 'ROUND', 'CEIL', 'FLOOR',
    'LENGTH', 'TRIM', 'UPPER', 'LOWER', 'SUBSTR', 'REPLACE', 'CONCAT',
    'NOW', 'CURRENT_DATE', 'CURRENT_TIME', 'CURRENT_TIMESTAMP',
    'COALESCE', 'NULLIF', 'IFNULL', 'CAST', 'CONVERT',
    'DATE', 'DATETIME', 'TIME', 'YEAR', 'MONTH', 'DAY', 'HOUR', 'MINUTE', 'SECOND',
    'GROUP_CONCAT', 'JSON_EXTRACT', 'JSON_OBJECT', 'JSON_ARRAY',
  ];

  constructor(configManager: ConfigManager, connectionManager: ConnectionManager) {
    this.configManager = configManager;
    this.connectionManager = connectionManager;
  }

  /**
   * 解析输入，获取补全上下文
   */
  parseContext(input: string, cursorPosition: number): CompletionContext {
    const textBeforeCursor = input.substring(0, cursorPosition);
    
    // 检测是否在引号内
    const singleQuotes = (textBeforeCursor.match(/'/g) || []).length;
    const doubleQuotes = (textBeforeCursor.match(/"/g) || []).length;
    const isInQuote = (singleQuotes % 2 === 1) || (doubleQuotes % 2 === 1);
    const quoteChar = singleQuotes % 2 === 1 ? "'" : doubleQuotes % 2 === 1 ? '"' : null;

    // 分割 token
    const tokens = textBeforeCursor.trim().split(/\s+/);
    const currentToken = tokens[tokens.length - 1] || '';
    const previousToken = tokens[tokens.length - 2] || '';

    return {
      input,
      cursorPosition,
      previousToken: previousToken.toUpperCase(),
      currentToken,
      isInQuote,
      quoteChar,
    };
  }

  /**
   * 获取补全建议
   */
  async getCompletions(context: CompletionContext): Promise<CompletionItem[]> {
    // 在引号内不提供补全
    if (context.isInQuote) {
      return [];
    }

    const items: CompletionItem[] = [];

    // 命令补全（以 / 开头）
    if (context.currentToken.startsWith('/')) {
      return this.getCommandCompletions(context.currentToken);
    }

    // 根据上下文判断补全类型
    if (this.isTableContext(context.previousToken)) {
      // 表名补全（FROM, JOIN 后）
      const tables = await this.getTables();
      items.push(...tables.map(t => this.createTableItem(t)));
    } else if (this.isColumnContext(context.previousToken, context.input)) {
      // 列名补全（SELECT, WHERE 后）
      const columns = await this.getColumns();
      items.push(...columns.map(c => this.createColumnItem(c)));
    } else if (this.isFunctionContext(context.input)) {
      // 函数补全
      items.push(...this.functions.map(f => this.createFunctionItem(f)));
    }

    // 关键字补全（始终提供）
    const keywordMatches = this.fuzzyMatch(context.currentToken, this.keywords);
    items.push(...keywordMatches.map(k => this.createKeywordItem(k)));

    // 函数补全
    const functionMatches = this.fuzzyMatch(context.currentToken, this.functions);
    items.push(...functionMatches.map(f => this.createFunctionItem(f)));

    // 去重并排序
    return this.rankCompletions(items, context.currentToken);
  }

  /**
   * 判断是否是表名上下文
   */
  private isTableContext(previousToken: string): boolean {
    return ['FROM', 'JOIN', 'INNER', 'LEFT', 'RIGHT', 'OUTER', 'INTO', 'TABLE', 'UPDATE'].includes(previousToken);
  }

  /**
   * 判断是否是列名上下文
   */
  private isColumnContext(previousToken: string, input: string): boolean {
    const selectContext = ['SELECT', 'WHERE', 'AND', 'OR', 'ON'].includes(previousToken);
    const afterDot = input.trimEnd().endsWith('.');
    return selectContext || afterDot;
  }

  /**
   * 判断是否是函数上下文
   */
  private isFunctionContext(input: string): boolean {
    // 检测是否输入了函数名后跟左括号
    return /\b[A-Za-z_][A-Za-z0-9_]*\s*\($/.test(input);
  }

  /**
   * 获取命令补全
   */
  private getCommandCompletions(currentToken: string): CompletionItem[] {
    const commands = [
      { name: '/config', desc: '配置管理' },
      { name: '/connect', desc: '连接数据库' },
      { name: '/disconnect', desc: '断开连接' },
      { name: '/list', desc: '列出所有表' },
      { name: '/desc', desc: '查看表结构' },
      { name: '/run', desc: '执行 SQL 文件' },
      { name: '/batch', desc: '批量执行' },
      { name: '/explain', desc: '查询计划' },
      { name: '/use', desc: '切换数据库' },
      { name: '/export', desc: '导出结果' },
      { name: '/history', desc: '查看历史' },
      { name: '/format', desc: '设置格式' },
      { name: '/help', desc: '帮助信息' },
      { name: '/quit', desc: '退出' },
    ];

    const matches = this.fuzzyMatch(currentToken, commands.map(c => c.name));
    return matches.map(name => {
      const cmd = commands.find(c => c.name === name)!;
      return {
        label: name,
        type: 'command',
        description: cmd.desc,
      };
    });
  }

  /**
   * 获取表列表（带缓存）
   */
  private async getTables(): Promise<string[]> {
    if (!this.connectionManager.isConnected) {
      return [];
    }

    // 检查缓存
    const cacheKey = this.connectionManager.currentInstanceName || 'default';
    const cached = this.tableCache.get(cacheKey);
    const now = Date.now();

    if (cached && now - this.lastCacheUpdate < this.cacheTTL) {
      return cached;
    }

    try {
      const tables = await this.connectionManager.getTables();
      this.tableCache.set(cacheKey, tables);
      this.lastCacheUpdate = now;
      return tables;
    } catch (error) {
      return [];
    }
  }

  /**
   * 获取列列表（带缓存）
   */
  private async getColumns(): Promise<string[]> {
    if (!this.connectionManager.isConnected) {
      return [];
    }

    // 简化实现：返回常用列名
    // TODO: 实际应该根据表名获取列
    const commonColumns = ['id', 'name', 'email', 'created_at', 'updated_at', 'status', 'type'];
    return commonColumns;
  }

  /**
   * 模糊匹配
   */
  private fuzzyMatch(prefix: string, candidates: string[]): string[] {
    const lowerPrefix = prefix.toLowerCase();
    return candidates
      .filter(c => c.toLowerCase().startsWith(lowerPrefix))
      .sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
  }

  /**
   * 创建补全项
   */
  private createKeywordItem(keyword: string): CompletionItem {
    return {
      label: keyword,
      type: 'keyword',
      description: 'SQL 关键字',
    };
  }

  private createFunctionItem(func: string): CompletionItem {
    return {
      label: func,
      type: 'function',
      description: 'SQL 函数',
    };
  }

  private createTableItem(table: string): CompletionItem {
    return {
      label: table,
      type: 'table',
      description: '数据表',
    };
  }

  private createColumnItem(column: string): CompletionItem {
    return {
      label: column,
      type: 'column',
      description: '列名',
    };
  }

  /**
   * 排序补全项（常用优先）
   */
  private rankCompletions(items: CompletionItem[], prefix: string): CompletionItem[] {
    const lowerPrefix = prefix.toLowerCase();
    
    return items.sort((a, b) => {
      // 精确匹配优先
      const aExact = a.label.toLowerCase() === lowerPrefix;
      const bExact = b.label.toLowerCase() === lowerPrefix;
      if (aExact && !bExact) return -1;
      if (bExact && !aExact) return 1;

      // 类型优先级：command > table > column > keyword > function
      const typePriority: Record<string, number> = {
        command: 1,
        table: 2,
        column: 3,
        keyword: 4,
        function: 5,
        database: 6,
      };
      const aPriority = typePriority[a.type] || 99;
      const bPriority = typePriority[b.type] || 99;
      
      if (aPriority !== bPriority) {
        return aPriority - bPriority;
      }

      // 按字母排序
      return a.label.localeCompare(b.label);
    });
  }

  /**
   * 清除缓存
   */
  clearCache(): void {
    this.tableCache.clear();
    this.columnCache.clear();
    this.lastCacheUpdate = 0;
  }

  /**
   * 获取缓存状态
   */
  getCacheStatus(): { size: number; age: number } {
    return {
      size: this.tableCache.size,
      age: Date.now() - this.lastCacheUpdate,
    };
  }
}
