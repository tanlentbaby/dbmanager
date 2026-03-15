/**
 * 配置管理 API
 * 支持配置的 CRUD 操作
 */

import { IncomingMessage, ServerResponse } from 'http';
import { ConfigManager } from '../../config/manager.js';
import { ConnectionManager } from '../../database/connection.js';

export interface ConfigInfo {
  name: string;
  type: string;
  host?: string;
  port?: number;
  database?: string;
  username?: string;
  lastUsed?: number;
  createdAt?: number;
}

/**
 * 处理配置 API 请求
 */
export async function handleConfigsApi(
  path: string,
  method: string,
  req: IncomingMessage,
  res: ServerResponse,
  configManager: ConfigManager,
  connectionManager: ConnectionManager,
  readBody: (req: IncomingMessage) => Promise<string>
): Promise<{ success: boolean; data?: unknown; error?: string }> {
  res.setHeader('Content-Type', 'application/json');

  try {
    // GET /api/configs - 获取所有配置
    if (path === 'configs' && method === 'GET') {
      const configs = configManager.listConfigs();
      const configList: ConfigInfo[] = configs.map(c => ({
        name: c.name,
        type: c.type,
        host: c.host,
        port: c.port,
        database: c.database,
        username: c.username,
        lastUsed: c.lastUsed,
        createdAt: c.createdAt,
      }));
      
      return { success: true, data: configList };
    }

    // POST /api/configs - 创建新配置
    if (path === 'configs' && method === 'POST') {
      const body = await readBody(req);
      const config = JSON.parse(body);
      
      // 验证必填字段
      if (!config.name || !config.type) {
        return { success: false, error: 'name and type are required' };
      }
      
      configManager.addConfig(config);
      const configs = configManager.listConfigs();
      const created = configs.find(c => c.name === config.name);
      
      return { success: true, data: created };
    }

    // GET /api/configs/:name - 获取单个配置
    const configMatch = path.match(/^configs\/([^/]+)$/);
    if (configMatch && method === 'GET') {
      const name = configMatch[1];
      const configs = configManager.listConfigs();
      const config = configs.find(c => c.name === name);
      
      if (!config) {
        return { success: false, error: 'Config not found' };
      }
      
      return { success: true, data: config };
    }

    // PUT /api/configs/:name - 更新配置
    if (configMatch && method === 'PUT') {
      const name = configMatch[1];
      const body = await readBody(req);
      const updates = JSON.parse(body);
      
      const configs = configManager.listConfigs();
      const config = configs.find(c => c.name === name);
      
      if (!config) {
        return { success: false, error: 'Config not found' };
      }
      
      // 更新配置
      const updatedConfig = { ...config, ...updates };
      configManager.removeConfig(name);
      configManager.addConfig(updatedConfig);
      
      return { success: true, data: updatedConfig };
    }

    // DELETE /api/configs/:name - 删除配置
    if (configMatch && method === 'DELETE') {
      const name = configMatch[1];
      
      const configs = configManager.listConfigs();
      const config = configs.find(c => c.name === name);
      
      if (!config) {
        return { success: false, error: 'Config not found' };
      }
      
      configManager.removeConfig(name);
      return { success: true, data: { deleted: name } };
    }

    // POST /api/configs/:name/test - 测试连接
    const testMatch = path.match(/^configs\/([^/]+)\/test$/);
    if (testMatch && method === 'POST') {
      const name = testMatch[1];
      
      const configs = configManager.listConfigs();
      const config = configs.find(c => c.name === name);
      
      if (!config) {
        return { success: false, error: 'Config not found' };
      }
      
      try {
        const startTime = Date.now();
        await connectionManager.connect(name);
        const duration = Date.now() - startTime;
        
        // 测试查询
        await connectionManager.execute('SELECT 1');
        
        return { 
          success: true, 
          data: { 
            connected: name, 
            duration,
            message: 'Connection successful' 
          } 
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        return { 
          success: false, 
          error: `Connection failed: ${message}` 
        };
      }
    }

    // POST /api/configs/import - 导入配置
    if (path === 'configs/import' && method === 'POST') {
      const body = await readBody(req);
      const { configs: importedConfigs } = JSON.parse(body);
      
      if (!Array.isArray(importedConfigs)) {
        return { success: false, error: 'Invalid configs format' };
      }
      
      let imported = 0;
      importedConfigs.forEach((config: unknown) => {
        try {
          configManager.addConfig(config as Record<string, unknown>);
          imported++;
        } catch {
          // Skip invalid configs
        }
      });
      
      return { success: true, data: { imported } };
    }

    // GET /api/configs/export - 导出配置
    if (path === 'configs/export' && method === 'GET') {
      const configs = configManager.listConfigs();
      
      // 移除敏感信息
      const exported = configs.map(c => ({
        name: c.name,
        type: c.type,
        host: c.host,
        port: c.port,
        database: c.database,
        username: c.username,
      }));
      
      return { success: true, data: { configs: exported } };
    }

    return { success: false, error: 'Not found' };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, error: message };
  }
}
