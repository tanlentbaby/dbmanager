/**
 * Notion 云文档集成管理器
 * v0.7.0 Phase 2 - 真实云端服务
 * 
 * 功能：
 * - Notion API 认证
 * - Database/Block 操作
 * - 书签云端存储
 * - 双向同步
 */

import { Client, APIErrorCode, APIResponseError } from '@notionhq/client';

type PageObjectResponse = any;
type DatabaseObjectResponse = any;

export interface NotionConfig {
  apiKey: string;
  databaseId?: string;
}

export interface NotionBookmark {
  id: string;
  name: string;
  sql: string;
  description?: string;
  tags: string[];
  databaseType?: string;
  createdAt: string;
  updatedAt: string;
  version: number;
}

export class NotionCloudManager {
  private client?: Client;
  private config?: NotionConfig;
  private databaseId?: string;

  constructor() {}

  /**
   * 配置 Notion 客户端
   */
  configure(config: NotionConfig): void {
    this.config = config;
    this.client = new Client({
      auth: config.apiKey,
    });
    this.databaseId = config.databaseId || undefined;
  }

  /**
   * 检查连接状态
   */
  async checkConnection(): Promise<{ connected: boolean; error?: string }> {
    if (!this.client) {
      return { connected: false, error: 'Notion 客户端未配置' };
    }

    try {
      // 尝试获取数据库信息
      if (this.databaseId) {
        await this.client.databases.retrieve({ database_id: this.databaseId });
        return { connected: true };
      }
      return { connected: true };
    } catch (error) {
      if (error instanceof APIResponseError) {
        if (error.code === APIErrorCode.Unauthorized) {
          return { connected: false, error: 'Notion API Key 无效' };
        }
        if (error.code === APIErrorCode.ObjectNotFound) {
          return { connected: false, error: '数据库不存在' };
        }
      }
      return { connected: false, error: error instanceof Error ? error.message : String(error) };
    }
  }

  /**
   * 创建书签数据库（如果不存在）
   */
  async createBookmarkDatabase(parentPageId: string): Promise<string> {
    if (!this.client) {
      throw new Error('Notion 客户端未配置');
    }

    const response = await this.client.databases.create({
      parent: { type: 'page_id', page_id: parentPageId },
      title: [{ type: 'text', text: { content: 'DBManager Bookmarks' } }],
      properties: {
        'Name': { title: {} },
        'SQL': { rich_text: {} },
        'Description': { rich_text: {} },
        'Tags': { multi_select: {} },
        'Database Type': { select: {} },
        'Version': { number: {} },
        'Last Updated': { last_edited_time: {} },
      } as any,
    } as any);

    this.databaseId = (response as any).id;
    return this.databaseId!;
  }

  /**
   * 上传书签到 Notion
   */
  async uploadBookmarks(bookmarks: NotionBookmark[]): Promise<{ success: boolean; uploaded: number; error?: string }> {
    if (!this.client || !this.databaseId) {
      return { success: false, uploaded: 0, error: 'Notion 未配置' };
    }

    try {
      let uploaded = 0;

      for (const bookmark of bookmarks) {
        try {
          // 检查是否已存在
          const existing = await this.findBookmark(bookmark.id);

          if (existing) {
            // 更新
            await this.client.pages.update({
              page_id: existing.id,
              properties: {
                'Name': { title: [{ type: 'text', text: { content: bookmark.name } }] },
                'SQL': { rich_text: [{ type: 'text', text: { content: bookmark.sql } }] },
                'Description': { rich_text: [{ type: 'text', text: { content: bookmark.description || '' } }] },
                'Tags': {
                  multi_select: bookmark.tags.map(tag => ({ name: tag })),
                },
                'Database Type': { select: { name: bookmark.databaseType || 'Unknown' } },
                'Version': { number: bookmark.version },
              },
            });
          } else {
            // 创建
            await this.client.pages.create({
              parent: { database_id: this.databaseId },
              properties: {
                'Name': { title: [{ type: 'text', text: { content: bookmark.name } }] },
                'SQL': { rich_text: [{ type: 'text', text: { content: bookmark.sql } }] },
                'Description': { rich_text: [{ type: 'text', text: { content: bookmark.description || '' } }] },
                'Tags': {
                  multi_select: bookmark.tags.map(tag => ({ name: tag })),
                },
                'Database Type': { select: { name: bookmark.databaseType || 'Unknown' } },
                'Version': { number: bookmark.version },
              },
            });
          }

          uploaded++;
        } catch (error) {
          console.error(`上传书签 ${bookmark.id} 失败:`, error);
        }
      }

      return { success: true, uploaded };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return { success: false, uploaded: 0, error: errorMessage };
    }
  }

