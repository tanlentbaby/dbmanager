/**
 * TableFormatter 单元测试
 */

import { describe, it, expect } from '@jest/globals';
import { TableFormatter } from '../../src/ts/utils/formatter.js';

describe('TableFormatter', () => {
  const formatter = new TableFormatter();

  describe('formatTable', () => {
    it('应该格式化简单的表格', () => {
      const columns = ['id', 'name'];
      const rows = [[1, 'Alice'], [2, 'Bob']];
      
      const result = formatter.formatTable(columns, rows);
      
      expect(result).toContain('id');
      expect(result).toContain('name');
      expect(result).toContain('Alice');
      expect(result).toContain('Bob');
      expect(result).toContain('┌');
      expect(result).toContain('┘');
    });

    it('应该处理空行', () => {
      const columns = ['id'];
      const rows: unknown[][] = [];
      
      const result = formatter.formatTable(columns, rows);
      expect(result).toBe('');
    });
  });

  describe('formatJson', () => {
    it('应该格式化为 JSON 数组', () => {
      const columns = ['id', 'name'];
      const rows = [[1, 'Alice'], [2, 'Bob']];
      
      const result = formatter.formatJson(columns, rows);
      const parsed = JSON.parse(result);
      
      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed.length).toBe(2);
      expect(parsed[0]).toEqual({ id: 1, name: 'Alice' });
    });

    it('应该处理空列', () => {
      const columns: string[] = [];
      const rows: unknown[][] = [];
      
      const result = formatter.formatJson(columns, rows);
      expect(result).toBe('[]\n');
    });
  });

  describe('formatCsv', () => {
    it('应该格式化为 CSV', () => {
      const columns = ['id', 'name'];
      const rows = [[1, 'Alice'], [2, 'Bob']];
      
      const result = formatter.formatCsv(columns, rows);
      const lines = result.trim().split('\n');
      
      expect(lines[0]).toBe('id,name');
      expect(lines[1]).toBe('1,Alice');
      expect(lines[2]).toBe('2,Bob');
    });

    it('应该转义包含逗号的值', () => {
      const columns = ['name'];
      const rows = [['Smith, John']];
      
      const result = formatter.formatCsv(columns, rows);
      expect(result).toContain('"Smith, John"');
    });
  });

  describe('formatMarkdown', () => {
    it('应该格式化为 Markdown 表格', () => {
      const columns = ['id', 'name'];
      const rows = [[1, 'Alice']];
      
      const result = formatter.formatMarkdown(columns, rows);
      const lines = result.trim().split('\n');
      
      expect(lines[0]).toBe('| id | name |');
      expect(lines[1]).toBe('| --- | --- |');
      expect(lines[2]).toBe('| 1 | Alice |');
    });
  });
});
