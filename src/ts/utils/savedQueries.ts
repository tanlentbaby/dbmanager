/**
 * 查询收藏管理
 */

import fs from 'fs/promises';
import path from 'path';
import os from 'os';

export interface SavedQuery {
  id: string;
  name: string;
  sql: string;
  description?: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  lastUsedAt?: string;
  useCount: number;
}

export class SavedQueryManager {
  private queries: Map<string, SavedQuery> = new Map();
  private storagePath: string;
  private loaded = false;

  constructor() {
    this.storagePath = path.join(os.homedir(), '.dbmanager', 'saved_queries.json');
  }

  /**
   * 加载收藏的查询
   */
  async load(): Promise<void> {
    try {
      const data = await fs.readFile(this.storagePath, 'utf-8');
      const queries = JSON.parse(data) as SavedQuery[];
      this.queries = new Map(queries.map(q => [q.id, q]));
      this.loaded = true;
    } catch (error) {
      // 文件不存在或解析错误，使用空集合
      this.queries = new Map();
      this.loaded = true;
    }
  }

  /**
   * 保存收藏的查询
   */
  async save(): Promise<void> {
    try {
      const dir = path.dirname(this.storagePath);
      await fs.mkdir(dir, { recursive: true });
      const data = JSON.stringify(Array.from(this.queries.values()), null, 2);
      await fs.writeFile(this.storagePath, data, 'utf-8');
    } catch (error) {
      console.error('保存收藏查询失败:', error);
    }
  }

  /**
   * 添加收藏
   */
  async add(
    name: string,
    sql: string,
    description?: string,
    tags: string[] = []
  ): Promise<SavedQuery> {
    await this.ensureLoaded();

    const id = this.generateId(name);
    const now = new Date().toISOString();

    const query: SavedQuery = {
      id,
      name,
      sql,
      description,
      tags,
      createdAt: now,
      updatedAt: now,
      useCount: 0,
    };

    this.queries.set(id, query);
    await this.save();
    return query;
  }

  /**
   * 删除收藏
   */
  async remove(idOrName: string): Promise<boolean> {
    await this.ensureLoaded();

    let id = idOrName;
    // 如果传入的是名称，查找对应的 ID
    if (!this.queries.has(id)) {
      const found = Array.from(this.queries.values()).find(
        q => q.name.toLowerCase() === idOrName.toLowerCase()
      );
      if (found) {
        id = found.id;
      } else {
        return false;
      }
    }

    const deleted = this.queries.delete(id);
    if (deleted) {
      await this.save();
    }
    return deleted;
  }

  /**
   * 获取收藏
   */
  async get(idOrName: string): Promise<SavedQuery | undefined> {
    await this.ensureLoaded();

    // 先尝试 ID
    if (this.queries.has(idOrName)) {
      return this.queries.get(idOrName);
    }

    // 再尝试名称
    return Array.from(this.queries.values()).find(
      q => q.name.toLowerCase() === idOrName.toLowerCase()
    );
  }

  /**
   * 列出所有收藏
   */
  async list(tag?: string): Promise<SavedQuery[]> {
    await this.ensureLoaded();

    let queries = Array.from(this.queries.values());

    // 按标签过滤
    if (tag) {
      queries = queries.filter(q => q.tags.includes(tag));
    }

    // 按使用次数排序
    queries.sort((a, b) => b.useCount - a.useCount);

    return queries;
  }

  /**
   * 使用收藏（增加使用计数）
   */
  async use(idOrName: string): Promise<SavedQuery | undefined> {
    const query = await this.get(idOrName);
    if (!query) return undefined;

    query.useCount++;
    query.lastUsedAt = new Date().toISOString();
    query.updatedAt = new Date().toISOString();

    await this.save();
    return query;
  }

  /**
   * 搜索收藏
   */
  async search(keyword: string): Promise<SavedQuery[]> {
    await this.ensureLoaded();

    const lowerKeyword = keyword.toLowerCase();
    return Array.from(this.queries.values()).filter(
      q =>
        q.name.toLowerCase().includes(lowerKeyword) ||
        q.description?.toLowerCase().includes(lowerKeyword) ||
        q.sql.toLowerCase().includes(lowerKeyword) ||
        q.tags.some(t => t.toLowerCase().includes(lowerKeyword))
    );
  }

  /**
   * 更新收藏
   */
  async update(
    idOrName: string,
    updates: Partial<Pick<SavedQuery, 'name' | 'sql' | 'description' | 'tags'>>
  ): Promise<SavedQuery | undefined> {
    const query = await this.get(idOrName);
    if (!query) return undefined;

    Object.assign(query, updates, {
      updatedAt: new Date().toISOString(),
    });

    await this.save();
    return query;
  }

  /**
   * 导出收藏
   */
  async export(format: 'json' | 'sql' = 'json'): Promise<string> {
    await this.ensureLoaded();

    const queries = Array.from(this.queries.values());

    if (format === 'json') {
      return JSON.stringify(queries, null, 2);
    }

    // SQL 格式
    return queries
      .map(q => `-- ${q.name}\n-- ${q.description || '无描述'}\n${q.sql};\n`)
      .join('\n');
  }

  /**
   * 导入收藏
   */
  async import(jsonData: string): Promise<number> {
    await this.ensureLoaded();

    try {
      const queries = JSON.parse(jsonData) as SavedQuery[];
      let count = 0;

      for (const query of queries) {
        if (!this.queries.has(query.id)) {
          this.queries.set(query.id, query);
          count++;
        }
      }

      await this.save();
      return count;
    } catch (error) {
      throw new Error('导入失败：无效的 JSON 格式');
    }
  }

  /**
   * 获取统计信息
   */
  getStats(): { total: number; tags: string[]; mostUsed?: SavedQuery } {
    const queries = Array.from(this.queries.values());
    const tagSet = new Set<string>();
    let mostUsed: SavedQuery | undefined;

    for (const query of queries) {
      query.tags.forEach(tag => tagSet.add(tag));
      if (!mostUsed || query.useCount > mostUsed.useCount) {
        mostUsed = query;
      }
    }

    return {
      total: queries.length,
      tags: Array.from(tagSet),
      mostUsed,
    };
  }

  private async ensureLoaded(): Promise<void> {
    if (!this.loaded) {
      await this.load();
    }
  }

  private generateId(name: string): string {
    return `sq_${Date.now()}_${name.toLowerCase().replace(/\s+/g, '_')}`;
  }
}
