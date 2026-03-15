/**
 * 导出工具 - 支持多种格式
 */

import fs from 'fs/promises';
import { TableFormatter } from './formatter.js';

export type ExportFormat = 'csv' | 'json' | 'markdown' | 'table' | 'sql';

export interface ExportOptions {
  format: ExportFormat;
  outputPath?: string;
  columns: string[];
  rows: unknown[][];
}

export class ExportManager {
  private tableFormatter: TableFormatter;

  constructor() {
    this.tableFormatter = new TableFormatter();
  }

  /**
   * 导出数据
   */
  async export(options: ExportOptions): Promise<string> {
    const { format, outputPath } = options;

    let content: string;

    switch (format) {
      case 'csv':
        content = this.exportCsv(options.columns, options.rows);
        break;
      case 'json':
        content = this.exportJson(options.columns, options.rows);
        break;
      case 'markdown':
        content = this.exportMarkdown(options.columns, options.rows);
        break;
      case 'table':
        content = this.tableFormatter.formatTable(options.columns, options.rows);
        break;
      case 'sql':
        content = this.exportSql(options.columns, options.rows);
        break;
      default:
        throw new Error(`不支持的导出格式：${format}`);
    }

    // 如果指定了输出路径，写入文件
    if (outputPath) {
      await fs.writeFile(outputPath, content, 'utf-8');
      return `✓ 已导出到：${outputPath}`;
    }

    return content;
  }

  /**
   * 导出为 CSV
   */
  private exportCsv(columns: string[], rows: unknown[][]): string {
    const lines: string[] = [];

    // 表头
    lines.push(columns.map(this.escapeCsv).join(','));

    // 数据行
    for (const row of rows) {
      lines.push(row.map(v => this.escapeCsv(v === null ? '' : v)).join(','));
    }

    return lines.join('\n') + '\n';
  }

  /**
   * 导出为 JSON
   */
  private exportJson(columns: string[], rows: unknown[][]): string {
    if (columns.length === 0) {
      return '[]\n';
    }

    const data = rows.map(row => {
      const obj: Record<string, unknown> = {};
      columns.forEach((col, i) => {
        obj[col] = row[i];
      });
      return obj;
    });

    return JSON.stringify(data, null, 2) + '\n';
  }

  /**
   * 导出为 Markdown 表格
   */
  private exportMarkdown(columns: string[], rows: unknown[][]): string {
    if (columns.length === 0) {
      return '';
    }

    const lines: string[] = [];

    // 表头
    lines.push('| ' + columns.join(' | ') + ' |');

    // 分隔线
    lines.push('| ' + columns.map(() => '---').join(' | ') + ' |');

    // 数据行
    for (const row of rows) {
      lines.push('| ' + row.map(v => String(v === null ? '' : v)).join(' | ') + ' |');
    }

    return lines.join('\n') + '\n';
  }

  /**
   * 导出为 SQL INSERT 语句
   */
  private exportSql(columns: string[], rows: unknown[][]): string {
    if (columns.length === 0 || rows.length === 0) {
      return '-- 无数据可导出\n';
    }

    const lines: string[] = [];
    lines.push('-- 导出数据');
    lines.push(`-- 生成时间：${new Date().toISOString()}`);
    lines.push('');

    for (const row of rows) {
      const values = row.map(v => this.escapeSqlValue(v)).join(', ');
      lines.push(`INSERT INTO table_name (${columns.join(', ')}) VALUES (${values});`);
    }

    return lines.join('\n') + '\n';
  }

  /**
   * CSV 转义
   */
  private escapeCsv(value: unknown): string {
    const str = String(value);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  }

  /**
   * SQL 值转义
   */
  private escapeSqlValue(value: unknown): string {
    if (value === null || value === undefined) {
      return 'NULL';
    }

    const str = String(value);
    // 简单的 SQL 转义
    const escaped = str.replace(/'/g, "''");
    return `'${escaped}'`;
  }

  /**
   * 获取支持的格式列表
   */
  getSupportedFormats(): ExportFormat[] {
    return ['csv', 'json', 'markdown', 'table', 'sql'];
  }
}
