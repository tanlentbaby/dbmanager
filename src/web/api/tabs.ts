/**
 * 标签管理 API
 * 支持多标签页查询
 */

import { IncomingMessage, ServerResponse } from 'http';

export interface QueryTab {
  id: string;
  title: string;
  configId: string;
  configName?: string;
  currentSql: string;
  history: TabQueryHistory[];
  createdAt: number;
  lastUsedAt: number;
}

export interface TabQueryHistory {
  id: string;
  sql: string;
  executedAt: number;
  duration?: number;
  success: boolean;
  error?: string;
  rowCount?: number;
}

export class TabManager {
  private tabs: Map<string, QueryTab>;
  private maxHistoryPerTab: number;

  constructor(maxHistoryPerTab: number = 50) {
    this.tabs = new Map();
    this.maxHistoryPerTab = maxHistoryPerTab;
  }

  /**
   * 创建新标签
   */
  createTab(configId: string, configName?: string): QueryTab {
    const id = `tab_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = Date.now();
    
    const tab: QueryTab = {
      id,
      title: configName || `Query ${this.tabs.size + 1}`,
      configId,
      configName,
      currentSql: '',
      history: [],
      createdAt: now,
      lastUsedAt: now,
    };
    
    this.tabs.set(id, tab);
    return tab;
  }

  /**
   * 获取标签
   */
  getTab(tabId: string): QueryTab | undefined {
    return this.tabs.get(tabId);
  }

  /**
   * 获取所有标签
   */
  getAllTabs(): QueryTab[] {
    return Array.from(this.tabs.values());
  }

  /**
   * 切换标签（更新最后使用时间）
   */
  switchTab(tabId: string): boolean {
    const tab = this.tabs.get(tabId);
    if (tab) {
      tab.lastUsedAt = Date.now();
      return true;
    }
    return false;
  }

  /**
   * 关闭标签
   */
  closeTab(tabId: string): boolean {
    return this.tabs.delete(tabId);
  }

  /**
   * 更新标签 SQL
   */
  updateTabSql(tabId: string, sql: string): boolean {
    const tab = this.tabs.get(tabId);
    if (tab) {
      tab.currentSql = sql;
      tab.lastUsedAt = Date.now();
      return true;
    }
    return false;
  }

  /**
   * 更新标签标题
   */
  updateTabTitle(tabId: string, title: string): boolean {
    const tab = this.tabs.get(tabId);
    if (tab) {
      tab.title = title;
      return true;
    }
    return false;
  }

  /**
   * 添加查询历史
   */
  addQueryHistory(tabId: string, history: Omit<TabQueryHistory, 'id'>): boolean {
    const tab = this.tabs.get(tabId);
    if (tab) {
      const historyItem: TabQueryHistory = {
        ...history,
        id: `hist_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      };
      
      tab.history.unshift(historyItem);
      
      // 限制历史记录数量
      if (tab.history.length > this.maxHistoryPerTab) {
        tab.history = tab.history.slice(0, this.maxHistoryPerTab);
      }
      
      tab.lastUsedAt = Date.now();
      return true;
    }
    return false;
  }

  /**
   * 获取标签历史
   */
  getTabHistory(tabId: string, limit: number = 20): TabQueryHistory[] {
    const tab = this.tabs.get(tabId);
    if (tab) {
      return tab.history.slice(0, limit);
    }
    return [];
  }

  /**
   * 清空标签历史
   */
  clearTabHistory(tabId: string): boolean {
    const tab = this.tabs.get(tabId);
    if (tab) {
      tab.history = [];
      return true;
    }
    return false;
  }

  /**
   * 获取标签数量
   */
  getTabCount(): number {
    return this.tabs.size;
  }

  /**
   * 导出所有标签
   */
  export(): QueryTab[] {
    return this.getAllTabs();
  }

  /**
   * 导入标签
   */
  import(tabs: QueryTab[]): void {
    tabs.forEach(tab => {
      this.tabs.set(tab.id, tab);
    });
  }
}

/**
 * 处理标签 API 请求
 */
export async function handleTabsApi(
  path: string,
  method: string,
  req: IncomingMessage,
  res: ServerResponse,
  tabManager: TabManager,
  readBody: (req: IncomingMessage) => Promise<string>
): Promise<{ success: boolean; data?: unknown; error?: string }> {
  res.setHeader('Content-Type', 'application/json');

  try {
    // GET /api/tabs - 获取所有标签
    if (path === 'tabs' && method === 'GET') {
      return { success: true, data: tabManager.getAllTabs() };
    }

    // POST /api/tabs - 创建新标签
    if (path === 'tabs' && method === 'POST') {
      const body = await readBody(req);
      const { configId, configName } = JSON.parse(body);
      
      if (!configId) {
        return { success: false, error: 'configId is required' };
      }
      
      const tab = tabManager.createTab(configId, configName);
      return { success: true, data: tab };
    }

    // GET /api/tabs/:id - 获取单个标签
    const tabMatch = path.match(/^tabs\/([^/]+)$/);
    if (tabMatch && method === 'GET') {
      const tabId = tabMatch[1];
      const tab = tabManager.getTab(tabId);
      
      if (!tab) {
        return { success: false, error: 'Tab not found' };
      }
      
      return { success: true, data: tab };
    }

    // PUT /api/tabs/:id - 更新标签
    if (tabMatch && method === 'PUT') {
      const tabId = tabMatch[1];
      const body = await readBody(req);
      const { title, sql } = JSON.parse(body);
      
      const tab = tabManager.getTab(tabId);
      if (!tab) {
        return { success: false, error: 'Tab not found' };
      }
      
      if (title !== undefined) {
        tabManager.updateTabTitle(tabId, title);
      }
      if (sql !== undefined) {
        tabManager.updateTabSql(tabId, sql);
      }
      
      return { success: true, data: tabManager.getTab(tabId) };
    }

    // DELETE /api/tabs/:id - 删除标签
    if (tabMatch && method === 'DELETE') {
      const tabId = tabMatch[1];
      
      if (!tabManager.closeTab(tabId)) {
        return { success: false, error: 'Tab not found' };
      }
      
      return { success: true, data: { deleted: tabId } };
    }

    // GET /api/tabs/:id/history - 获取标签历史
    const historyMatch = path.match(/^tabs\/([^/]+)\/history$/);
    if (historyMatch && method === 'GET') {
      const tabId = historyMatch[1];
      const url = new URL(req.url || '', 'http://localhost');
      const limit = parseInt(url.searchParams.get('limit') || '20', 10);
      
      const history = tabManager.getTabHistory(tabId, limit);
      return { success: true, data: history };
    }

    // POST /api/tabs/:id/history - 添加查询历史
    if (historyMatch && method === 'POST') {
      const tabId = historyMatch[1];
      const body = await readBody(req);
      const history = JSON.parse(body);
      
      if (!tabManager.addQueryHistory(tabId, history)) {
        return { success: false, error: 'Tab not found' };
      }
      
      return { success: true, data: { added: true } };
    }

    // DELETE /api/tabs/:id/history - 清空历史
    if (historyMatch && method === 'DELETE') {
      const tabId = historyMatch[1];
      
      if (!tabManager.clearTabHistory(tabId)) {
        return { success: false, error: 'Tab not found' };
      }
      
      return { success: true, data: { cleared: true } };
    }

    return { success: false, error: 'Not found' };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, error: message };
  }
}
