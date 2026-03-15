/**
 * 数据库连接池 - MySQL 版本
 * 提供连接复用和并发控制
 */

import mysql, { Pool as MysqlPool, PoolConnection } from 'mysql2/promise';
import { DbConfig } from '../types.js';

export class MySqlConnectionPool {
  private pool: MysqlPool;
  private maxConnections: number;
  private activeConnections = 0;

  constructor(config: DbConfig, maxConnections: number = 10) {
    this.maxConnections = maxConnections;
    
    this.pool = mysql.createPool({
      host: config.host,
      port: config.port,
      user: config.username,
      password: config.password,
      database: config.database,
      connectionLimit: maxConnections,
      queueLimit: 0,
      connectTimeout: config.connectTimeout || 10000,
      idleTimeout: 600000,
    });

    // 监听池事件
    this.pool.on('connection', () => {
      this.activeConnections++;
    });

    this.pool.on('release', () => {
      this.activeConnections--;
    });
  }

  /**
   * 获取连接
   */
  async getConnection(): Promise<PoolConnection> {
    if (this.activeConnections >= this.maxConnections) {
      throw new Error('连接池已满，请稍后重试');
    }
    return await this.pool.getConnection();
  }

  /**
   * 执行查询（自动获取和释放连接）
   */
  async execute<T = any>(sql: string, params?: any[]): Promise<T> {
    const [rows] = await this.pool.execute(sql, params);
    return rows as T;
  }

  /**
   * 在事务中执行
   */
  async transaction<T>(fn: (connection: PoolConnection) => Promise<T>): Promise<T> {
    const connection = await this.getConnection();
    
    try {
      await connection.beginTransaction();
      const result = await fn(connection);
      await connection.commit();
      return result;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * 获取池状态
   */
  getStatus() {
    return {
      activeConnections: this.activeConnections,
      maxConnections: this.maxConnections,
      availableConnections: this.maxConnections - this.activeConnections,
    };
  }

  /**
   * 关闭连接池
   */
  async close(): Promise<void> {
    await this.pool.end();
  }
}

/**
 * PostgreSQL 连接池
 */
import pg from 'pg';

export class PostgresConnectionPool {
  private pool: pg.Pool;
  private maxConnections: number;

  constructor(config: DbConfig, maxConnections: number = 10) {
    this.maxConnections = maxConnections;

    this.pool = new pg.Pool({
      host: config.host,
      port: config.port,
      user: config.username,
      password: config.password,
      database: config.database,
      max: maxConnections,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: config.connectTimeout || 10000,
    });

    // 监听池事件
    this.pool.on('error', (err) => {
      console.error('PostgreSQL 连接池错误:', err);
    });
  }

  /**
   * 获取连接
   */
  async connect(): Promise<pg.PoolClient> {
    return await this.pool.connect();
  }

  /**
   * 执行查询
   */
  async execute(sql: string, params?: any[]): Promise<pg.QueryResult> {
    return await this.pool.query(sql, params);
  }

  /**
   * 在事务中执行
   */
  async transaction<T>(fn: (client: pg.PoolClient) => Promise<T>): Promise<T> {
    const client = await this.connect();
    
    try {
      await client.query('BEGIN');
      const result = await fn(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * 获取池状态
   */
  getStatus() {
    return {
      totalCount: this.pool.totalCount,
      idleCount: this.pool.idleCount,
      waitingCount: this.pool.waitingCount,
    };
  }

  /**
   * 关闭连接池
   */
  async close(): Promise<void> {
    await this.pool.end();
  }
}
