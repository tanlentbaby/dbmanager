/**
 * 表格格式化工具
 */

export class TableFormatter {
  /**
   * 格式化表格输出
   */
  formatTable(columns: string[], rows: unknown[][]): string {
    if (rows.length === 0) {
      return '';
    }

    // 计算每列的最大宽度
    const colWidths = columns.map((col, i) => {
      const maxWidth = rows.reduce((max, row) => {
        const cell = row[i] ?? '';
        return Math.max(max, String(cell).length);
      }, col.length);
      return Math.min(maxWidth, 100); // 限制最大宽度
    });

    const lines: string[] = [];

    // 顶边框
    const topBorder = '┌─' + colWidths.map(w => '─'.repeat(w)).join('─┬─') + '─┐';
    lines.push(topBorder);

    // 表头
    const header = '│ ' + columns.map((col, i) => col.padEnd(colWidths[i])).join(' │ ') + ' │';
    lines.push(header);

    // 分隔线
    const separator = '├─' + colWidths.map(w => '─'.repeat(w)).join('─┼─') + '─┤';
    lines.push(separator);

    // 数据行
    for (const row of rows) {
      const rowStr = '│ ' + row.map((cell, i) => {
        const str = cell === null || cell === undefined ? 'NULL' : String(cell);
        return str.padEnd(colWidths[i]);
      }).join(' │ ') + ' │';
      lines.push(rowStr);
    }

    // 底边框
    const bottomBorder = '└─' + colWidths.map(w => '─'.repeat(w)).join('─┴─') + '─┘';
    lines.push(bottomBorder);

    return lines.join('\n') + '\n';
  }

  /**
   * 格式化 JSON 输出
   */
  formatJson(columns: string[], rows: unknown[][]): string {
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
   * 格式化 CSV 输出
   */
  formatCsv(columns: string[], rows: unknown[][]): string {
    const lines: string[] = [];

    // 表头
    lines.push(columns.map(this.escapeCsv).join(','));

    // 数据行
    for (const row of rows) {
      lines.push(row.map(v => this.escapeCsv(v === null ? '' : v)).join(','));
    }

    return lines.join('\n') + '\n';
  }

  private escapeCsv(value: unknown): string {
    const str = String(value);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  }

  /**
   * 格式化 Markdown 表格
   */
  formatMarkdown(columns: string[], rows: unknown[][]): string {
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
}
