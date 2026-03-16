/**
 * 查询书签管理器
 * v0.5.0 新功能 - CLI 体验增强
 * 
 * 功能：
 * - 保存常用查询为书签
 * - 按标签分类管理
 * - 快速加载和执行书签查询
 */

import * as fs from 'fs';
import * as path from 'path';

export interface Bookmark {
  id: string;
  name: string;
  sql: string;
  tags: string[];
  description?: string;
  createdAt: string;
  updatedAt: string;
  usageCount: number;
  lastUsedAt?: string;
}

export interface BookmarkCollection {
  version: number;
  bookmarks: Bookmark[];
}

const BOOKMARKS_VERSION = 1;
const BOOKMARKS_FILE = 'bookmarks.json';

export class BookmarkManager {
  private filePath: string;
  private collection: BookmarkCollection;

  constructor() {
    // 使用用户配置目录存储书签
    const configDir = this.getConfigDir();
    this.filePath = path.join(configDir, BOOKMARKS_FILE);
    this.collection = this.load();
  }

  /**
   * 获取配置目录
   */
  private getConfigDir(): string {
    // 优先使用环境变量指定的目录
    if (process.env.DBMANAGER_CONFIG_DIR) {
      return process.env.DBMANAGER_CONFIG_DIR;
    }

    // 默认使用用户主目录
    const homeDir = process.env.HOME || process.env.USERPROFILE || '.';
    const configDir = path.join(homeDir, '.dbmanager');

    // 确保目录存在
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }

