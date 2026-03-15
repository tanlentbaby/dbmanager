/**
 * 导出功能 API
 * 支持 CSV, JSON, Excel, Markdown 格式导出
 */

import { IncomingMessage, ServerResponse } from 'http';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

export type ExportFormat = 'csv' | 'json' | 'excel' | 'markdown' | 'sql';

export interface ExportResult {
  fileId: string;
  format: ExportFormat;
  filename: string;
  size: number;
  createdAt: number;
  expiresAt: number;
}

export interface QueryResult {
  columns: string[];
  rows: unknown[][];
  rowCount?: number;
  duration?: number;
}

const TEMP_DIR = path.join(process.cwd(), 'dist', 'web', 'temp');
const EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 小时过期

/**
 * 确保临时目录存在
 */
function ensureTempDir(): void {
  if (!fs.existsSync(TEMP_DIR)) {
    fs.mkdirSync(TEMP_DIR, { recursive: true });
  }
}

/**
 * 清理过期的导出文件
 */
export function cleanupExpiredFiles(): void {
  ensureTempDir();
  
  const files = fs.readdirSync(TEMP_DIR);
  const now = Date.now();
  
  files.forEach(file => {
    const filePath = path.join(TEMP_DIR, file);
    const stat = fs.statSync(filePath);
    
    if (now - stat.mtimeMs > EXPIRY_MS) {
      fs.unlinkSync(filePath);
    }
  });
}

/**
 * 导出为 CSV
 */
function exportToCsv(result: QueryResult): string {
  const lines: string[] = [];
  
  // 表头
  lines.push(result.columns.map(col => escapeCsv(col)).join(','));
  
  // 数据行
  result.rows.forEach(row => {
    lines.push(row.map(cell => {
      if (cell === null || cell === undefined) {
        return '';
      }
      return escapeCsv(String(cell));
    }).join(','));
  });
  
  return lines.join('\n');
}

/**
 * CSV 转义
 */
