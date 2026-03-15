/**
 * 数据库连接管理器
 * 支持单连接模式和连接池模式
 */

import mysql from 'mysql2/promise';
import pg from 'pg';
import Database from 'better-sqlite3';
import { ConfigManager } from '../config/manager.js';
import {
  DatabaseConnection,
  QueryResult,
  TableSchema,
  ColumnInfo,
  IndexInfo,
  ConnectionTestResult,
  ExplainResult,
} from '../types.js';
import { MySqlConnectionPool, PostgresConnectionPool } from './pool.js';

type SqliteDatabase = Database.Database;

export class ConnectionManager {
  private configManager: ConfigManager;
  private currentInstance?: string;
  private currentConnection?: DatabaseConnection;
  private inTransaction = false;
  
  // 连接池（可选）
  private mysqlPool?: MySqlConnectionPool;
  private postgresPool?: PostgresConnectionPool;
  private usePool = false;

  constructor(configManager: ConfigManager) {
    this.configManager = configManager;
  }

  /**
   * 启用连接池
   */
  enablePool(maxConnections: number = 10): void {
    this.usePool = true;
    this.maxConnections = maxConnections;
  }

  private maxConnections = 10;

  /**
   * 连接到指定实例
   */
  async connect(instanceName: string): Promise<DatabaseConnection> {
    const config = await this.configManager.getConfig(instanceName);
    if (!config) {
      throw new Error(`配置不存在：${instanceName}`);
    }

    // 断开当前连接
    if (this.currentConnection) {
      this.disconnect();
    }

    let connection: DatabaseConnection;

    switch (config.type) {
      case 'mysql':
        connection = await this.connectMysql(config);
        break;
      case 'postgresql':
        connection = await this.connectPostgresql(config);
        break;
      case 'sqlite':
        connection = await this.connectSqlite(config);
        break;
      default:
        throw new Error(`不支持的数据库类型：${config.type}`);
    }

    this.currentInstance = instanceName;
    this.currentConnection = connection;
    return connection;
  }

  /**
   * 断开连接
   */
  disconnect(): void {
    if (this.currentConnection) {
      this.currentConnection.close();
      this.currentConnection = undefined;
      this.currentInstance = undefined;
      this.inTransaction = false;
    }
  }

  /**
   * 是否已连接
   */
  get isConnected(): boolean {
    return this.currentConnection !== undefined;
  }

  /**
   * 当前实例名
   */
  get currentInstanceName(): string | undefined {
    return this.currentInstance;
  }

  /**
   * 当前连接
   */
  get connection(): DatabaseConnection | undefined {
    return this.currentConnection;
  }

  /**
   * 是否处于事务中
   */
  get inTransactionState(): boolean {
    return this.inTransaction;
  }

  /**
   * 执行 SQL 语句
   */
  async execute(sql: string): Promise<QueryResult> {
    if (!this.currentConnection) {
      throw new Error('未连接数据库');
    }

    const startTime = Date.now();
    const sqlTrimmed = sql.trim();

    try {
      switch (this.currentConnection.dbType) {
        case 'mysql':
          return await this.executeMysql(sqlTrimmed, startTime);
        case 'postgresql':
          return await this.executePostgresql(sqlTrimmed, startTime);
        case 'sqlite':
          return await this.executeSqlite(sqlTrimmed, startTime);
        default:
          throw new Error(`不支持的数据库类型：${this.currentConnection.dbType}`);
      }
    } catch (error) {
      if (!this.inTransaction) {
        // 非事务模式下自动回滚由驱动处理
      }
      throw error;
    }
  }

  private async executeMysql(sql: string, startTime: number): Promise<QueryResult> {
    const conn = this.currentConnection!.connection as mysql.Connection;
    const [rows, fields] = await conn.execute(sql);

    const isSelect = sql.toUpperCase().startsWith('SELECT') ||
                     sql.toUpperCase().startsWith('SHOW') ||
                     sql.toUpperCase().startsWith('DESCRIBE');

    if (isSelect && Array.isArray(rows)) {
      const columns = fields ? (fields as mysql.FieldPacket[]).map(f => f.name) : [];
      return {
        columns,
        rows: rows.map(row => Object.values(row)),
        affectedRows: rows.length,
        executionTimeMs: Date.now() - startTime,
      };
    } else {
      const result = rows as mysql.OkPacket;
      return {
        columns: [],
        rows: [],
        affectedRows: result?.affectedRows ?? 0,
        executionTimeMs: Date.now() - startTime,
      };
    }
  }