    return configDir;
  }

  /**
   * 加载书签
   */
  private load(): BookmarkCollection {
    try {
      if (fs.existsSync(this.filePath)) {
        const data = fs.readFileSync(this.filePath, 'utf-8');
        const collection = JSON.parse(data) as BookmarkCollection;
        
        // 版本检查
        if (collection.version !== BOOKMARKS_VERSION) {
          console.warn(`⚠️ 书签文件格式版本不匹配，使用新版本格式`);
          return this.createDefaultCollection();
        }

        return collection;
      }
    } catch (error) {
      console.warn(`⚠️ 加载书签失败：${error instanceof Error ? error.message : error}`);
    }

    return this.createDefaultCollection();
  }

  /**
   * 创建默认书签集合
   */
  private createDefaultCollection(): BookmarkCollection {
    const collection: BookmarkCollection = {
      version: BOOKMARKS_VERSION,
      bookmarks: [
        // 预置一些常用书签
        {
          id: 'builtin_list_tables',
          name: '查看所有表',
          sql: "SELECT table_name FROM information_schema.tables WHERE table_schema = DATABASE();",
          tags: ['builtin', 'mysql', 'schema'],
          description: '列出当前数据库的所有表',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          usageCount: 0,
        },
        {
          id: 'builtin_table_info',
          name: '查看表信息',
          sql: "SELECT * FROM information_schema.columns WHERE table_name = '${table}';",
          tags: ['builtin', 'mysql', 'schema'],
          description: '查看指定表的列信息（使用时替换 ${table}）',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          usageCount: 0,
        },
      ],
    };

    return collection;
  }

  /**
   * 保存书签
   */
  private save(): void {
    try {
      const data = JSON.stringify(this.collection, null, 2);
      // 确保目录存在
      const dir = path.dirname(this.filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(this.filePath, data, 'utf-8');
    } catch (error) {
      console.error(`❌ 保存书签失败：${error instanceof Error ? error.message : error}`);
    }
  }

  /**
   * 添加书签
   */
  add(name: string, sql: string, tags: string[] = [], description?: string): Bookmark {
    const id = this.generateId(name);
    const now = new Date().toISOString();

    const bookmark: Bookmark = {
      id,
      name,
      sql,
      tags,
      description,
      createdAt: now,
      updatedAt: now,
      usageCount: 0,
    };

    // 检查是否已存在同名书签
    const existing = this.collection.bookmarks.find(b => b.name === name);
    if (existing) {
      throw new Error(`书签 "${name}" 已存在`);
    }

    this.collection.bookmarks.push(bookmark);
    this.save();

    return bookmark;
  }

  /**
   * 删除书签
   */
  remove(nameOrId: string): boolean {
    const index = this.collection.bookmarks.findIndex(
      b => b.name === nameOrId || b.id === nameOrId
    );

    if (index === -1) {
      return false;
    }

    // 不允许删除内置书签
    if (this.collection.bookmarks[index].id.startsWith('builtin_')) {
      throw new Error('不能删除内置书签');
    }

    this.collection.bookmarks.splice(index, 1);
    this.save();
    return true;
  }

  /**
   * 获取书签
   */
  get(nameOrId: string): Bookmark | undefined {
    return this.collection.bookmarks.find(
      b => b.name === nameOrId || b.id === nameOrId
    );
  }

  /**
   * 列出所有书签
   */
  list(tag?: string): Bookmark[] {
    if (!tag) {
      return [...this.collection.bookmarks];
    }

    return this.collection.bookmarks.filter(b =>
      b.tags.includes(tag)
    );
  }

  /**
   * 获取所有标签
   */
  getTags(): string[] {
    const tagSet = new Set<string>();
    for (const bookmark of this.collection.bookmarks) {
      for (const tag of bookmark.tags) {
        tagSet.add(tag);
      }
    }
    return Array.from(tagSet);
  }

  /**
   * 更新书签
   */
  update(nameOrId: string, updates: Partial<Bookmark>): Bookmark | undefined {
    const bookmark = this.get(nameOrId);
    if (!bookmark) {
      return undefined;
    }

    // 不允许修改内置书签
    if (bookmark.id.startsWith('builtin_')) {
      throw new Error('不能修改内置书签');
    }

    Object.assign(bookmark, updates, {
      updatedAt: new Date().toISOString(),
    });

    this.save();
    return bookmark;
  }

  /**
   * 增加使用次数
   */
  incrementUsage(nameOrId: string): void {
    const bookmark = this.get(nameOrId);
    if (bookmark) {
      bookmark.usageCount++;
      bookmark.lastUsedAt = new Date().toISOString();
      bookmark.updatedAt = new Date().toISOString();
      this.save();
    }
  }

  /**
   * 搜索书签
   */
  search(query: string): Bookmark[] {
    const lowerQuery = query.toLowerCase().trim();
    
    return this.collection.bookmarks.filter(b =>
      b.name.toLowerCase().includes(lowerQuery) ||
      b.sql.toLowerCase().includes(lowerQuery) ||
      (b.description && b.description.toLowerCase().includes(lowerQuery)) ||
      b.tags.some(t => t.toLowerCase().includes(lowerQuery))
    );
  }

  /**
   * 导出书签
   */
  export(): string {
    return JSON.stringify(this.collection, null, 2);
  }

  /**
   * 导入书签
   */
  import(json: string): number {
    try {
      const collection = JSON.parse(json) as BookmarkCollection;
      
      if (collection.version !== BOOKMARKS_VERSION) {
        throw new Error('书签文件格式版本不匹配');
      }

      let importedCount = 0;
      for (const bookmark of collection.bookmarks) {
        // 跳过已存在的书签
        if (!this.get(bookmark.name) && !this.get(bookmark.id)) {
          this.collection.bookmarks.push(bookmark);
          importedCount++;
        }
      }

      this.save();
      return importedCount;
    } catch (error) {
      throw new Error(`导入书签失败：${error instanceof Error ? error.message : error}`);
    }
  }

  /**
   * 生成唯一 ID
   */
  private generateId(name: string): string {
    const timestamp = Date.now().toString(36);
    const sanitizedName = name.toLowerCase().replace(/[^a-z0-9]/g, '_');
    return `user_${sanitizedName}_${timestamp}`;
  }

  /**
   * 获取书签统计信息
   */
  getStats(): { total: number; user: number; builtin: number; tags: number } {
    return {
      total: this.collection.bookmarks.length,
      user: this.collection.bookmarks.filter(b => !b.id.startsWith('builtin_')).length,
      builtin: this.collection.bookmarks.filter(b => b.id.startsWith('builtin_')).length,
      tags: this.getTags().length,
    };
  }
}