function escapeCsv(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/**
 * 导出为 JSON
 */
function exportToJson(result: QueryResult): string {
  const objects = result.rows.map(row => {
    const obj: Record<string, unknown> = {};
    result.columns.forEach((col, i) => {
      obj[col] = row[i];
    });
    return obj;
  });
  
  return JSON.stringify(objects, null, 2);
}

/**
 * 导出为 Markdown 表格
 */
function exportToMarkdown(result: QueryResult): string {
  const lines: string[] = [];
  
  // 表头
  lines.push(`| ${result.columns.join(' | ')} |`);
  
  // 分隔线
  lines.push(`| ${result.columns.map(() => '---').join(' | ')} |`);
  
  // 数据行
  result.rows.forEach(row => {
    lines.push(`| ${row.map(cell => {
      const str = cell === null || cell === undefined ? 'NULL' : String(cell);
      return str.replace('|', '\\|');
    }).join(' | ')} |`);
  });
  
  return lines.join('\n');
}

/**
 * 导出为 SQL INSERT 语句
 */
function exportToSql(result: QueryResult, tableName: string = 'table'): string {
  const lines: string[] = [];
  
  result.rows.forEach(row => {
    const values = row.map(cell => {
      if (cell === null || cell === undefined) {
        return 'NULL';
      }
      if (typeof cell === 'number') {
        return String(cell);
      }
      return `'${String(cell).replace(/'/g, "''")}'`;
    });
    
    lines.push(`INSERT INTO ${tableName} (${result.columns.join(', ')}) VALUES (${values.join(', ')});`);
  });
  
  return lines.join('\n');
}

/**
 * 导出为 Excel (简化版，使用 CSV 但带 BOM)
 * 完整 Excel 需要 xlsx 库
 */
function exportToExcel(result: QueryResult): Buffer {
  const csv = exportToCsv(result);
  // 添加 UTF-8 BOM 以便 Excel 正确识别中文
  return Buffer.concat([
    Buffer.from([0xEF, 0xBB, 0xBF]),
    Buffer.from(csv, 'utf8')
  ]);
}

/**
 * 执行导出
 */
export function exportResult(
  result: QueryResult,
  format: ExportFormat,
  tableName?: string
): { content: Buffer | string; filename: string; mimeType: string } {
  let content: Buffer | string;
  let filename: string;
  let mimeType: string;
  
  switch (format) {
    case 'csv':
      content = exportToCsv(result);
      filename = `export_${Date.now()}.csv`;
      mimeType = 'text/csv; charset=utf-8';
      break;
      
    case 'json':
      content = exportToJson(result);
      filename = `export_${Date.now()}.json`;
      mimeType = 'application/json; charset=utf-8';
      break;
      
    case 'excel':
      content = exportToExcel(result);
      filename = `export_${Date.now()}.csv`;
      mimeType = 'application/vnd.ms-excel; charset=utf-8';
      break;
      
    case 'markdown':
      content = exportToMarkdown(result);
      filename = `export_${Date.now()}.md`;
      mimeType = 'text/markdown; charset=utf-8';
      break;
      
    case 'sql':
      content = exportToSql(result, tableName);
      filename = `export_${Date.now()}.sql`;
      mimeType = 'application/sql; charset=utf-8';
      break;
      
    default:
      throw new Error(`Unsupported export format: ${format}`);
  }
  
  return { content, filename, mimeType };
}

/**
 * 保存导出文件并返回文件 ID
 */
export function saveExportFile(
  result: QueryResult,
  format: ExportFormat,
  tableName?: string
): ExportResult {
  ensureTempDir();
  
  const { content, filename } = exportResult(result, format, tableName);
  const fileId = crypto.randomBytes(16).toString('hex');
  const filePath = path.join(TEMP_DIR, `${fileId}_${filename}`);
  
  // 写入文件
  if (typeof content === 'string') {
    fs.writeFileSync(filePath, content, 'utf8');
  } else {
    fs.writeFileSync(filePath, content);
  }
  
  const stat = fs.statSync(filePath);
  const now = Date.now();
  
  return {
    fileId,
    format,
    filename,
    size: stat.size,
    createdAt: now,
    expiresAt: now + EXPIRY_MS,
  };
}

/**
 * 获取导出文件
 */
export function getExportFile(fileId: string): { content: Buffer; filename: string; mimeType: string } | null {
  ensureTempDir();
  
  const files = fs.readdirSync(TEMP_DIR);
  const matchingFile = files.find(f => f.startsWith(fileId));
  
  if (!matchingFile) {
    return null;
  }
  
  const filePath = path.join(TEMP_DIR, matchingFile);
  const content = fs.readFileSync(filePath);
  
  // 从文件名推断格式
  const format = matchingFile.endsWith('.csv') ? 'csv' :
                 matchingFile.endsWith('.json') ? 'json' :
                 matchingFile.endsWith('.md') ? 'markdown' :
                 matchingFile.endsWith('.sql') ? 'sql' : 'csv';
  
  const mimeTypes: Record<string, string> = {
    csv: 'text/csv; charset=utf-8',
    json: 'application/json; charset=utf-8',
    md: 'text/markdown; charset=utf-8',
    sql: 'application/sql; charset=utf-8',
  };
  
  return {
    content,
    filename: matchingFile.replace(`${fileId}_`, ''),
    mimeType: mimeTypes[format] || 'application/octet-stream',
  };
}

/**
 * 处理导出 API 请求
 */
export async function handleExportApi(
  path: string,
  method: string,
  req: IncomingMessage,
  res: ServerResponse,
  readBody: (req: IncomingMessage) => Promise<string>
): Promise<{ success: boolean; data?: unknown; error?: string }> {
  res.setHeader('Content-Type', 'application/json');

  try {
    // POST /api/export - 创建导出
    if (path === 'export' && method === 'POST') {
      const body = await readBody(req);
      const { result, format, tableName } = JSON.parse(body);
      
      if (!result || !result.columns || !result.rows) {
        return { success: false, error: 'Invalid result data' };
      }
      
      const exportFormat: ExportFormat = format || 'csv';
      const exportResult = saveExportFile(result, exportFormat, tableName);
      
      return { success: true, data: exportResult };
    }

    // GET /api/export/:fileId - 获取导出文件信息
    const fileMatch = path.match(/^export\/([a-f0-9]+)$/);
    if (fileMatch && method === 'GET') {
      const fileId = fileMatch[1];
      const file = getExportFile(fileId);
      
      if (!file) {
        return { success: false, error: 'File not found or expired' };
      }
      
      return { success: true, data: { fileId, filename: file.filename } };
    }

    // GET /api/export/:fileId/download - 下载导出文件
    const downloadMatch = path.match(/^export\/([a-f0-9]+)\/download$/);
    if (downloadMatch && method === 'GET') {
      const fileId = downloadMatch[1];
      const file = getExportFile(fileId);
      
      if (!file) {
        res.setHeader('Content-Type', 'application/json');
        return { success: false, error: 'File not found or expired' };
      }
      
      // 设置下载头
      res.setHeader('Content-Type', file.mimeType);
      res.setHeader('Content-Disposition', `attachment; filename="${file.filename}"`);
      res.writeHead(200);
      
      if (file.content instanceof Buffer) {
        res.end(file.content);
      } else {
        res.end(file.content);
      }
      
      // 返回特殊标记表示已直接响应
      throw new Error('DIRECT_RESPONSE');
    }

    return { success: false, error: 'Not found' };
  } catch (error) {
    if (error instanceof Error && error.message === 'DIRECT_RESPONSE') {
      throw error;
    }
    
    const message = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, error: message };
  }
}
