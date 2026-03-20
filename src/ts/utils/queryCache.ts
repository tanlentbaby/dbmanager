/**
 * 查询缓存管理器
 * v0.8.0 Phase 1 - 查询缓存优化
 * 
 * 功能:
 * - SQL 查询结果缓存
 * - 智能缓存键生成
 * - 表变更失效
 * - 缓存预热
 * - 命中率监控
 */

import { LRUCache } from './lruCache.js';

export interface QueryResult {
  columns: string[];
  rows: any[];
  rowCount: number;
}

export interface CachedQuery {
  sql: string;
  result: QueryResult;
  cachedAt: number;
  hits: number;
  database?: string;
  tables?: string[];
}

export interface QueryCacheConfig {
  maxSize?: number;
  defaultTTL?: number;
  enabled?: boolean;
}

export class QueryCacheManager {
  private cache: LRUCache<CachedQuery>;
  private enabled: boolean;
  private tableVersions: Map<string, number>; // 表版本用于失效

  constructor(config: QueryCacheConfig = {}) {
    this.cache = new LRUCache({
      maxSize: config.maxSize || 500,
      defaultTTL: config.defaultTTL || 5 * 60 * 1000, // 5 分钟
      maxMemoryMB: 50,
    });
    this.enabled = config.enabled !== false;
    this.tableVersions = new Map();
  }

  /**
   * 生成缓存键
   */
  generateCacheKey(sql: string, database?: string, params?: any[]): string {
    const normalized = sql.trim().toLowerCase().replace(/\s+/g, ' ');
    const paramHash = params ? JSON.stringify(params) : '';
    const dbPrefix = database ? `${database}:` : '';
    return `query:${dbPrefix}${this.hash(normalized + paramHash)}`;
  }

  /**
   * 获取缓存的查询结果
   */
  get(sql: string, database?: string, params?: any[]): QueryResult | undefined {
    if (!this.enabled) return undefined;

    const key = this.generateCacheKey(sql, database, params);
    const cached = this.cache.get(key);

    if (cached) {
      cached.hits++;
      return cached.result;
    }

    return undefined;
  }

  /**
   * 缓存查询结果
   */
  set(
    sql: string,
    result: QueryResult,
    database?: string,
    params?: any[],
    ttl?: number
  ): void {
    if (!this.enabled) return;

    const key = this.generateCacheKey(sql, database, params);
    const tables = this.extractTables(sql);

    const cached: CachedQuery = {
      sql,
      result,
      cachedAt: Date.now(),
      hits: 0,
      database,
      tables,
    };

    this.cache.set(key, cached, ttl);

    // 更新表版本
    if (tables) {
      for (const table of tables) {
        const version = this.tableVersions.get(table) || 0;
        this.tableVersions.set(table, version + 1);
      }
    }
  }

  /**
   * 使表相关的缓存失效
   */
  invalidateTable(table: string): number {
    let invalidated = 0;
    const entries = this.cache.entries();

    for (const { key, entry } of entries) {
      const cachedQuery = entry.value;
      if (cachedQuery.tables?.includes(table)) {
        this.cache.delete(key);
        invalidated++;
      }
    }

    // 更新表版本
    const version = this.tableVersions.get(table) || 0;
    this.tableVersions.set(table, version + 1);

    return invalidated;
  }

  /**
   * 使数据库相关的所有缓存失效
   */
  invalidateDatabase(database: string): number {
    let invalidated = 0;
    const entries = this.cache.entries();

    for (const { key, entry } of entries) {
      const cachedQuery = entry.value;
      if (cachedQuery.database === database) {
        this.cache.delete(key);
        invalidated++;
      }
    }

    return invalidated;
  }

  /**
   * 清空所有缓存
   */
  clear(): void {
    this.cache.clear();
    this.tableVersions.clear();
  }

  /**
   * 预热缓存
   */
  warmup(queries: Array<{ sql: string; result: QueryResult; database?: string; ttl?: number }>): void {
    const entries = queries.map(q => ({
      key: this.generateCacheKey(q.sql, q.database),
      value: {
        sql: q.sql,
        result: q.result,
        cachedAt: Date.now(),
        hits: 0,
        database: q.database,
        tables: this.extractTables(q.sql),
      } as CachedQuery,
      ttl: q.ttl,
    }));

    this.cache.warmup(entries);
  }

  /**
   * 获取缓存统计
   */
  getStats() {
    const cacheStats = this.cache.getStats();
    const hotEntries = this.cache.getHotEntries(5);
    const coldEntries = this.cache.getColdEntries(5);

    return {
      ...cacheStats,
      enabled: this.enabled,
      tableCount: this.tableVersions.size,
      hotQueries: hotEntries.map(e => e.key),
      coldQueries: coldEntries.map(e => e.key),
    };
  }

  /**
   * 启用/禁用缓存
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  /**
   * 是否启用
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * 清理过期条目
   */
  cleanup(): number {
    return this.cache.cleanup();
  }

  /**
   * 格式化输出统计
   */
  formatStats(): string {
    const stats = this.getStats();
    const lines: string[] = [];

    lines.push('📊 查询缓存统计:');
    lines.push(`  状态：${stats.enabled ? '✅ 启用' : '❌ 禁用'}`);
    lines.push(`  大小：${stats.size} / ${stats.maxSize}`);
    lines.push(`  命中率：${stats.hitRate}%`);
    lines.push(`  内存：${stats.memoryUsage.toFixed(2)} MB`);
    lines.push(`  表追踪：${stats.tableCount} 个`);

    if (stats.hotQueries.length > 0) {
      lines.push('\n🔥 热门查询:');
      stats.hotQueries.forEach((key, i) => {
        lines.push(`  ${i + 1}. ${key.substring(0, 50)}...`);
      });
    }

    return lines.join('\n');
  }

  /**
   * 从 SQL 中提取表名
   */
  private extractTables(sql: string): string[] {
    const tables: string[] = [];
    const normalized = sql.toUpperCase();

    // FROM 子句
    const fromMatches = normalized.match(/FROM\s+([^\s,(]+)/g);
    if (fromMatches) {
      fromMatches.forEach(match => {
        const table = match.split(/\s+/)[1];
        if (table && !['SELECT', 'WHERE', 'JOIN'].includes(table)) {
          tables.push(table.toLowerCase());
        }
      });
    }

    // JOIN 子句
    const joinMatches = normalized.match(/JOIN\s+([^\s,]+)/g);
    if (joinMatches) {
      joinMatches.forEach(match => {
        const table = match.split(/\s+/)[1];
        if (table) {
          tables.push(table.toLowerCase());
        }
      });
    }

    // INSERT INTO
    const insertMatches = normalized.match(/INSERT\s+INTO\s+([^\s(]+)/g);
    if (insertMatches) {
      insertMatches.forEach(match => {
        const table = match.split(/\s+/)[2];
        if (table) {
          tables.push(table.toLowerCase());
        }
      });
    }

    // UPDATE
    const updateMatches = normalized.match(/UPDATE\s+([^\s,]+)/g);
    if (updateMatches) {
      updateMatches.forEach(match => {
        const table = match.split(/\s+/)[1];
        if (table && table !== 'SET') {
          tables.push(table.toLowerCase());
        }
      });
    }

    return [...new Set(tables)];
  }

  /**
   * 简单哈希函数
   */
  private hash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }
}

export default QueryCacheManager;
