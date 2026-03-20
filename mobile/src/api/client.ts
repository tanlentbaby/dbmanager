/**
 * API 客户端 (增强版)
 * v1.0.0 Phase 1 - 真实 API 集成
 */

import axios, { AxiosInstance, AxiosError } from 'axios';
import { authService } from './auth';
import { API_CONFIG, ENDPOINTS } from '../config/api';

class ApiClient {
  private client: AxiosInstance;
  private baseURL: string;

  constructor(baseURL?: string) {
    this.baseURL = baseURL || API_CONFIG.baseURL;
    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: API_CONFIG.timeout,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // 请求拦截器 - 添加认证 token
    this.client.interceptors.request.use(
      async (config) => {
        const user = await authService.getCurrentUser();
        if (user?.token) {
          config.headers.Authorization = `Bearer ${user.token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // 响应拦截器 - 处理 401 错误
    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        if (error.response?.status === 401) {
          // Token 过期，尝试刷新
          const refreshedUser = await authService.refreshToken();
          if (refreshedUser) {
            // 重试原请求
            const originalRequest = error.config as any;
            originalRequest.headers.Authorization = `Bearer ${refreshedUser.token}`;
            return this.client(originalRequest);
          } else {
            // 刷新失败，登出
            await authService.logout();
          }
        }
        return Promise.reject(error);
      }
    );
  }

  /**
   * GET 请求
   */
  async get<T>(url: string, params?: any): Promise<T> {
    const response = await this.client.get<T>(url, { params });
    return response.data;
  }

  /**
   * POST 请求
   */
  async post<T>(url: string, data?: any): Promise<T> {
    const response = await this.client.post<T>(url, data);
    return response.data;
  }

  /**
   * PUT 请求
   */
  async put<T>(url: string, data?: any): Promise<T> {
    const response = await this.client.put<T>(url, data);
    return response.data;
  }

  /**
   * DELETE 请求
   */
  async delete<T>(url: string): Promise<T> {
    const response = await this.client.delete<T>(url);
    return response.data;
  }

  /**
   * 健康检查
   */
  async healthCheck(): Promise<{ status: string; version: string }> {
    return this.get('/api/health');
  }

  /**
   * 数据库相关 API
   */
  async getDatabases() {
    return this.get('/api/databases');
  }

  async connect(config: any) {
    return this.post('/api/connect', config);
  }

  async disconnect(databaseId: string) {
    return this.post('/api/disconnect', { databaseId });
  }

  /**
   * 查询相关 API
   */
  async executeQuery(sql: string, databaseId?: string) {
    return this.post('/api/query', { sql, databaseId });
  }

  async getHistory(limit: number = 50) {
    return this.get('/api/history', { limit });
  }

  /**
   * 书签相关 API
   */
  async getBookmarks() {
    return this.get('/api/bookmarks');
  }

  async createBookmark(bookmark: any) {
    return this.post('/api/bookmarks', bookmark);
  }

  async updateBookmark(id: string, bookmark: any) {
    return this.put(`/api/bookmarks/${id}`, bookmark);
  }

  async deleteBookmark(id: string) {
    return this.delete(`/api/bookmarks/${id}`);
  }

  /**
   * AI 相关 API
   */
  async nl2sql(query: string, tableSchema?: string) {
    return this.post('/api/ai/nl2sql', { query, tableSchema });
  }

  async explainSQL(sql: string) {
    return this.post('/api/ai/explain', { sql });
  }

  async optimizeSQL(sql: string) {
    return this.post('/api/ai/optimize', { sql });
  }

  /**
   * 认证相关 API
   */
  async login(email: string, password: string) {
    return this.post('/api/auth/login', { email, password });
  }

  async register(email: string, password: string, name: string) {
    return this.post('/api/auth/register', { email, password, name });
  }

  async logout() {
    return this.post('/api/auth/logout');
  }

  async getCurrentUser() {
    return this.get('/api/auth/me');
  }

  /**
   * 插件相关 API
   */
  async getPlugins() {
    return this.get('/api/plugins');
  }

  async installPlugin(pluginId: string) {
    return this.post(`/api/plugins/${pluginId}/install`);
  }

  async uninstallPlugin(pluginId: string) {
    return this.post(`/api/plugins/${pluginId}/uninstall`);
  }
}

// 导出单例
export const api = new ApiClient();
export default api;
