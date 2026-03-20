/**
 * 数据库连接管理器
 * v1.2.0 - 多数据库连接管理
 */

import { DatabaseDriverFactory, DatabaseConfig, DatabaseDriver, DatabaseType } from './database'

export interface ConnectionInfo {
  id: string
  name: string
  config: DatabaseConfig
  connected: boolean
  createdAt: number
  lastUsed?: number
}

export class ConnectionManager {
  private connections: Map<string, ConnectionInfo> = new Map()
  private drivers: Map<string, DatabaseDriver> = new Map()

  /**
   * 创建连接
   */
  async createConnection(name: string, config: DatabaseConfig): Promise<ConnectionInfo> {
    const id = `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    const connection: ConnectionInfo = {
      id,
      name,
      config,
      connected: false,
      createdAt: Date.now(),
    }

    this.connections.set(id, connection)
    return connection
  }

  /**
   * 连接数据库
   */
  async connect(connectionId: string): Promise<void> {
    const connection = this.connections.get(connectionId)
    if (!connection) {
      throw new Error('连接不存在')
    }

    const driver = DatabaseDriverFactory.create(connection.config.type)
    await driver.connect(connection.config)
    
    this.drivers.set(connectionId, driver)
    connection.connected = true
    connection.lastUsed = Date.now()
  }

  /**
   * 断开连接
   */
  async disconnect(connectionId: string): Promise<void> {
    const driver = this.drivers.get(connectionId)
    if (driver) {
      await driver.disconnect()
      this.drivers.delete(connectionId)
    }

    const connection = this.connections.get(connectionId)
    if (connection) {
      connection.connected = false
    }
  }

  /**
   * 删除连接
   */
  async deleteConnection(connectionId: string): Promise<void> {
    await this.disconnect(connectionId)
    this.connections.delete(connectionId)
  }

  /**
   * 获取连接
   */
  getConnection(connectionId: string): ConnectionInfo | undefined {
    return this.connections.get(connectionId)
  }

  /**
   * 获取所有连接
   */
  getConnections(): ConnectionInfo[] {
    return Array.from(this.connections.values())
  }

  /**
   * 获取驱动
   */
  getDriver(connectionId: string): DatabaseDriver | undefined {
    return this.drivers.get(connectionId)
  }

  /**
   * 测试连接
   */
  async testConnection(config: DatabaseConfig): Promise<{ success: boolean; error?: string }> {
    try {
      const driver = DatabaseDriverFactory.create(config.type)
      await driver.connect(config)
      await driver.query('SELECT 1')
      await driver.disconnect()
      return { success: true }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  }

  /**
   * 获取支持的数据库类型
   */
  getSupportedTypes(): DatabaseType[] {
    return DatabaseDriverFactory.getSupportedTypes()
  }

  /**
   * 获取类型信息
   */
  getTypeInfo(type: DatabaseType) {
    return DatabaseDriverFactory.getTypeInfo(type)
  }
}

export const connectionManager = new ConnectionManager()
export default connectionManager
