/**
 * 配置管理器 - 管理数据库连接配置
 */

import Conf from 'conf';
import keytar from 'keytar';
import { ConfigData, ConfigInstance, Settings, DbConfig } from '../types.js';

const SERVICE_NAME = 'dbmanager';

export class ConfigManager {
  private config: Conf<ConfigData>;
  private serviceName: string;

  constructor() {
    this.serviceName = SERVICE_NAME;
    this.config = new Conf<ConfigData>({
      projectName: 'dbmanager',
      defaults: this.defaultConfig(),
    });
  }

  private defaultConfig(): ConfigData {
    return {
      version: '1.0',
      defaultInstance: undefined,
      instances: {},
      settings: {
        maxDisplayRows: 100,
        outputFormat: 'table',
        showExecutionTime: true,
        syntaxHighlight: true,
        historySize: 1000,
        connectTimeout: 10,
      },
    };
  }

  /**
   * 列出所有配置（不包含解密后的密码）
   */
  listConfigs(): Record<string, ConfigInstance> {
    return this.config.get('instances', {});
  }

  /**
   * 获取指定配置
   */
  async getConfig(name: string): Promise<DbConfig | undefined> {
    const instances = this.config.get('instances', {});
    const config = instances[name];
    if (!config) return undefined;

    // 从系统密钥链解密密码
    const password = await keytar.getPassword(this.serviceName, name);

    return {
      type: config.type as 'mysql' | 'postgresql' | 'sqlite',
      host: config.host,
      port: config.port,
      username: config.username,
      password: password || '',
      database: config.database,
      connectTimeout: config.connectTimeout as number | undefined,
    };
  }

  /**
   * 添加配置
   */
  async addConfig(
    name: string,
    dbType: string,
    host: string,
    port: number,
    username: string,
    password: string,
    database: string = ''
  ): Promise<boolean> {
    const instances = this.config.get('instances', {});
    if (instances[name]) {
      return false;
    }

    // 将密码存储到系统密钥链
    await keytar.setPassword(this.serviceName, name, password);

    const config: ConfigInstance = {
      type: dbType,
      host,
      port,
      username,
      password: '', // 密码已存储到密钥链，这里留空
      database,
    };

    this.config.set(`instances.${name}`, config);
    return true;
  }

  /**
   * 更新配置
   */
  async updateConfig(
    name: string,
    updates: Partial<ConfigInstance> & { password?: string }
  ): Promise<boolean> {
    const instances = this.config.get('instances', {});
    if (!instances[name]) {
      return false;
    }

    const config = instances[name];

    // 如果更新了密码，需要存储到密钥链
    if (updates.password) {
      await keytar.setPassword(this.serviceName, name, updates.password);
      delete updates.password; // 不保存到配置文件
    }

    this.config.set(`instances.${name}`, { ...config, ...updates });
    return true;
  }

  /**
   * 删除配置
   */
  async removeConfig(name: string): Promise<boolean> {
    const instances = this.config.get('instances', {});
    if (!instances[name]) {
      return false;
    }

    // 从密钥链删除密码
    await keytar.deletePassword(this.serviceName, name);
    this.config.set(`instances.${name}`, undefined as unknown as ConfigInstance);
    return true;
  }

  /**
   * 获取默认实例
   */
  getDefaultInstance(): string | undefined {
    return this.config.get('defaultInstance');
  }

  /**
   * 设置默认实例
   */
  setDefaultInstance(name: string): boolean {
    const instances = this.config.get('instances', {});
    if (!instances[name]) {
      return false;
    }
    this.config.set('defaultInstance', name);
    return true;
  }

  /**
   * 获取设置
   */
  get settings(): Settings {
    return this.config.get('settings');
  }

  /**
   * 更新设置
   */
  updateSettings(updates: Partial<Settings>): void {
    this.config.set('settings', { ...this.config.get('settings'), ...updates });
  }
}
