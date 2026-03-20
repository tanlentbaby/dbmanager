/**
 * API 客户端
 */

import axios, { AxiosInstance } from 'axios';
import { API_CONFIG } from '../config/api';

class ApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_CONFIG.baseURL,
      timeout: API_CONFIG.timeout,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // 请求拦截器
    this.client.interceptors.request.use(
      (config) => {
        // 添加认证 token
        const token = this.getToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // 响应拦截器
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          // Token 过期，清除并跳转登录
          this.clearToken();
        }
        return Promise.reject(error);
      }
    );
  }

  // 数据库
  async getDatabases() {
    const response = await this.client.get('/databases');
    return response.data;
  }

  async connect(config: any) {
    const response = await this.client.post('/connect', config);
    return response.data;
  }

  async disconnect(databaseId: string) {
    const response = await this.client.post('/disconnect', { databaseId });
    return response.data;
  }

  // 查询
  async executeQuery(sql: string, databaseId?: string) {
    const response = await this.client.post('/query', { sql, databaseId });
    return response.data;
  }

  async getHistory(limit: number = 50) {
    const response = await this.client.get('/history', { params: { limit } });
    return response.data;
  }

  // 书签
  async getBookmarks() {
    const response = await this.client.get('/bookmarks');
    return response.data;
  }

  async createBookmark(bookmark: any) {
    const response = await this.client.post('/bookmarks', bookmark);
    return response.data;
  }

  async updateBookmark(id: string, bookmark: any) {
    const response = await this.client.put(`/bookmarks/${id}`, bookmark);
    return response.data;
  }

  async deleteBookmark(id: string) {
    const response = await this.client.delete(`/bookmarks/${id}`);
    return response.data;
  }

  // AI
  async nl2sql(query: string, tableSchema?: string) {
    const response = await this.client.post('/ai/nl2sql', { query, tableSchema });
    return response.data;
  }

  async explainSQL(sql: string) {
    const response = await this.client.post('/ai/explain', { sql });
    return response.data;
  }

  async optimizeSQL(sql: string) {
    const response = await this.client.post('/ai/optimize', { sql });
    return response.data;
  }

  // 认证
  setToken(token: string) {
    localStorage.setItem('dbmanager_token', token);
  }

  getToken(): string | null {
    return localStorage.getItem('dbmanager_token');
  }

  clearToken() {
    localStorage.removeItem('dbmanager_token');
  }
}

export const api = new ApiClient();
export default api;
