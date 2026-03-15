/**
 * Schema 插件 - 数据库结构浏览
 * 提供 /schema 命令查看数据库结构
 */

import type { DBManagerPlugin, CommandContext, CommandDefinition } from '../types.js';

export const schemaPlugin: DBManagerPlugin = {
  name: 'schema',
  version: '1.0.0',
  description: '数据库 Schema 浏览插件',
  
  commands: [
    {
      name: '/schema',
      description: '查看数据库 schema 结构',
      usage: '/schema [table]',
      handler: async (args, context) => {
        const tableName = args[0];
        
        if (tableName) {
          // 查看特定表结构
          return await showTableSchema(tableName, context);
        } else {
          // 查看所有表
          return await showAllTables(context);
        }
      },
    },
    {
      name: '/schema:tree',
      description: '以树形结构展示 schema',
      usage: '/schema:tree',
      handler: async (_, context) => {
        return await showSchemaTree(context);
      },
    },
    {
      name: '/schema:indexes <table>',
      description: '查看表的索引',
      usage: '/schema:indexes <table>',
      handler: async (args, context) => {
        const tableName = args[0];
        if (!tableName) {
          return { output: '❌ 请指定表名', exitCode: 1 };
        }
        return await showTableIndexes(tableName, context);
      },
    },
  ],
  
  completions: [
    {
      trigger: '/schema',
      provider: async (context) => {
        // 补全子命令
        return [':tree', ':indexes', ':columns'];
      },
    },
    {
      trigger: '/schema:',
      provider: async (context) => {
        // 补全表名
        if (context.connectionManager.isConnected) {
          const tables = await context.connectionManager.getTables();
          return tables;
        }
        return [];
      },
    },
  ],
  
  async onLoad(context) {
    context.logger?.info('[schema-plugin] 插件已加载');
  },
  
  async onUnload() {
    // 清理资源
  },
};

/**
 * 显示所有表
 */
async function showAllTables(context: CommandContext): Promise<{ output: string; exitCode: number }> {
  if (!context.connectionManager.isConnected) {
    return { output: '❌ 未连接数据库', exitCode: 1 };
  }
  
  try {
    const tables = await context.connectionManager.getTables();
    
    if (tables.length === 0) {
      return { output: '📭 当前数据库没有表', exitCode: 0 };
    }
    
    let output = `📊 数据库表列表 (${tables.length} 个表):\n\n`;
    tables.forEach((table, index) => {
      output += `  ${index + 1}. ${table}\n`;
    });
    
    return { output, exitCode: 0 };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return { output: `❌ 获取表列表失败：${message}`, exitCode: 1 };
  }
}

/**
 * 显示表结构
 */
async function showTableSchema(tableName: string, context: CommandContext): Promise<{ output: string; exitCode: number }> {
  if (!context.connectionManager.isConnected) {
    return { output: '❌ 未连接数据库', exitCode: 1 };
  }
  
  try {
    // 获取列信息
    const columns = await context.connectionManager.getColumns(tableName);
    
    if (columns.length === 0) {
      return { output: `❌ 表 '${tableName}' 不存在或无列`, exitCode: 1 };
    }
    
    let output = `📋 表结构：${tableName}\n\n`;
    output += '┌───────┬──────────────┬──────────────┬─────────┬────────┐\n';
    output += '│ #     │ 列名         │ 类型         │ 可空    │ 默认   │\n';
    output += '├───────┼──────────────┼──────────────┼─────────┼────────┤\n';
    
    columns.forEach((col: Record<string, unknown>, index: number) => {
      const name = String(col.name || '').padEnd(12);
      const type = String(col.type || '').padEnd(12);
      const nullable = col.nullable ? 'YES' : 'NO';
      const defaultVal = col.default !== null && col.default !== undefined ? String(col.default).substring(0, 8) : 'NULL';
      
      output += `│ ${String(index + 1).padEnd(5)} │ ${name} │ ${type} │ ${nullable.padEnd(7)} │ ${defaultVal.padEnd(6)} │\n`;
    });
    
    output += '└───────┴──────────────┴──────────────┴─────────┴────────┘\n';
    
    return { output, exitCode: 0 };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return { output: `❌ 获取表结构失败：${message}`, exitCode: 1 };
  }
}

/**
 * 以树形结构展示 schema
 */
async function showSchemaTree(context: CommandContext): Promise<{ output: string; exitCode: number }> {
  if (!context.connectionManager.isConnected) {
    return { output: '❌ 未连接数据库', exitCode: 1 };
  }
  
  try {
    const tables = await context.connectionManager.getTables();
    
    if (tables.length === 0) {
      return { output: '📭 当前数据库没有表', exitCode: 0 };
    }
    
    let output = '🌳 数据库结构树:\n\n';
    output += 'database\n';
    
    tables.forEach((table, tableIndex) => {
      const isLastTable = tableIndex === tables.length - 1;
      const tablePrefix = isLastTable ? '└─' : '├─';
      output += `${tablePrefix} ${table}\n`;
      
      // 获取列 (简化处理，实际应该批量获取)
      try {
        const columns = await context.connectionManager.getColumns(table);
        
        columns.forEach((col: Record<string, unknown>, colIndex: number) => {
          const isLastCol = colIndex === columns.length - 1;
          const colPrefix = isLastTable ? '  ' : '│ ';
          const colConnector = isLastCol ? '└─' : '├─';
          const colType = col.type ? ` (${col.type})` : '';
          
          output += `${colPrefix}${colConnector} ${col.name}${colType}\n`;
        });
      } catch {
        // 忽略单个表的列获取错误
      }
    });
    
    return { output, exitCode: 0 };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return { output: `❌ 获取结构树失败：${message}`, exitCode: 1 };
  }
}

/**
 * 显示表索引
 */
async function showTableIndexes(tableName: string, context: CommandContext): Promise<{ output: string; exitCode: number }> {
  if (!context.connectionManager.isConnected) {
    return { output: '❌ 未连接数据库', exitCode: 1 };
  }
  
  try {
    // 注意：实际实现需要数据库驱动支持获取索引
    // 这里使用简化实现
    return { 
      output: `📑 表 '${tableName}' 的索引 (功能开发中...)\n\n请使用 SQL 查看:\n  SHOW INDEX FROM ${tableName};`, 
      exitCode: 0 
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return { output: `❌ 获取索引失败：${message}`, exitCode: 1 };
  }
}

export default schemaPlugin;