  private async executePostgresql(sql: string, startTime: number): Promise<QueryResult> {
    const client = this.currentConnection!.connection as pg.Client;
    const result = await client.query(sql);

    const isSelect = sql.toUpperCase().startsWith('SELECT') ||
                     sql.toUpperCase().startsWith('SHOW') ||
                     sql.toUpperCase().startsWith('DESCRIBE');

    if (isSelect) {
      return {
        columns: result.fields.map(f => f.name),
        rows: result.rows.map(row => Object.values(row)),
        affectedRows: result.rowCount ?? 0,
        executionTimeMs: Date.now() - startTime,
      };
    } else {
      return {
        columns: [],
        rows: [],
        affectedRows: result.rowCount ?? 0,
        executionTimeMs: Date.now() - startTime,
      };
    }
  }

  private executeSqlite(sql: string, startTime: number): QueryResult {
    const db = this.currentConnection!.connection as SqliteDatabase;

    const sqlUpper = sql.toUpperCase();
    const isSelect = sqlUpper.startsWith('SELECT') ||
                     sqlUpper.startsWith('PRAGMA') ||
                     sqlUpper.startsWith('EXPLAIN');

    if (isSelect) {
      const stmt = db.prepare(sql);
      if (stmt.reader) {
        const rows = stmt.all() as unknown[];
        const columns = stmt.columns().map((c: { name: string }) => c.name);
        return {
          columns,
          rows: rows.map(row => Object.values(row as object)),
          affectedRows: rows.length,
          executionTimeMs: Date.now() - startTime,
        };
      }
    }

    const info = db.prepare(sql).run();
    return {
      columns: [],
      rows: [],
      affectedRows: info.changes ?? 0,
      executionTimeMs: Date.now() - startTime,
    };
  }

  /**
   * 开始事务
   */
  async beginTransaction(): Promise<void> {
    if (!this.currentConnection) {
      throw new Error('未连接数据库');
    }

    switch (this.currentConnection.dbType) {
      case 'sqlite':
        // SQLite 自动开始事务
        break;
      case 'mysql':
      case 'postgresql':
        await this.execute('BEGIN');
        break;
    }

    this.inTransaction = true;
  }

  /**
   * 提交事务
   */
  async commitTransaction(): Promise<void> {
    if (!this.inTransaction) {
      throw new Error('当前没有活动的事务');
    }

    await this.execute('COMMIT');
    this.inTransaction = false;
  }

  /**
   * 回滚事务
   */
  async rollbackTransaction(): Promise<void> {
    if (!this.inTransaction) {
      throw new Error('当前没有活动的事务');
    }

    await this.execute('ROLLBACK');
    this.inTransaction = false;
  }

  /**
   * 获取所有表名
   */
  async getTables(): Promise<string[]> {
    if (!this.currentConnection) return [];

    switch (this.currentConnection.dbType) {
      case 'mysql':
        return this.getTablesMysql();
      case 'postgresql':
        return this.getTablesPostgresql();
      case 'sqlite':
        return this.getTablesSqlite();
      default:
        return [];
    }
  }

  private async getTablesMysql(): Promise<string[]> {
    const conn = this.currentConnection!.connection as mysql.Connection;
    const [rows] = await conn.execute('SHOW TABLES');
    return (rows as Record<string, unknown>[]).map(row => Object.values(row)[0] as string);
  }

  private async getTablesPostgresql(): Promise<string[]> {
    const client = this.currentConnection!.connection as pg.Client;
    const result = await client.query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    return result.rows.map(row => row.table_name);
  }

  private getTablesSqlite(): string[] {
    const db = this.currentConnection!.connection as SqliteDatabase;
    const rows = db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all() as { name: string }[];
    return rows.map(row => row.name);
  }

  /**
   * 获取表的列名
   */
  async getColumns(tableName: string): Promise<string[]> {
    if (!this.currentConnection) return [];

    switch (this.currentConnection.dbType) {
      case 'mysql':
        return this.getColumnsMysql(tableName);
      case 'postgresql':
        return this.getColumnsPostgresql(tableName);
      case 'sqlite':
        return this.getColumnsSqlite(tableName);
      default:
        return [];
    }
  }

