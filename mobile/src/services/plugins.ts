/**
 * 插件系统 API
 * v0.9.0 Phase 4 - 插件系统
 */

export interface Plugin {
  id: string;
  name: string;
  version: string;
  description: string;
  author: string;
  icon?: string;
  enabled: boolean;
  installed: boolean;
  category: string;
  rating?: number;
  downloads?: number;
}

export interface PluginManifest {
  id: string;
  name: string;
  version: string;
  description: string;
  main: string;
  author: string;
  permissions: string[];
}

export const pluginService = {
  /**
   * 获取已安装插件
   */
  async getInstalledPlugins(): Promise<Plugin[]> {
    // 模拟已安装插件
    return [
      {
        id: 'export-plus',
        name: 'Export Plus',
        version: '1.0.0',
        description: '高级导出功能 (Excel, PDF)',
        author: 'DBManager',
        icon: '📤',
        enabled: true,
        installed: true,
        category: 'export',
        rating: 4.8,
        downloads: 1200,
      },
      {
        id: 'chart-view',
        name: 'Chart View',
        version: '1.0.0',
        description: '查询结果可视化',
        author: 'DBManager',
        icon: '📊',
        enabled: true,
        installed: true,
        category: 'visualization',
        rating: 4.5,
        downloads: 800,
      },
    ];
  },

  /**
   * 获取插件市场
   */
  async getMarketPlugins(): Promise<Plugin[]> {
    return [
      {
        id: 'backup-pro',
        name: 'Backup Pro',
        version: '1.0.0',
        description: '定时备份',
        author: 'DBManager',
        icon: '💾',
        enabled: false,
        installed: false,
        category: 'backup',
        rating: 4.9,
        downloads: 2000,
      },
      {
        id: 'sql-formatter',
        name: 'SQL Formatter',
        version: '1.0.0',
        description: '代码格式化',
        author: 'Community',
        icon: '📝',
        enabled: false,
        installed: false,
        category: 'utility',
        rating: 4.6,
        downloads: 1500,
      },
      {
        id: 'data-generator',
        name: 'Data Generator',
        version: '1.0.0',
        description: '测试数据生成',
        author: 'Community',
        icon: '🎲',
        enabled: false,
        installed: false,
        category: 'utility',
        rating: 4.3,
        downloads: 600,
      },
    ];
  },

  /**
   * 安装插件
   */
  async installPlugin(pluginId: string): Promise<void> {
    // 模拟安装
    await new Promise((resolve) => setTimeout(resolve, 1000));
  },

  /**
   * 卸载插件
   */
  async uninstallPlugin(pluginId: string): Promise<void> {
    // 模拟卸载
    await new Promise((resolve) => setTimeout(resolve, 500));
  },

  /**
   * 启用/禁用插件
   */
  async togglePlugin(pluginId: string, enabled: boolean): Promise<void> {
    // 模拟切换
    await new Promise((resolve) => setTimeout(resolve, 200));
  },

  /**
   * 搜索插件
   */
  async searchPlugins(query: string): Promise<Plugin[]> {
    const allPlugins = await this.getMarketPlugins();
    const lowerQuery = query.toLowerCase();
    return allPlugins.filter(
      (p) =>
        p.name.toLowerCase().includes(lowerQuery) ||
        p.description.toLowerCase().includes(lowerQuery) ||
        p.category.toLowerCase().includes(lowerQuery)
    );
  },
};

/**
 * 插件管理器
 */
export class PluginManager {
  private plugins: Map<string, Plugin> = new Map();

  /**
   * 注册插件
   */
  register(plugin: Plugin): void {
    this.plugins.set(plugin.id, plugin);
  }

  /**
   * 获取插件
   */
  get(id: string): Plugin | undefined {
    return this.plugins.get(id);
  }

  /**
   * 获取所有插件
   */
  getAll(): Plugin[] {
    return Array.from(this.plugins.values());
  }

  /**
   * 获取启用的插件
   */
  getEnabled(): Plugin[] {
    return Array.from(this.plugins.values()).filter((p) => p.enabled);
  }

  /**
   * 按分类获取插件
   */
  getByCategory(category: string): Plugin[] {
    return Array.from(this.plugins.values()).filter((p) => p.category === category);
  }
}

export const pluginManager = new PluginManager();
