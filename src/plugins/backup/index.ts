/**
 * 备份插件 - 数据库备份/恢复
 * 提供 /backup 命令进行数据库备份
 */

import type { DBManagerPlugin, CommandContext } from '../types.js';
import * as fs from 'fs';
import * as path from 'path';

const BACKUP_DIR = path.join(process.cwd(), 'backups');

export const backupPlugin: DBManagerPlugin = {
  name: 'backup',
  version: '1.0.0',
  description: '数据库备份/恢复插件',
  
  commands: [
    {
      name: '/backup',
      description: '备份当前数据库',
      usage: '/backup [filename]',
      handler: async (args, context) => {
        return await createBackup(args[0], context);
      },
    },
    {
      name: '/backup:list',
      description: '列出所有备份',
      usage: '/backup:list',
      handler: async () => {
        return await listBackups();
      },
    },
    {
      name: '/backup:restore <file>',
      description: '从备份恢复',
      usage: '/backup:restore <filename>',
      handler: async (args, context) => {
        const filename = args[0];
        if (!filename) {
          return { output: '❌ 请指定备份文件', exitCode: 1 };
        }
        return await restoreBackup(filename, context);
      },
    },
    {
      name: '/backup:clean',
      description: '清理旧备份 (保留最近 10 个)',
      usage: '/backup:clean',
      handler: async () => {
        return await cleanOldBackups();
      },
    },
  ],
  
  async onLoad(context) {
    // 确保备份目录存在
    if (!fs.existsSync(BACKUP_DIR)) {
      fs.mkdirSync(BACKUP_DIR, { recursive: true });
    }
    context.logger?.info('[backup-plugin] 插件已加载');
  },
  
  async onUnload() {
    // 清理资源
  },
};

/**
 * 创建备份
 */
async function createBackup(filename: string | undefined, context: CommandContext): Promise<{ output: string; exitCode: number }> {
  if (!context.connectionManager.isConnected) {
    return { output: '❌ 未连接数据库', exitCode: 1 };
  }
  
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const dbName = context.connectionManager.currentInstanceName || 'default';
    const backupFile = filename || `${dbName}_${timestamp}.sql`;
    const backupPath = path.join(BACKUP_DIR, backupFile);
    
    // 获取所有表
    const tables = await context.connectionManager.getTables();
    
    let sql = `-- DBManager Backup\n`;
    sql += `-- Database: ${dbName}\n`;
    sql += `-- Date: ${new Date().toISOString()}\n\n`;
    
    // 导出每个表的结构和数据
    for (const table of tables) {
      sql += `-- Table: ${table}\n`;
      
      // 获取表结构 (简化：使用 CREATE TABLE)
      try {
        const createStmt = await context.connectionManager.execute(`SHOW CREATE TABLE ${table}`);
        if (createStmt?.rows?.[0]) {
          sql += `${createStmt.rows[0][1]};\n\n`;
        }
      } catch {
        // 忽略结构导出错误
      }
      
      // 获取数据
      const data = await context.connectionManager.execute(`SELECT * FROM ${table}`);
      if (data?.rows && data.rows.length > 0) {
        sql += `-- Data\n`;
        for (const row of data.rows) {
          const values = row.map(val => {
            if (val === null || val === undefined) {
              return 'NULL';
            }
            if (typeof val === 'number') {
              return String(val);
            }
            return `'${String(val).replace(/'/g, "''")}'`;
          });
          sql += `INSERT INTO ${table} VALUES (${values.join(', ')});\n`;
        }
        sql += '\n';
      }
    }
    
    // 写入文件
    fs.writeFileSync(backupPath, sql, 'utf8');
    const stats = fs.statSync(backupPath);
    
    return {
      output: `✅ 备份完成\n\n文件：${backupPath}\n大小：${formatSize(stats.size)}\n表数：${tables.length}`,
      exitCode: 0,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return { output: `❌ 备份失败：${message}`, exitCode: 1 };
  }
}

/**
 * 列出备份
 */
async function listBackups(): Promise<{ output: string; exitCode: number }> {
  if (!fs.existsSync(BACKUP_DIR)) {
    return { output: '📭 暂无备份', exitCode: 0 };
  }
  
  const files = fs.readdirSync(BACKUP_DIR)
    .filter(f => f.endsWith('.sql'))
    .sort()
    .reverse();
  
  if (files.length === 0) {
    return { output: '📭 暂无备份', exitCode: 0 };
  }
  
  let output = `📦 备份列表 (${files.length} 个):\n\n`;
  
  files.slice(0, 20).forEach((file, index) => {
    const filePath = path.join(BACKUP_DIR, file);
    const stats = fs.statSync(filePath);
    const date = new Date(stats.mtime).toLocaleString();
    const size = formatSize(stats.size);
    
    output += `  ${index + 1}. ${file}\n`;
    output += `     ${date} • ${size}\n`;
  });
  
  if (files.length > 20) {
    output += `\n  ... 还有 ${files.length - 20} 个备份`;
  }
  
  return { output, exitCode: 0 };
}

/**
 * 恢复备份
 */
async function restoreBackup(filename: string, context: CommandContext): Promise<{ output: string; exitCode: number }> {
  if (!context.connectionManager.isConnected) {
    return { output: '❌ 未连接数据库', exitCode: 1 };
  }
  
  // 查找备份文件
  let backupPath = path.join(BACKUP_DIR, filename);
  
  if (!fs.existsSync(backupPath)) {
    // 尝试绝对路径
    if (fs.existsSync(filename)) {
      backupPath = filename;
    } else {
      return { output: `❌ 备份文件不存在：${filename}`, exitCode: 1 };
    }
  }
  
  try {
    const sql = fs.readFileSync(backupPath, 'utf8');
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));
    
    let success = 0;
    let failed = 0;
    
    for (const stmt of statements) {
      try {
        await context.connectionManager.execute(stmt);
        success++;
      } catch (error) {
        failed++;
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error(`执行失败：${message}`);
      }
    }
    
    return {
      output: `✅ 恢复完成\n\n成功：${success} 条语句\n失败：${failed} 条语句`,
      exitCode: failed > 0 ? 1 : 0,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return { output: `❌ 恢复失败：${message}`, exitCode: 1 };
  }
}

/**
 * 清理旧备份
 */
async function cleanOldBackups(): Promise<{ output: string; exitCode: number }> {
  if (!fs.existsSync(BACKUP_DIR)) {
    return { output: '📭 无需清理', exitCode: 0 };
  }
  
  const files = fs.readdirSync(BACKUP_DIR)
    .filter(f => f.endsWith('.sql'))
    .map(f => ({
      name: f,
      path: path.join(BACKUP_DIR, f),
      time: fs.statSync(path.join(BACKUP_DIR, f)).mtime.getTime(),
    }))
    .sort((a, b) => b.time - a.time);
  
  if (files.length <= 10) {
    return { output: '✓ 无需清理 (备份数 ≤ 10)', exitCode: 0 };
  }
  
  const toDelete = files.slice(10);
  let deleted = 0;
  
  for (const file of toDelete) {
    try {
      fs.unlinkSync(file.path);
      deleted++;
    } catch {
      // 忽略删除失败
    }
  }
  
  return { output: `✓ 已清理 ${deleted} 个旧备份`, exitCode: 0 };
}

/**
 * 格式化文件大小
 */
function formatSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  if (bytes < 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

export default backupPlugin;