  /**
   * 从 Notion 下载书签
   */
  async downloadBookmarks(): Promise<{ success: boolean; bookmarks: NotionBookmark[]; error?: string }> {
    if (!this.client || !this.databaseId) {
      return { success: false, bookmarks: [], error: 'Notion 未配置' };
    }

    try {
      const response: any = await (this.client as any).databases.query({
        database_id: this.databaseId,
      });

      const bookmarks: NotionBookmark[] = response.results.map((page: any) => {
        const pageObj = page as PageObjectResponse;
        const props = pageObj.properties;

        // 提取属性
        const name = this.getPropertyValue(props['Name']) || 'Untitled';
        const sql = this.getPropertyValue(props['SQL']) || '';
        const description = this.getPropertyValue(props['Description']) || '';
        const tags = this.getMultiSelectValues(props['Tags']);
        const databaseType = this.getSelectValue(props['Database Type']);
        const version = (props['Version'] as any)?.number || 1;
        const updatedAt = (props['Last Updated'] as any)?.last_edited_time || new Date().toISOString();

        return {
          id: pageObj.id,
          name,
          sql,
          description,
          tags,
          databaseType,
          createdAt: updatedAt,
          updatedAt,
          version,
        };
      });

      return { success: true, bookmarks };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return { success: false, bookmarks: [], error: errorMessage };
    }
  }

  /**
   * 同步本地和云端书签
   */
  async sync(localBookmarks: NotionBookmark[]): Promise<{
    success: boolean;
    merged: NotionBookmark[];
    conflicts: NotionBookmark[];
    error?: string;
  }> {
    if (!this.client || !this.databaseId) {
      return { success: false, merged: [], conflicts: [], error: 'Notion 未配置' };
    }

    try {
      const downloadResult = await this.downloadBookmarks();
      if (!downloadResult.success) {
        return { success: false, merged: [], conflicts: [], error: downloadResult.error };
      }

      const remoteBookmarks = downloadResult.bookmarks;
      const merged: NotionBookmark[] = [];
      const conflicts: NotionBookmark[] = [];

      const allIds = new Set<string>();
      localBookmarks.forEach(b => allIds.add(b.id));
      remoteBookmarks.forEach(b => allIds.add(b.id));

      for (const id of allIds) {
        const local = localBookmarks.find(b => b.id === id);
        const remote = remoteBookmarks.find(b => b.id === id);

        if (local && !remote) {
          merged.push(local);
        } else if (!local && remote) {
          merged.push(remote);
        } else if (local && remote) {
          if (local.version > remote.version) {
            merged.push(local);
          } else if (remote.version > local.version) {
            merged.push(remote);
          } else {
            if (new Date(local.updatedAt) > new Date(remote.updatedAt)) {
              merged.push(local);
            } else {
              merged.push(remote);
            }
          }
        }
      }

      // 上传合并后的书签
      await this.uploadBookmarks(merged);

      return { success: true, merged, conflicts };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return { success: false, merged: [], conflicts: [], error: errorMessage };
    }
  }

  /**
   * 查找书签
   */
  private async findBookmark(id: string): Promise<PageObjectResponse | null> {
    if (!this.client || !this.databaseId) {
      return null;
    }

    try {
      const response: any = await (this.client as any).databases.query({
        database_id: this.databaseId,
        filter: {
          property: 'Name',
          rich_text: {
            contains: id,
          },
        },
      });

      if (response.results.length > 0) {
        return response.results[0] as PageObjectResponse;
      }
      return null;
    } catch {
      return null;
    }
  }

  /**
   * 获取属性值（辅助方法）
   */
  private getPropertyValue(prop: any): string {
    if (!prop) return '';

    if (prop.title && Array.isArray(prop.title) && prop.title.length > 0) {
      return prop.title[0].plain_text || '';
    }

    if (prop.rich_text && Array.isArray(prop.rich_text) && prop.rich_text.length > 0) {
      return prop.rich_text[0].plain_text || '';
    }

    return '';
  }

  /**
   * 获取多选值
   */
  private getMultiSelectValues(prop: any): string[] {
    if (!prop || !prop.multi_select || !Array.isArray(prop.multi_select)) {
      return [];
    }
    return prop.multi_select.map((item: any) => item.name).filter(Boolean);
  }

  /**
   * 获取单选值
   */
  private getSelectValue(prop: any): string | undefined {
    if (!prop || !prop.select || !prop.select.name) {
      return undefined;
    }
    return prop.select.name;
  }

  /**
   * 获取数据库 ID
   */
  getDatabaseId(): string | undefined {
    return this.databaseId;
  }
}

export default NotionCloudManager;
