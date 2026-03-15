/**
 * LRU 缓存实现
 * 用于元数据缓存、查询结果缓存等
 */

export class LRUCache<K, V> {
  private cache: Map<K, V>;
  private maxSize: number;

  constructor(maxSize: number = 100) {
    this.cache = new Map();
    this.maxSize = maxSize;
  }

  /**
   * 获取值
   */
  get(key: K): V | undefined {
    const value = this.cache.get(key);
    if (value !== undefined) {
      // 移动到最新 (delete + set 实现)
      this.cache.delete(key);
      this.cache.set(key, value);
    }
    return value;
  }

  /**
   * 设置值
   */
  put(key: K, value: V): void {
    // 如果已存在，先删除
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.maxSize) {
      // 删除最旧的 (Map 的第一个元素)
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
      }
    }
    
    this.cache.set(key, value);
  }

  /**
   * 删除值
   */
  delete(key: K): boolean {
    return this.cache.delete(key);
  }

  /**
   * 清空缓存
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * 获取缓存大小
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * 检查是否存在
   */
  has(key: K): boolean {
    return this.cache.has(key);
  }

  /**
   * 获取所有键
   */
  keys(): K[] {
    return Array.from(this.cache.keys());
  }

  /**
   * 获取所有值
   */
  values(): V[] {
    return Array.from(this.cache.values());
  }

  /**
   * 获取缓存统计
   */
  stats(): { size: number; maxSize: number; utilization: number } {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      utilization: this.cache.size / this.maxSize,
    };
  }
}

/**
 * 带 TTL 的缓存条目
 */
export interface CacheEntry<V> {
  value: V;
  expiresAt: number;
}

/**
 * 带 TTL 的 LRU 缓存
 */
export class TTLCache<K, V> {
  private cache: Map<K, CacheEntry<V>>;
  private maxSize: number;
  private defaultTTL: number; // 毫秒
  private cleanupInterval?: NodeJS.Timeout;

  constructor(maxSize: number = 100, defaultTTL: number = 60000) {
    this.cache = new Map();
    this.maxSize = maxSize;
    this.defaultTTL = defaultTTL;
    
    // 定期清理过期条目
    this.startCleanup();
  }

  private startCleanup(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, Math.min(this.defaultTTL / 2, 30000));
    
    // 确保进程退出时清理
    process.on('exit', () => this.stop());
  }

  private stop(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
  }

  /**
   * 清理过期条目
   */
  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (entry.expiresAt <= now) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * 获取值
   */
  get(key: K): V | undefined {
    const entry = this.cache.get(key);
    if (entry) {
      if (entry.expiresAt > Date.now()) {
        // 刷新过期时间
        entry.expiresAt = Date.now() + this.defaultTTL;
        return entry.value;
      } else {
        // 已过期，删除
        this.cache.delete(key);
      }
    }
    return undefined;
  }

  /**
   * 设置值
   */
  put(key: K, value: V, ttl?: number): void {
    const now = Date.now();
    
    // 如果已满，删除最旧的
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
      }
    }
    
    this.cache.set(key, {
      value,
      expiresAt: now + (ttl || this.defaultTTL),
    });
  }

  /**
   * 删除值
   */
  delete(key: K): boolean {
    return this.cache.delete(key);
  }

  /**
   * 清空缓存
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * 获取缓存大小 (不包括过期条目)
   */
  size(): number {
    const now = Date.now();
    let count = 0;
    for (const entry of this.cache.values()) {
      if (entry.expiresAt > now) {
        count++;
      }
    }
    return count;
  }

  /**
   * 检查是否存在 (且未过期)
   */
  has(key: K): boolean {
    const entry = this.cache.get(key);
    return entry !== undefined && entry.expiresAt > Date.now();
  }

  /**
   * 获取缓存统计
   */
  stats(): { size: number; maxSize: number; utilization: number } {
    return {
      size: this.size(),
      maxSize: this.maxSize,
      utilization: this.size() / this.maxSize,
    };
  }

  /**
   * 销毁缓存
   */
  destroy(): void {
    this.stop();
    this.clear();
  }
}
