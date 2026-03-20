/**
 * 云端书签同步管理器
 * v0.6.0 新功能 - 协作共享
 * v0.7.0 增强 - Feishu 真实云端集成
 * 
 * 功能：
 * - 本地书签持久化
 * - 云端同步（Feishu 云文档 / 本地模拟）
 * - 冲突检测与解决
 * - 同步历史记录
 * - 登录认证（Feishu OAuth 2.0 / 本地模拟）
 */

import * as fs from 'fs';
import * as path from 'path';
import { FeishuCloudManager, FeishuBookmark, FeishuConfig } from './feishuCloud.js';

export interface CloudBookmark {
  id: string;
  name: string;
  sql: string;
  description?: string;
  tags: string[];
  databaseType?: string;
  createdAt: string;
  updatedAt: string;
  syncStatus: 'synced' | 'pending' | 'conflict';
  remoteVersion?: number;
  localVersion: number;
}

export interface SyncHistory {
  timestamp: string;
  action: 'upload' | 'download' | 'merge' | 'conflict_resolved';
  bookmarksSynced: number;
  success: boolean;
  error?: string;
}

export interface SyncStatus {
  isConnected: boolean;
  lastSyncTime?: string;
  localCount: number;
  remoteCount: number;
  pendingChanges: number;
}

export interface UserProfile {
  id: string;
  name: string;
  email?: string;
  plan: 'free' | 'pro' | 'team';
}

export type CloudProvider = 'local' | 'feishu';

export interface CloudSyncConfig {
  provider: CloudProvider;
  feishuConfig?: FeishuConfig;
  storageDir?: string;
}

export class CloudSyncManager {
  private readonly storagePath: string;
  private readonly syncHistoryPath: string;
  private currentUser: UserProfile | null = null;
  private isConnected: boolean = false;
  private provider: CloudProvider = 'local';
  private feishuManager?: FeishuCloudManager;

  constructor(config?: CloudSyncConfig) {
    const defaultDir = path.join(process.env.HOME || '~', '.dbmanager', 'cloud');
    const dir = config?.storageDir || defaultDir;
    
    this.storagePath = path.join(dir, 'bookmarks.json');
    this.syncHistoryPath = path.join(dir, 'sync_history.json');
    
    // 确保目录存在
    const dirPath = path.dirname(this.storagePath);
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }

    // 配置提供商
    this.provider = config?.provider || 'local';
    