  private async getColumnsMysql(tableName: string): Promise<string[]> {
    const conn = this.currentConnection!.connection as mysql.Connection;
    const [rows] = await conn.execute(`DESCRIBE \`${tableName}\``);
    return (rows as Record<string, unknown>[]).map(row => Object.values(row)[0] as string);
  }

  private async getColumnsPostgresql(tableName: string): Promise<string[]> {
    const client = this.currentConnection!.connection as pg.Client;
    const result = await client.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = $1
      ORDER BY ordinal_position
    `, [tableName]);
    return result.rows.map(row => row.column_name);
  }

  private getColumnsSqlite(tableName: string): string[] {
    const db = this.currentConnection!.connection as SqliteDatabase;
    const rows = db.prepare(`PRAGMA table_info(${tableName})`).all() as { name: string }[];
    return rows.map(row => row.name);
  }

  /**
   * 获取表结构
   */
  async getTableSchema(tableName: string): Promise<TableSchema> {
    if (!this.currentConnection) {
      throw new Error('未连接数据库');
    }

    switch (this.currentConnection.dbType) {
      case 'mysql':
        return this.getTableSchemaMysql(tableName);
      case 'postgresql':
        return this.getTableSchemaPostgresql(tableName);
      case 'sqlite':
        return this.getTableSchemaSqlite(tableName);
      default:
        throw new Error(`不支持的数据库类型：${this.currentConnection.dbType}`);
    }
  }

  private async getTableSchemaMysql(tableName: string): Promise<TableSchema> {
    const conn = this.currentConnection!.connection as mysql.Connection;

    // 获取列信息
    const [rows] = await conn.execute(`DESCRIBE \`${tableName}\``);
    const columns: ColumnInfo[] = [];
    const primaryKeys: string[] = [];

    for (const row of rows as unknown[]) {
      const values = Object.values(row as Record<string, unknown>);
      const col: ColumnInfo = {
        name: values[0] as string,
        type: values[1] as string,
        nullable: values[2] === 'YES',
        default: values[3] as string,
        autoIncrement: (values[5] as string)?.includes('auto_increment') ?? false,
        primaryKey: values[3] === 'PRI',
      };
      columns.push(col);
      if (col.primaryKey) primaryKeys.push(col.name);
    }

    // 获取索引信息
    const [indexRows] = await conn.execute(`SHOW INDEX FROM \`${tableName}\``);
    const indexes: IndexInfo[] = [];
    const seenIndexes = new Set<string>();

    for (const row of indexRows as unknown[]) {
      const r = row as Record<string, unknown>;
      const idxName = r.Key_name as string;
      if (!seenIndexes.has(idxName)) {
        seenIndexes.add(idxName);
        indexes.push({
          name: idxName,
          columns: [r.Column_name as string],
          unique: (r.Non_unique as number) === 0,
          primary: idxName === 'PRIMARY',
        });
      } else {
        const idx = indexes.find(i => i.name === idxName);
        if (idx) idx.columns.push(r.Column_name as string);
      }
    }

