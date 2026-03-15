/**
 * DBManager 核心类型定义
 */

// 数据库连接配置
export interface DbConfig {
  type: 'mysql' | 'postgresql' | 'sqlite';
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
  connectTimeout?: number;
}

// 配置实例
export interface ConfigInstance {
  type: string;
  host: string;
  port: number;
  username: string;
  password: string;  // 加密存储
  database: string;
  [key: string]: unknown;
}

// 配置数据结构
export interface ConfigData {
  version: string;
  defaultInstance?: string;
  instances: Record<string, ConfigInstance>;
  settings: Settings;
}

// 应用设置
export interface Settings {
  maxDisplayRows: number;
  outputFormat: 'table' | 'json' | 'csv' | 'markdown';
  showExecutionTime: boolean;
  syntaxHighlight: boolean;
  historySize: number;
  connectTimeout: number;
}

// 列信息
export interface ColumnInfo {
  name: string;
  type: string;
  nullable: boolean;
  default?: string;
  autoIncrement: boolean;
  primaryKey: boolean;
  length?: number;
}

// 表结构信息
export interface TableSchema {
  tableName: string;
  columns: ColumnInfo[];
  primaryKeys: string[];
  indexes: IndexInfo[];
}

// 索引信息
export interface IndexInfo {
  name: string;
  columns: string[];
  unique: boolean;
  primary: boolean;
}

// 查询结果
export interface QueryResult {
  columns: string[];
  rows: unknown[][];
  affectedRows: number;
  executionTimeMs: number;
}

// 连接测试结果
export interface ConnectionTestResult {
  success: boolean;
  dbType: string;
  version: string;
  message: string;
  latencyMs: number;
}

// 数据库连接
export interface DatabaseConnection {
  dbType: string;
  host: string;
  port: number;
  username: string;
  database: string;
  connection: unknown;
  close(): void;
}

// 查询计划结果
export interface ExplainResult {
  planType: 'mysql' | 'postgresql' | 'sqlite';
  columns: string[];
  rows: unknown[][];
}
