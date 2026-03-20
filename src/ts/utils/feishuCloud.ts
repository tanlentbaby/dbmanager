/**
 * Feishu 云文档集成管理器
 * v0.7.0 Phase 1 - 真实云端服务
 * 
 * 功能：
 * - Feishu OAuth 2.0 认证
 * - 云文档 CRUD 操作
 * - 书签云端存储
 * - 实时同步
 * - 冲突检测与解决
 */

import axios, { AxiosInstance } from 'axios';

export interface FeishuConfig {
  appId: string;
  appSecret: string;
  redirectUri: string;
}

export interface FeishuTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  expiresAt: number;
}

export interface FeishuUser {
  id: string;
  name: string;
  email: string;
  avatar?: string;
}

export interface FeishuFile {
  id: string;
  name: string;
  type: 'doc' | 'sheet' | 'folder';
  url: string;
  createdAt: string;
  updatedAt: string;
  parentId?: string;
}

export interface FeishuBookmark {
  id: string;
  name: string;
  sql: string;
  description?: string;
  tags: string[];
  databaseType?: string;
  createdAt: number;
  updatedAt: number;
  version: number;
}

export class FeishuCloudManager {
  private config?: FeishuConfig;
  private tokens?: FeishuTokens;
  private client: AxiosInstance;
  private currentUser: FeishuUser | null = null;
  private bookmarkFileId: string | null = null;
  
  private readonly API_BASE = 'https://open.feishu.cn/open-apis';
  private readonly BOOKMARK_FILE_NAME = 'DBManager_Bookmarks.json';