    return {
      tableName,
      columns,
      primaryKeys,
      indexes,
    };
  }

  private async getTableSchemaPostgresql(tableName: string): Promise<TableSchema> {
    const client = this.currentConnection!.connection as pg.Client;

    // 获取列信息
    const result = await client.query(`
      SELECT
        column_name,
        data_type,
        is_nullable,
        column_default,
        character_maximum_length,
        numeric_precision
      FROM information_schema.columns
      WHERE table_name = $1
      ORDER BY ordinal_position
    `, [tableName]);

    const columns: ColumnInfo[] = [];
    const primaryKeys: string[] = [];

    for (const row of result.rows) {
      let colType = row.data_type;
      if (row.character_maximum_length) {
        colType += `(${row.character_maximum_length})`;
      } else if (row.numeric_precision) {
        colType += `(${row.numeric_precision})`;
      }

      const col: ColumnInfo = {
        name: row.column_name,
        type: colType,
        nullable: row.is_nullable === 'YES',
        default: row.column_default,
        autoIncrement: false,
        primaryKey: false,
      };
      columns.push(col);
    }

    // 获取主键信息
    const pkResult = await client.query(`
      SELECT a.attname
      FROM pg_index i
      JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
      WHERE i.indrelid = $1::regclass AND i.indisprimary
    `, [tableName]);

    for (const row of pkResult.rows) {
      primaryKeys.push(row.attname);
    }

    for (const col of columns) {
      if (primaryKeys.includes(col.name)) {
        col.primaryKey = true;
      }
    }

    return { tableName, columns, primaryKeys, indexes: [] };
  }

  private getTableSchemaSqlite(tableName: string): TableSchema {
    const db = this.currentConnection!.connection as SqliteDatabase;

    // 获取列信息
    const rows = db.prepare(`PRAGMA table_info(${tableName})`).all() as unknown[];
    const columns: ColumnInfo[] = [];
    const primaryKeys: string[] = [];

    for (const row of rows) {
      const r = row as Record<string, unknown>;
      const col: ColumnInfo = {
        name: r.name as string,
        type: r.type as string,
        nullable: (r.notnull as number) === 0,
        default: r.dflt_value as string,
        autoIncrement: false,
        primaryKey: (r.pk as number) === 1,
      };
      columns.push(col);
      if (col.primaryKey) primaryKeys.push(col.name);
    }

    // 获取索引信息
    const indexRows = db.prepare(`PRAGMA index_list(${tableName})`).all() as unknown[];
    const indexes: IndexInfo[] = [];

    for (const idxRow of indexRows) {
      const r = idxRow as Record<string, unknown>;
      const idxName = r.name as string;
      const idxCols = db.prepare(`PRAGMA index_info(${idxName})`).all() as unknown[];
      const cols = idxCols.map(c => (c as Record<string, unknown>).name as string);

      indexes.push({
        name: idxName,
        columns: cols,
        unique: (r.unique as number) === 1,
        primary: (r.seq as number) === 0 && idxName.toLowerCase().includes('pk'),
      });
    }

    return { tableName, columns, primaryKeys, indexes };
  }

  /**
   * 获取查询计划
   */
  async getExplainPlan(sql: string): Promise<ExplainResult> {
    if (!this.currentConnection) {
      throw new Error('未连接数据库');
    }

    const sqlClean = sql.replace(/;$/, '').trim();

    switch (this.currentConnection.dbType) {
      case 'mysql':
        return this.explainMysql(sqlClean);
      case 'postgresql':
        return this.explainPostgresql(sqlClean);
      case 'sqlite':
        return this.explainSqlite(sqlClean);
      default:
        throw new Error(`不支持的数据库类型：${this.currentConnection.dbType}`);
    }
  }

  private async explainMysql(sql: string): Promise<ExplainResult> {
    const conn = this.currentConnection!.connection as mysql.Connection;
    const [rows, fields] = await conn.execute(`EXPLAIN ${sql}`);

    return {
      planType: 'mysql',
      columns: (fields as mysql.FieldPacket[]).map(f => f.name),
      rows: (rows as Record<string, unknown>[]).map(row => Object.values(row)),
    };
  }

  private async explainPostgresql(sql: string): Promise<ExplainResult> {
    const client = this.currentConnection!.connection as pg.Client;
    const result = await client.query(`EXPLAIN ANALYZE ${sql}`);

    return {
      planType: 'postgresql',
      columns: ['Query Plan'],
      rows: result.rows.map(row => [row.query_plan]),
    };
  }

  private explainSqlite(sql: string): ExplainResult {
    const db = this.currentConnection!.connection as SqliteDatabase;
    const rows = db.prepare(`EXPLAIN QUERY PLAN ${sql}`).all() as unknown[];

    return {
      planType: 'sqlite',
      columns: ['id', 'parent', 'notused', 'detail'],
      rows: rows.map(row => {
        const r = row as Record<string, unknown>;
        return [r.id, r.parent, r.notused, r.detail];
      }),
    };
  }

  /**
   * 测试连接
   */
  async testConnection(instanceName: string): Promise<ConnectionTestResult> {
    const config = await this.configManager.getConfig(instanceName);
    if (!config) {
      return {
        success: false,
        dbType: '',
        version: '',
        message: `配置不存在：${instanceName}`,
        latencyMs: 0,
      };
    }

    const startTime = Date.now();

    try {
      let result: ConnectionTestResult;

      switch (config.type) {
        case 'mysql':
          result = await this.testMysql(config);
          break;
        case 'postgresql':
          result = await this.testPostgresql(config);
          break;
        case 'sqlite':
          result = await this.testSqlite(config);
          break;
        default:
          result = {
            success: false,
            dbType: config.type,
            version: '',
            message: `不支持的数据库类型：${config.type}`,
            latencyMs: 0,
          };
      }

      result.latencyMs = Date.now() - startTime;
      return result;
    } catch (error) {
      return {
        success: false,
        dbType: config.type,
        version: '',
        message: error instanceof Error ? error.message : '未知错误',
        latencyMs: Date.now() - startTime,
      };
    }
  }

  private async testMysql(config: { type: string; host: string; port: number; username: string; password: string; database: string }): Promise<ConnectionTestResult> {
    const conn = await mysql.createConnection({
      host: config.host,
      port: config.port,
      user: config.username,
      password: config.password,
      database: config.database,
      connectTimeout: 10000,
    });

    const [rows] = await conn.query('SELECT VERSION()');
    const version = (rows as unknown[])[0] as Record<string, unknown>;

    await conn.end();

    return {
      success: true,
      dbType: 'mysql',
      version: version['VERSION()'] as string,
      message: '连接成功',
      latencyMs: 0,
    };
  }

  private async testPostgresql(config: { type: string; host: string; port: number; username: string; password: string; database: string }): Promise<ConnectionTestResult> {
    const client = new pg.Client({
      host: config.host,
      port: config.port,
      user: config.username,
      password: config.password,
      database: config.database,
      connectionTimeoutMillis: 10000,
    });

    await client.connect();
    const result = await client.query('SELECT VERSION()');
    await client.end();

    return {
      success: true,
      dbType: 'postgresql',
      version: result.rows[0].version,
      message: '连接成功',
      latencyMs: 0,
    };
  }

  private async testSqlite(config: { database: string }): Promise<ConnectionTestResult> {
    const db = new Database(config.database) as SqliteDatabase;
    const row = db.prepare('SELECT sqlite_version()').get() as { sqlite_version: string };
    db.close();

    return {
      success: true,
      dbType: 'sqlite',
      version: `SQLite ${row.sqlite_version}`,
      message: '连接成功',
      latencyMs: 0,
    };
  }

  /**
   * 连接 MySQL（内部方法）
   */
  private async connectMysql(config: { host: string; port: number; username: string; password: string; database: string }): Promise<DatabaseConnection> {
    const conn = await mysql.createConnection({
      host: config.host,
      port: config.port,
      user: config.username,
      password: config.password,
      database: config.database,
      connectTimeout: 10000,
    });

    return {
      dbType: 'mysql',
      host: config.host,
      port: config.port,
      username: config.username,
      database: config.database,
      connection: conn,
      close: () => conn.end(),
    };
  }

  /**
   * 连接 PostgreSQL（内部方法）
   */
  private async connectPostgresql(config: { host: string; port: number; username: string; password: string; database: string }): Promise<DatabaseConnection> {
    const client = new pg.Client({
      host: config.host,
      port: config.port,
      user: config.username,
      password: config.password,
      database: config.database,
    });

    await client.connect();

    return {
      dbType: 'postgresql',
      host: config.host,
      port: config.port,
      username: config.username,
      database: config.database,
      connection: client,
      close: () => client.end(),
    };
  }

  /**
   * 连接 SQLite（内部方法）
   */
  private async connectSqlite(config: { database: string }): Promise<DatabaseConnection> {
    const db = new Database(config.database) as SqliteDatabase;

    return {
      dbType: 'sqlite',
      host: 'localhost',
      port: 0,
      username: '',
      database: config.database,
      connection: db,
      close: () => db.close(),
    };
  }

  /**
   * 切换数据库
   */
  async useDatabase(dbName: string): Promise<void> {
    if (!this.currentConnection) {
      throw new Error('未连接数据库');
    }

    switch (this.currentConnection.dbType) {
      case 'mysql':
        await this.execute(`USE ${dbName}`);
        break;
      case 'postgresql':
        // PostgreSQL 不支持 USE 命令，需要重新连接
        throw new Error('PostgreSQL 不支持切换数据库，请重新连接');
      case 'sqlite':
        // SQLite 需要重新连接
        this.disconnect();
        await this.connect({
          type: 'sqlite',
          host: 'localhost',
          port: 0,
          username: '',
          password: '',
          database: dbName,
        } as any);
        break;
    }
  }
}
