/**
 * 数据库服务 API
 */

import api from '../api';

export interface Database {
  id: string;
  name: string;
  type: 'mysql' | 'postgresql' | 'sqlite';
  host?: string;
  port?: number;
  connected: boolean;
}

export interface ConnectionConfig {
  type: 'mysql' | 'postgresql' | 'sqlite';
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
}

export const databaseService = {
  /**
   * 获取数据库列表
   */
  async getDatabases(): Promise<Database[]> {
    const response = await api.getDatabases();
    return response.databases || [];
  },

  /**
   * 连接数据库
   */
  async connect(config: ConnectionConfig): Promise<Database> {
    const response = await api.connect(config);
    return response.database;
  },

  /**
   * 断开连接
   */
  async disconnect(databaseId: string): Promise<void> {
    await api.disconnect(databaseId);
  },

  /**
   * 测试连接
   */
  async testConnection(config: ConnectionConfig): Promise<boolean> {
    try {
      await api.connect(config);
      return true;
    } catch {
      return false;
    }
  },
};

/**
 * 查询服务 API
 */

export interface QueryResult {
  columns: string[];
  rows: any[][];
  rowCount: number;
  affectedRows?: number;
  duration: number;
}

export interface QueryHistory {
  id: string;
  sql: string;
  executedAt: string;
  duration: number;
  status: 'success' | 'error';
  error?: string;
}

export const queryService = {
  /**
   * 执行查询
   */
  async execute(sql: string, databaseId?: string): Promise<QueryResult> {
    const response = await api.executeQuery(sql, databaseId);
    return {
      columns: response.columns || [],
      rows: response.rows || [],
      rowCount: response.rowCount || 0,
      affectedRows: response.affectedRows,
      duration: response.duration || 0,
    };
  },

  /**
   * 获取历史记录
   */
  async getHistory(limit: number = 50): Promise<QueryHistory[]> {
    const response = await api.getHistory(limit);
    return response.history || [];
  },

  /**
   * 清除历史记录
   */
  async clearHistory(): Promise<void> {
    await api.post('/history/clear');
  },
};

/**
 * 书签服务 API
 */

export interface Bookmark {
  id: string;
  name: string;
  sql: string;
  description?: string;
  tags: string[];
  databaseType?: string;
  createdAt: string;
  updatedAt: string;
}

export const bookmarkService = {
  /**
   * 获取书签列表
   */
  async getBookmarks(): Promise<Bookmark[]> {
    const response = await api.getBookmarks();
    return response.bookmarks || [];
  },

  /**
   * 创建书签
   */
  async create(bookmark: Omit<Bookmark, 'id' | 'createdAt' | 'updatedAt'>): Promise<Bookmark> {
    const response = await api.createBookmark(bookmark);
    return response.bookmark;
  },

  /**
   * 更新书签
   */
  async update(id: string, bookmark: Partial<Bookmark>): Promise<Bookmark> {
    const response = await api.updateBookmark(id, bookmark);
    return response.bookmark;
  },

  /**
   * 删除书签
   */
  async delete(id: string): Promise<void> {
    await api.deleteBookmark(id);
  },

  /**
   * 搜索书签
   */
  async search(query: string): Promise<Bookmark[]> {
    const bookmarks = await this.getBookmarks();
    const lowerQuery = query.toLowerCase();
    return bookmarks.filter(
      (b) =>
        b.name.toLowerCase().includes(lowerQuery) ||
        b.sql.toLowerCase().includes(lowerQuery) ||
        b.tags.some((t) => t.toLowerCase().includes(lowerQuery))
    );
  },
};

/**
 * AI 服务 API
 */

export interface NL2SQLResult {
  sql: string;
  explanation: string;
  confidence: number;
  tables?: string[];
}

export interface SQLExplanation {
  summary: string;
  breakdown: string[];
  suggestions: string[];
}

export const aiService = {
  /**
   * 自然语言转 SQL
   */
  async nl2sql(query: string, tableSchema?: string): Promise<NL2SQLResult> {
    const response = await api.nl2sql(query, tableSchema);
    return response.result;
  },

  /**
   * 解释 SQL
   */
  async explain(sql: string): Promise<SQLExplanation> {
    const response = await api.explainSQL(sql);
    return response.result;
  },

  /**
   * 优化 SQL
   */
  async optimize(sql: string): Promise<{ optimized: string; suggestions: string[] }> {
    const response = await api.optimizeSQL(sql);
    return {
      optimized: response.optimized,
      suggestions: response.suggestions || [],
    };
  },
};