  constructor() {
    this.client = axios.create({
      baseURL: this.API_BASE,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // 添加响应拦截器处理 token 刷新
    this.client.interceptors.response.use(
      (response) => response,
      async (error) => {
        if (error.response?.status === 401 && this.tokens) {
          // Token 过期，尝试刷新
          await this.refreshAccessToken();
          // 重试原请求
          if (this.tokens) {
            error.config.headers.Authorization = `Bearer ${this.tokens.accessToken}`;
            return this.client(error.config);
          }
        }
        return Promise.reject(error);
      }
    );
  }

  /**
   * 配置 Feishu 应用
   */
  configure(config: FeishuConfig): void {
    this.config = config;
  }

  /**
   * 获取授权 URL
   */
  getAuthUrl(state?: string): string {
    if (!this.config) {
      throw new Error('Feishu 应用未配置');
    }

    const params = new URLSearchParams({
      app_id: this.config.appId,
      redirect_uri: this.config.redirectUri,
      state: state || '',
    });

    return `https://open.feishu.cn/open-apis/authen/v1/authorize?${params.toString()}`;
  }

  /**
   * 使用授权码登录
   */
  async loginWithCode(code: string): Promise<{ success: boolean; user?: FeishuUser; error?: string }> {
    if (!this.config) {
      return { success: false, error: 'Feishu 应用未配置' };
    }

    try {
      // 获取 access token
      const tokenResponse = await this.client.post('/authen/v1/access_token', {
        grant_type: 'authorization_code',
        code,
      });

      if (tokenResponse.data.code !== 0) {
        return { success: false, error: tokenResponse.data.msg || '获取 token 失败' };
      }

      const { access_token, refresh_token, expires_in } = tokenResponse.data.data;
      
      this.tokens = {
        accessToken: access_token,
        refreshToken: refresh_token,
        expiresIn: expires_in,
        expiresAt: Date.now() + expires_in * 1000,
      };

      // 获取用户信息
      const userResponse = await this.client.get('/authen/v1/user_info', {
        headers: {
          Authorization: `Bearer ${this.tokens.accessToken}`,
        },
      });

      if (userResponse.data.code !== 0) {
        return { success: false, error: userResponse.data.msg || '获取用户信息失败' };
      }

      const userData = userResponse.data.data;
      this.currentUser = {
        id: userData.user_id,
        name: userData.name,
        email: userData.email || '',
        avatar: userData.avatar?.avatar_72,
      };

      // 查找或创建书签文件
      await this.findOrCreateBookmarkFile();

      return { success: true, user: this.currentUser };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return { success: false, error: errorMessage };
    }
  }

  /**
   * 使用 refresh token 刷新访问令牌
   */
  async refreshAccessToken(): Promise<boolean> {
    if (!this.config || !this.tokens) {
      return false;
    }

    try {
      const response = await this.client.post('/authen/v1/refresh_access_token', {
        grant_type: 'refresh_token',
        refresh_token: this.tokens.refreshToken,
      });

      if (response.data.code !== 0) {
        return false;
      }

      const { access_token, refresh_token, expires_in } = response.data.data;
      
      this.tokens = {
        accessToken: access_token,
        refreshToken: refresh_token,
        expiresIn: expires_in,
        expiresAt: Date.now() + expires_in * 1000,
      };

      return true;
    } catch {
      return false;
    }
  }

  /**
   * 登出
   */
  logout(): void {
    this.tokens = undefined;
    this.currentUser = null;
    this.bookmarkFileId = null;
  }

  /**
   * 检查是否已登录
   */
  isLoggedIn(): boolean {
    if (!this.tokens) return false;
    
    // 检查 token 是否过期
    if (Date.now() >= this.tokens.expiresAt) {
      return false;
    }
    
    return this.currentUser !== null;
  }

  /**
   * 获取当前用户
   */
  getCurrentUser(): FeishuUser | null {
    return this.currentUser;
  }

  /**
   * 查找或创建书签文件
   */
  private async findOrCreateBookmarkFile(): Promise<void> {
    try {
      // 搜索现有文件
      const searchResponse = await this.client.get('/drive/v1/files/search', {
        headers: {
          Authorization: `Bearer ${this.tokens!.accessToken}`,
        },
        params: {
          query: this.BOOKMARK_FILE_NAME,
        },
      });

      if (searchResponse.data.code === 0 && searchResponse.data.data?.items?.length > 0) {
        this.bookmarkFileId = searchResponse.data.data.items[0].token;
        return;
      }

      // 创建新文件
      const createResponse = await this.client.post('/drive/v1/files', {
        file_type: 'doc',
        name: this.BOOKMARK_FILE_NAME,
        parent_type: 'root',
      }, {
        headers: {
          Authorization: `Bearer ${this.tokens!.accessToken}`,
        },
      });

      if (createResponse.data.code === 0) {
        this.bookmarkFileId = createResponse.data.data?.token;
      }
    } catch (error) {
      console.error('查找或创建书签文件失败:', error);
      throw error;
    }
  }

  /**
   * 上传书签到 Feishu 云文档
   */
  async uploadBookmarks(bookmarks: FeishuBookmark[]): Promise<{ success: boolean; uploaded: number; error?: string }> {
    if (!this.isLoggedIn() || !this.bookmarkFileId) {
      return { success: false, uploaded: 0, error: '未连接到 Feishu' };
    }

    try {
      // 将书签转换为 JSON 内容
      const content = JSON.stringify({
        version: 1,
        updatedAt: new Date().toISOString(),
        bookmarks,
      }, null, 2);

      // 更新云文档内容
      const response = await this.client.put(
        `/drive/v1/files/${this.bookmarkFileId}/content`,
        { raw_content: content },
        {
          headers: {
            Authorization: `Bearer ${this.tokens!.accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.data.code !== 0) {
        return { success: false, uploaded: 0, error: response.data.msg || '上传失败' };
      }

      return { success: true, uploaded: bookmarks.length };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return { success: false, uploaded: 0, error: errorMessage };
    }
  }

  /**
   * 从 Feishu 云文档下载书签
   */
  async downloadBookmarks(): Promise<{ success: boolean; bookmarks: FeishuBookmark[]; error?: string }> {
    if (!this.isLoggedIn() || !this.bookmarkFileId) {
      return { success: false, bookmarks: [], error: '未连接到 Feishu' };
    }

    try {
      // 获取文件内容
      const response = await this.client.get(
        `/drive/v1/files/${this.bookmarkFileId}/content`,
        {
          headers: {
            Authorization: `Bearer ${this.tokens!.accessToken}`,
          },
        }
      );

      if (response.data.code !== 0) {
        return { success: false, bookmarks: [], error: response.data.msg || '下载失败' };
      }

      // 解析内容
      const content = response.data.data?.raw_content || '{}';
      const data = JSON.parse(content);
      
      return { success: true, bookmarks: data.bookmarks || [] };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return { success: false, bookmarks: [], error: errorMessage };
    }
  }

  /**
   * 同步本地和云端书签
   */
  async sync(
    localBookmarks: FeishuBookmark[]
  ): Promise<{ 
    success: boolean; 
    merged: FeishuBookmark[]; 
    conflicts: FeishuBookmark[];
    error?: string 
  }> {
    if (!this.isLoggedIn()) {
      return { success: false, merged: [], conflicts: [], error: '未连接到 Feishu' };
    }

    try {
      // 下载云端书签
      const downloadResult = await this.downloadBookmarks();
      if (!downloadResult.success) {
        return { success: false, merged: [], conflicts: [], error: downloadResult.error };
      }

      const remoteBookmarks = downloadResult.bookmarks;
      const merged: FeishuBookmark[] = [];
      const conflicts: FeishuBookmark[] = [];

      // 合并策略：基于版本号和更新时间
      const allIds = new Set<string>();
      localBookmarks.forEach(b => allIds.add(b.id));
      remoteBookmarks.forEach(b => allIds.add(b.id));

      for (const id of allIds) {
        const local = localBookmarks.find(b => b.id === id);
        const remote = remoteBookmarks.find(b => b.id === id);

        if (local && !remote) {
          // 仅本地存在，上传
          merged.push(local);
        } else if (!local && remote) {
          // 仅远程存在，下载
          merged.push(remote);
        } else if (local && remote) {
          // 都存在，检查冲突
          if (local.version > remote.version) {
            // 本地版本更新
            merged.push(local);
          } else if (remote.version > local.version) {
            // 远程版本更新
            merged.push(remote);
          } else {
            // 版本相同，检查更新时间
            if (local.updatedAt > remote.updatedAt) {
              merged.push(local);
            } else if (remote.updatedAt > local.updatedAt) {
              merged.push(remote);
            } else {
              // 完全相同
              merged.push(local);
            }
          }
        }
      }

      // 上传合并后的书签
      const uploadResult = await this.uploadBookmarks(merged);
      if (!uploadResult.success) {
        return { success: false, merged: [], conflicts: [], error: uploadResult.error };
      }

      return { success: true, merged, conflicts };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return { success: false, merged: [], conflicts: [], error: errorMessage };
    }
  }

  /**
   * 分享书签给其他用户
   */
  async shareBookmark(bookmarkId: string, userEmail: string): Promise<{ success: boolean; error?: string }> {
    if (!this.isLoggedIn() || !this.bookmarkFileId) {
      return { success: false, error: '未连接到 Feishu' };
    }

    try {
      // 获取用户 ID
      const userResponse = await this.client.get('/contact/v1/users/batch_get_id', {
        headers: {
          Authorization: `Bearer ${this.tokens!.accessToken}`,
        },
        params: {
          emails: userEmail,
        },
      });

      if (userResponse.data.code !== 0) {
        return { success: false, error: '找不到该用户' };
      }

      const userId = userResponse.data.data?.user_id;
      if (!userId) {
        return { success: false, error: '找不到该用户' };
      }

      // 分享文件
      const shareResponse = await this.client.post(
        `/drive/v1/files/${this.bookmarkFileId}/permissions`,
        {
          member: {
            member_id: userId,
            member_type: 'user',
          },
          role: 'reader',
        },
        {
          headers: {
            Authorization: `Bearer ${this.tokens!.accessToken}`,
          },
        }
      );

      if (shareResponse.data.code !== 0) {
        return { success: false, error: shareResponse.data.msg || '分享失败' };
      }

      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return { success: false, error: errorMessage };
    }
  }

  /**
   * 获取同步状态
   */
  getSyncStatus(): { isConnected: boolean; user: FeishuUser | null; lastSyncTime?: string } {
    return {
      isConnected: this.isLoggedIn(),
      user: this.currentUser,
    };
  }

  /**
   * 保存 tokens 到本地（用于持久化登录）
   */
  saveTokens(tokens: FeishuTokens): void {
    this.tokens = tokens;
    // TODO: 保存到加密存储
  }

  /**
   * 从本地加载 tokens
   */
  loadTokens(): FeishuTokens | undefined {
    // TODO: 从加密存储加载
    return this.tokens;
  }
}

export default FeishuCloudManager;
