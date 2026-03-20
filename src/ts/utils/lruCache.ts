/**
 * 增强型 LRU 缓存管理器
 * v0.8.0 Phase 1 - 性能优化
 * 
 * 功能:
 * - LRU 缓存淘汰策略
 * - TTL 过期时间
 * - 缓存命中率统计
 * - 内存限制
 * - 缓存预热
 */

export interface CacheEntry<T> {
  value: T;
  timestamp: number;
  hits: number;
  lastAccessed: number;
  ttl?: number; // 过期时间 (毫秒)
}

export interface CacheStats {
  size: number;
  maxSize: number;
  hits: number;
  misses: number;
  hitRate: number;
  evictions: number;
  memoryUsage: number;
}

export interface CacheConfig {
  maxSize: number;        // 最大条目数
  defaultTTL?: number;    // 默认过期时间 (毫秒)
  maxMemoryMB?: number;   // 最大内存占用 (MB)
}

export class LRUCache<T = any> {
  private cache: Map<string, CacheEntry<T>>;
  private config: CacheConfig;
  private stats: {
    hits: number;
    misses: number;
    evictions: number;
  };

  constructor(config: CacheConfig) {
    this.cache = new Map();
    this.config = {
      maxSize: config.maxSize || 1000,
      defaultTTL: config.defaultTTL || 5 * 60 * 1000, // 5 分钟
      maxMemoryMB: config.maxMemoryMB || 50,
    };
    this.stats = {
      hits: 0,
      misses: 0,
      evictions: 0,
    };
  }

  /**
   * 获取缓存
   */
  get(key: string): T | undefined {
    const entry = this.cache.get(key);

    if (!entry) {
      this.stats.misses++;
      return undefined;
    }

    // 检查是否过期
    if (this.isExpired(entry)) {
      this.cache.delete(key);
      this.stats.misses++;
      return undefined;
    }

    // 更新访问时间和命中次数
    entry.hits++;
    entry.lastAccessed = Date.now();
    this.stats.hits++;

    return entry.value;
  }

  /**
   * 设置缓存
   */
  set(key: string, value: T, ttl?: number): void {
    // 如果缓存已满，淘汰最久未使用的条目
    if (this.cache.size >= this.config.maxSize && !this.cache.has(key)) {
      this.evictLRU();
    }

    const entry: CacheEntry<T> = {
      value,
      timestamp: Date.now(),
      hits: 0,
      lastAccessed: Date.now(),
      ttl: ttl || this.config.defaultTTL,
    };

    this.cache.set(key, entry);

    // 检查内存限制
    if (this.config.maxMemoryMB) {
      this.checkMemoryLimit();
    }
  }

  /**
   * 删除缓存
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * 清空缓存
   */
  clear(): void {
    this.cache.clear();
    this.stats = { hits: 0, misses: 0, evictions: 0 };
  }

  /**
   * 获取缓存大小
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * 检查键是否存在 (不更新访问时间)
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;
    if (this.isExpired(entry)) {
      this.cache.delete(key);
      return false;
    }
    return true;
  }

  /**
   * 获取缓存统计
   */
  getStats(): CacheStats {
    const total = this.stats.hits + this.stats.misses;
    const hitRate = total > 0 ? (this.stats.hits / total) * 100 : 0;
    const memoryUsage = this.estimateMemoryUsage();

    return {
      size: this.cache.size,
      maxSize: this.config.maxSize,
      hits: this.stats.hits,
      misses: this.stats.misses,
      hitRate: Math.round(hitRate * 100) / 100,
      evictions: this.stats.evictions,
      memoryUsage,
    };
  }

  /**
   * 获取所有键
   */
  keys(): string[] {
    return Array.from(this.cache.keys());
  }

  /**
   * 获取所有条目
   */
  entries(): Array<{ key: string; value: T; entry: CacheEntry<T> }> {
    return Array.from(this.cache.entries()).map(([key, entry]) => ({
      key,
      value: entry.value,
      entry,
    }));
  }

  /**
   * 预热缓存 (批量加载)
   */
  warmup(entries: Array<{ key: string; value: T; ttl?: number }>): void {
    for (const { key, value, ttl } of entries) {
      this.set(key, value, ttl);
    }
  }

  /**
   * 清理过期条目
   */
  cleanup(): number {
    let cleaned = 0;
    const now = Date.now();

    for (const [key, entry] of this.cache.entries()) {
      if (this.isExpired(entry)) {
        this.cache.delete(key);
        cleaned++;
      }
    }

    return cleaned;
  }

  /**
   * 获取最常访问的条目 (用于分析)
   */
  getHotEntries(limit: number = 10): Array<{ key: string; hits: number }> {
    return this.entries()
      .map(({ key, entry }) => ({ key, hits: entry.hits }))
      .sort((a, b) => b.hits - a.hits)
      .slice(0, limit);
  }

  /**
   * 获取最少使用的条目 (用于分析)
   */
  getColdEntries(limit: number = 10): Array<{ key: string; lastAccessed: number }> {
    return this.entries()
      .map(({ key, entry }) => ({ key, lastAccessed: entry.lastAccessed }))
      .sort((a, b) => a.lastAccessed - b.lastAccessed)
      .slice(0, limit);
  }

  /**
   * 检查是否过期
   */
  private isExpired(entry: CacheEntry<T>): boolean {
    if (!entry.ttl) return false;
    return Date.now() - entry.lastAccessed > entry.ttl;
  }

  /**
   * 淘汰最久未使用的条目
   */
  private evictLRU(): void {
    let oldestKey: string | undefined;
    let oldestTime = Infinity;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.lastAccessed < oldestTime) {
        oldestTime = entry.lastAccessed;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
      this.stats.evictions++;
    }
  }

  /**
   * 检查内存限制
   */
  private checkMemoryLimit(): void {
    const memoryMB = this.estimateMemoryUsage();
    
    while (memoryMB > this.config.maxMemoryMB! && this.cache.size > 0) {
      this.evictLRU();
    }
  }

  /**
   * 估算内存使用 (MB)
   */
  private estimateMemoryUsage(): number {
    // 简化估算：每个条目平均 1KB
    const estimatedBytes = this.cache.size * 1024;
    return estimatedBytes / (1024 * 1024);
  }

  /**
   * 格式化输出统计信息
   */
  formatStats(): string {
    const stats = this.getStats();
    const lines: string[] = [];

    lines.push('📊 缓存统计:');
    lines.push(`  大小：${stats.size} / ${stats.maxSize}`);
    lines.push(`  命中：${stats.hits}`);
    lines.push(`  未命中：${stats.misses}`);
    lines.push(`  命中率：${stats.hitRate}%`);
    lines.push(`  淘汰：${stats.evictions}`);
    lines.push(`  内存：${stats.memoryUsage.toFixed(2)} MB`);

    return lines.join('\n');
  }
}

export default LRUCache;