    if (this.provider === 'feishu' && config?.feishuConfig) {
      this.feishuManager = new FeishuCloudManager();
      this.feishuManager.configure(config.feishuConfig);
      
      // 尝试加载已保存的 tokens
      const savedTokens = this.feishuManager.loadTokens();
      if (savedTokens) {
        this.feishuManager.saveTokens(savedTokens);
      }
    }
  }

  /**
   * 登录（支持本地模拟和 Feishu 真实登录）
   */
  login(email: string, token?: string): { success: boolean; user?: UserProfile; error?: string } {
    if (this.provider === 'feishu') {
      // Feishu 模式：需要授权码
      if (!token) {
        return { 
          success: false, 
          error: 'Feishu 登录需要授权码，请使用 /cloud login --feishu 获取授权 URL' 
        };
      }

      if (!this.feishuManager) {
        return { success: false, error: 'Feishu 未配置' };
      }

      // 使用授权码登录
      // 注意：这里需要异步处理，但为了保持接口兼容，我们返回一个特殊标记
      // 实际使用时应该用 loginFeishu 方法
      return { 
        success: false, 
        error: '请使用 /cloud login --feishu 命令进行 Feishu 登录' 
      };
    }

    // 本地模拟模式
    if (!email || !email.includes('@')) {
      return { success: false, error: '无效的邮箱地址' };
    }

    this.currentUser = {
      id: `user_${Date.now()}`,
      name: email.split('@')[0],
      email,
      plan: 'free',
    };

    this.isConnected = true;
    this.recordSync('upload', 0, true);

    return { success: true, user: this.currentUser };
  }

  /**
   * Feishu 登录（异步）
   */
  async loginFeishu(code: string): Promise<{ success: boolean; user?: UserProfile; error?: string }> {
    if (!this.feishuManager) {
      return { success: false, error: 'Feishu 未配置' };
    }

    const result = await this.feishuManager.loginWithCode(code);
    
    if (result.success && result.user) {
      this.currentUser = {
        id: result.user.id,
        name: result.user.name,
        email: result.user.email,
        plan: 'free',
      };
      this.isConnected = true;
      this.recordSync('upload', 0, true);
      
      // 返回转换后的用户对象
      return { 
        success: true, 
        user: this.currentUser 
      };
    }

    return { success: false, error: result.error };
  }

  /**
   * 获取 Feishu 授权 URL
   */
  getFeishuAuthUrl(): string {
    if (!this.feishuManager) {
      throw new Error('Feishu 未配置');
    }
    return this.feishuManager.getAuthUrl();
  }

  /**
   * 登出
   */
  logout(): void {
    if (this.feishuManager) {
      this.feishuManager.logout();
    }
    this.currentUser = null;
    this.isConnected = false;
  }

  /**
   * 获取当前用户
   */
  getCurrentUser(): UserProfile | null {
    return this.currentUser;
  }

  /**
   * 检查连接状态
   */
  checkConnection(): boolean {
    if (this.provider === 'feishu') {
      return this.feishuManager?.isLoggedIn() || false;
    }
    return this.isConnected && this.currentUser !== null;
  }

  /**
   * 获取当前提供商
   */
  getProvider(): CloudProvider {
    return this.provider;
  }

  /**
   * 上传书签到云端（同步方法，用于本地模式）
   */
  uploadBookmarks(bookmarks: CloudBookmark[]): { success: boolean; uploaded: number; error?: string } {
    if (!this.isConnected) {
      return { success: false, uploaded: 0, error: '未连接到云端' };
    }

    if (this.provider === 'feishu') {
      // Feishu 模式需要使用异步方法
      return { success: false, uploaded: 0, error: 'Feishu 模式请使用 uploadBookmarksAsync' };
    }

    try {
      // 本地模式：保存到本地文件作为"云端存储"
      const existing = this.loadRemoteBookmarks();
      
      let uploaded = 0;
      for (const bookmark of bookmarks) {
        const existingIndex = existing.findIndex(b => b.id === bookmark.id);
        
        if (existingIndex >= 0) {
          existing[existingIndex] = {
            ...bookmark,
            remoteVersion: (existing[existingIndex].remoteVersion || 0) + 1,
            syncStatus: 'synced',
          };
        } else {
          existing.push({
            ...bookmark,
            remoteVersion: 1,
            syncStatus: 'synced',
          });
        }
        
        uploaded++;
      }

      this.saveRemoteBookmarks(existing);
      this.recordSync('upload', uploaded, true);

      return { success: true, uploaded };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.recordSync('upload', 0, false, errorMessage);
      return { success: false, uploaded: 0, error: errorMessage };
    }
  }

  /**
   * 从云端下载书签
   */
  downloadBookmarks(): { success: boolean; bookmarks: CloudBookmark[]; error?: string } {
    if (!this.isConnected) {
      return { success: false, bookmarks: [], error: '未连接到云端' };
    }

    try {
      const remoteBookmarks = this.loadRemoteBookmarks();
      this.recordSync('download', remoteBookmarks.length, true);

      return { success: true, bookmarks: remoteBookmarks };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.recordSync('download', 0, false, errorMessage);
      return { success: false, bookmarks: [], error: errorMessage };
    }
  }

  /**
   * 同步（双向）
   */
  sync(localBookmarks: CloudBookmark[]): { 
    success: boolean; 
    merged: CloudBookmark[]; 
    conflicts: CloudBookmark[];
    error?: string 
  } {
    if (!this.isConnected) {
      return { success: false, merged: [], conflicts: [], error: '未连接到云端' };
    }

    try {
      const remoteBookmarks = this.loadRemoteBookmarks();
      const merged: CloudBookmark[] = [];
      const conflicts: CloudBookmark[] = [];

      // 合并本地和远程书签
      const allIds = new Set<string>();
      localBookmarks.forEach(b => allIds.add(b.id));
      remoteBookmarks.forEach(b => allIds.add(b.id));

      for (const id of allIds) {
        const local = localBookmarks.find(b => b.id === id);
        const remote = remoteBookmarks.find(b => b.id === id);

        if (local && !remote) {
          // 仅本地存在
          merged.push({ ...local, syncStatus: 'pending' });
        } else if (!local && remote) {
          // 仅远程存在
          merged.push({ ...remote, syncStatus: 'synced' });
        } else if (local && remote) {
          // 都存在，检查冲突
          if (local.updatedAt > remote.updatedAt) {
            // 本地更新
            merged.push({ ...local, remoteVersion: remote.remoteVersion, syncStatus: 'pending' });
          } else if (remote.updatedAt > local.updatedAt) {
            // 远程更新
            merged.push({ ...remote, syncStatus: 'synced' });
          } else {
            // 时间戳相同，检查内容
            if (JSON.stringify(local) !== JSON.stringify(remote)) {
              conflicts.push(local);
            } else {
              merged.push({ ...local, syncStatus: 'synced' });
            }
          }
        }
      }

      // 保存合并结果
      this.saveRemoteBookmarks(merged.filter(b => b.syncStatus === 'synced'));
      this.recordSync('merge', merged.length, true);

      return { success: true, merged, conflicts };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.recordSync('merge', 0, false, errorMessage);
      return { success: false, merged: [], conflicts: [], error: errorMessage };
    }
  }

  /**
   * 上传书签到云端（异步，支持 Feishu）
   */
  async uploadBookmarksAsync(bookmarks: CloudBookmark[]): Promise<{ success: boolean; uploaded: number; error?: string }> {
    if (!this.isConnected) {
      return { success: false, uploaded: 0, error: '未连接到云端' };
    }

    if (this.provider === 'feishu') {
      if (!this.feishuManager) {
        return { success: false, uploaded: 0, error: 'Feishu 未配置' };
      }

      // 转换为 Feishu 格式
      const feishuBookmarks: FeishuBookmark[] = bookmarks.map(b => ({
        id: b.id,
        name: b.name,
        sql: b.sql,
        description: b.description,
        tags: b.tags,
        databaseType: b.databaseType,
        createdAt: new Date(b.createdAt).getTime(),
        updatedAt: new Date(b.updatedAt).getTime(),
        version: b.remoteVersion || b.localVersion,
      }));

      const result = await this.feishuManager.uploadBookmarks(feishuBookmarks);
      
      if (result.success) {
        this.recordSync('upload', result.uploaded, true);
      } else {
        this.recordSync('upload', 0, false, result.error);
      }

      return result;
    }

    // 本地模式：使用同步方法
    return this.uploadBookmarks(bookmarks);
  }

  /**
   * 从云端下载书签（异步，支持 Feishu）
   */
  async downloadBookmarksAsync(): Promise<{ success: boolean; bookmarks: CloudBookmark[]; error?: string }> {
    if (!this.isConnected) {
      return { success: false, bookmarks: [], error: '未连接到云端' };
    }

    if (this.provider === 'feishu') {
      if (!this.feishuManager) {
        return { success: false, bookmarks: [], error: 'Feishu 未配置' };
      }

      const result = await this.feishuManager.downloadBookmarks();
      
      if (result.success) {
        // 转换为本地格式
        const bookmarks: CloudBookmark[] = result.bookmarks.map(b => ({
          id: b.id,
          name: b.name,
          sql: b.sql,
          description: b.description,
          tags: b.tags,
          databaseType: b.databaseType,
          createdAt: new Date(b.createdAt).toISOString(),
          updatedAt: new Date(b.updatedAt).toISOString(),
          syncStatus: 'synced' as const,
          remoteVersion: b.version,
          localVersion: b.version,
        }));

        this.recordSync('download', bookmarks.length, true);
        return { success: true, bookmarks };
      } else {
        this.recordSync('download', 0, false, result.error);
        return { success: false, bookmarks: [], error: result.error };
      }
    }

    // 本地模式：使用同步方法
    return Promise.resolve(this.downloadBookmarks());
  }

  /**
   * 同步（异步，支持 Feishu）
   */
  async syncAsync(localBookmarks: CloudBookmark[]): Promise<{ 
    success: boolean; 
    merged: CloudBookmark[]; 
    conflicts: CloudBookmark[];
    error?: string 
  }> {
    if (!this.isConnected) {
      return { success: false, merged: [], conflicts: [], error: '未连接到云端' };
    }

    if (this.provider === 'feishu') {
      if (!this.feishuManager) {
        return { success: false, merged: [], conflicts: [], error: 'Feishu 未配置' };
      }

      const result = await this.feishuManager.sync(
        localBookmarks.map(b => ({
          id: b.id,
          name: b.name,
          sql: b.sql,
          description: b.description,
          tags: b.tags,
          databaseType: b.databaseType,
          createdAt: new Date(b.createdAt).getTime(),
          updatedAt: new Date(b.updatedAt).getTime(),
          version: b.remoteVersion || b.localVersion,
        }))
      );

      if (result.success) {
        const merged: CloudBookmark[] = result.merged.map(b => ({
          id: b.id,
          name: b.name,
          sql: b.sql,
          description: b.description,
          tags: b.tags,
          databaseType: b.databaseType,
          createdAt: new Date(b.createdAt).toISOString(),
          updatedAt: new Date(b.updatedAt).toISOString(),
          syncStatus: 'synced' as const,
          remoteVersion: b.version,
          localVersion: b.version,
        }));

        const conflicts: CloudBookmark[] = result.conflicts.map(b => ({
          id: b.id,
          name: b.name,
          sql: b.sql,
          description: b.description,
          tags: b.tags,
          databaseType: b.databaseType,
          createdAt: new Date(b.createdAt).toISOString(),
          updatedAt: new Date(b.updatedAt).toISOString(),
          syncStatus: 'conflict' as const,
          remoteVersion: b.version,
          localVersion: b.version,
        }));

        this.recordSync('merge', merged.length, true);
        return { success: true, merged, conflicts };
      } else {
        this.recordSync('merge', 0, false, result.error);
        return { success: false, merged: [], conflicts: [], error: result.error };
      }
    }

    // 本地模式：使用同步方法
    return Promise.resolve(this.sync(localBookmarks));
  }

  /**
   * 解决冲突
   */
  resolveConflict(bookmark: CloudBookmark, keep: 'local' | 'remote'): CloudBookmark {
    return {
      ...bookmark,
      syncStatus: 'synced',
      localVersion: bookmark.localVersion + 1,
    };
  }

  /**
   * 获取同步状态
   */
  getSyncStatus(localBookmarks: CloudBookmark[]): SyncStatus {
    const remoteBookmarks = this.loadRemoteBookmarks();
    const pendingChanges = localBookmarks.filter(b => b.syncStatus === 'pending').length;

    const lastSync = this.getLastSyncTime();

    return {
      isConnected: this.isConnected,
      lastSyncTime: lastSync || undefined,
      localCount: localBookmarks.length,
      remoteCount: remoteBookmarks.length,
      pendingChanges,
    };
  }

  /**
   * 获取同步历史
   */
  getSyncHistory(limit: number = 10): SyncHistory[] {
    try {
      if (!fs.existsSync(this.syncHistoryPath)) {
        return [];
      }

      const data = fs.readFileSync(this.syncHistoryPath, 'utf-8');
      const history: SyncHistory[] = JSON.parse(data);
      return history.slice(-limit);
    } catch {
      return [];
    }
  }

  /**
   * 格式化输出同步状态
   */
  formatSyncStatus(status: SyncStatus): string {
    const lines: string[] = [];

    lines.push(`连接状态：${status.isConnected ? '✅ 已连接' : '❌ 未连接'}`);
    
    if (status.lastSyncTime) {
      lines.push(`最后同步：${status.lastSyncTime}`);
    }

    lines.push(`本地书签：${status.localCount}`);
    lines.push(`云端书签：${status.remoteCount}`);
    lines.push(`待同步：${status.pendingChanges}`);

    return lines.join('\n');
  }

  /**
   * 格式化输出同步历史
   */
  formatSyncHistory(history: SyncHistory[]): string {
    if (history.length === 0) {
      return '暂无同步历史';
    }

    const lines: string[] = [];
    
    for (const record of history) {
      const icon = record.success ? '✅' : '❌';
      const actionIcons: Record<string, string> = {
        upload: '⬆️',
        download: '⬇️',
        merge: '🔄',
        conflict_resolved: '✨',
      };
      
      const time = new Date(record.timestamp).toLocaleString('zh-CN');
      lines.push(`${icon} ${actionIcons[record.action] || '📝'} ${record.action} - ${time}`);
      lines.push(`   同步书签：${record.bookmarksSynced} 个`);
      if (record.error) {
        lines.push(`   错误：${record.error}`);
      }
      lines.push('');
    }

    return lines.join('\n');
  }

  /**
   * 加载远程书签
   */
  private loadRemoteBookmarks(): CloudBookmark[] {
    try {
      if (!fs.existsSync(this.storagePath)) {
        return [];
      }

      const data = fs.readFileSync(this.storagePath, 'utf-8');
      return JSON.parse(data);
    } catch {
      return [];
    }
  }

  /**
   * 保存远程书签
   */
  private saveRemoteBookmarks(bookmarks: CloudBookmark[]): void {
    fs.writeFileSync(this.storagePath, JSON.stringify(bookmarks, null, 2), 'utf-8');
  }

  /**
   * 记录同步历史
   */
  private recordSync(
    action: SyncHistory['action'],
    count: number,
    success: boolean,
    error?: string
  ): void {
    try {
      const history = this.getSyncHistory(100);
      
      history.push({
        timestamp: new Date().toISOString(),
        action,
        bookmarksSynced: count,
        success,
        error,
      });

      // 只保留最近 100 条
      const trimmed = history.slice(-100);
      
      fs.writeFileSync(this.syncHistoryPath, JSON.stringify(trimmed, null, 2), 'utf-8');
    } catch {
      // 忽略记录失败的错误
    }
  }

  /**
   * 获取最后同步时间
   */
  private getLastSyncTime(): string | null {
    const history = this.getSyncHistory(1);
    return history.length > 0 ? history[0].timestamp : null;
  }
}
