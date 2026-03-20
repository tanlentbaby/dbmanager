/**
 * 本地存储服务
 * v1.0.0 Phase 1 - 数据持久化
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt?: number;
}

export const storageService = {
  /**
   * 设置数据
   */
  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    const entry: CacheEntry<T> = {
      data: value,
      timestamp: Date.now(),
      expiresAt: ttl ? Date.now() + ttl : undefined,
    };
    await AsyncStorage.setItem(key, JSON.stringify(entry));
  },

  /**
   * 获取数据
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const data = await AsyncStorage.getItem(key);
      if (!data) return null;

      const entry = JSON.parse(data) as CacheEntry<T>;

      // 检查是否过期
      if (entry.expiresAt && Date.now() > entry.expiresAt) {
        await AsyncStorage.removeItem(key);
        return null;
      }

      return entry.data;
    } catch {
      return null;
    }
  },

  /**
   * 删除数据
   */
  async remove(key: string): Promise<void> {
    await AsyncStorage.removeItem(key);
  },

  /**
   * 清空所有数据
   */
  async clear(): Promise<void> {
    await AsyncStorage.clear();
  },

  /**
   * 获取所有键
   */
  async keys(): Promise<string[]> {
    return await AsyncStorage.getAllKeys();
  },

  /**
   * 批量设置
   */
  async setMany(entries: Array<{ key: string; value: any; ttl?: number }>): Promise<void> {
    const items = entries.map((entry) => [
      entry.key,
      JSON.stringify({
        data: entry.value,
        timestamp: Date.now(),
        expiresAt: entry.ttl ? Date.now() + entry.ttl : undefined,
      }),
    ]);
    await AsyncStorage.multiSet(items);
  },

  /**
   * 批量获取
   */
  async getMany<T>(keys: string[]): Promise<Record<string, T>> {
    const result: Record<string, T> = {};
    const values = await AsyncStorage.multiGet(keys);

    for (const [key, value] of values) {
      if (value) {
        try {
          const entry = JSON.parse(value) as CacheEntry<T>;
          if (!entry.expiresAt || Date.now() <= entry.expiresAt) {
            result[key] = entry.data;
          }
        } catch {
          // 忽略解析错误
        }
      }
    }

    return result;
  },

  /**
   * 检查键是否存在
   */
  async has(key: string): Promise<boolean> {
    const value = await AsyncStorage.getItem(key);
    if (!value) return false;

    try {
      const entry = JSON.parse(value) as CacheEntry<any>;
      if (entry.expiresAt && Date.now() > entry.expiresAt) {
        await AsyncStorage.removeItem(key);
        return false;
      }
      return true;
    } catch {
      return false;
    }
  },

  /**
   * 获取存储大小 (估算)
   */
  async getSize(): Promise<number> {
    const keys = await this.keys();
    const values = await AsyncStorage.multiGet(keys);
    const size = values.reduce((acc, [, value]) => acc + (value?.length || 0), 0);
    return size; // bytes
  },

  /**
   * 清理过期数据
   */
  async cleanup(): Promise<number> {
    const keys = await this.keys();
    let cleaned = 0;

    for (const key of keys) {
      const value = await AsyncStorage.getItem(key);
      if (value) {
        try {
          const entry = JSON.parse(value) as CacheEntry<any>;
          if (entry.expiresAt && Date.now() > entry.expiresAt) {
            await AsyncStorage.removeItem(key);
            cleaned++;
          }
        } catch {
          // 忽略解析错误
        }
      }
    }

    return cleaned;
  },
};

/**
 * 查询缓存专用服务
 */

export interface QueryCache {
  sql: string;
  result: any;
  timestamp: number;
}

export const queryCacheService = {
  cacheKey(sql: string): string {
    return `@dbmanager:query:${btoa(sql)}`;
  },

  async set(sql: string, result: any, ttl: number = 5 * 60 * 1000): Promise<void> {
    await storageService.set(this.cacheKey(sql), { sql, result, timestamp: Date.now() }, ttl);
  },

  async get(sql: string): Promise<any | null> {
    const entry = await storageService.get<QueryCache>(this.cacheKey(sql));
    return entry?.result || null;
  },

  async invalidate(sql: string): Promise<void> {
    await storageService.remove(this.cacheKey(sql));
  },

  async clear(): Promise<void> {
    const keys = await storageService.keys();
    const queryKeys = keys.filter((k) => k.startsWith('@dbmanager:query:'));
    await AsyncStorage.multiRemove(queryKeys);
  },
};

/**
 * 书签缓存服务
 */

export const bookmarkCacheService = {
  key: '@dbmanager:bookmarks',

  async set(bookmarks: any[]): Promise<void> {
    await storageService.set(this.key, bookmarks);
  },

  async get(): Promise<any[] | null> {
    return await storageService.get<any[]>(this.key);
  },

  async clear(): Promise<void> {
    await storageService.remove(this.key);
  },
};
