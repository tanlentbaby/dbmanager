/**
 * SQL 语法高亮工具
 * 为 SQL 语句提供简单的关键字着色
 */

import chalk from 'chalk';

// SQL 关键字列表
const SQL_KEYWORDS = new Set([
  'SELECT', 'FROM', 'WHERE', 'AND', 'OR', 'NOT', 'IN', 'IS', 'NULL',
  'LIKE', 'BETWEEN', 'EXISTS', 'CASE', 'WHEN', 'THEN', 'ELSE', 'END',
  'JOIN', 'INNER', 'LEFT', 'RIGHT', 'OUTER', 'ON', 'AS',
  'GROUP', 'BY', 'HAVING', 'ORDER', 'ASC', 'DESC', 'LIMIT', 'OFFSET',
  'UNION', 'ALL', 'INTERSECT', 'EXCEPT',
  'INSERT', 'INTO', 'VALUES', 'UPDATE', 'SET', 'DELETE',
  'CREATE', 'DROP', 'ALTER', 'TABLE', 'INDEX', 'VIEW', 'TRIGGER',
  'DATABASE', 'SCHEMA', 'PRIMARY', 'KEY', 'FOREIGN', 'REFERENCES',
  'UNIQUE', 'CHECK', 'DEFAULT', 'CONSTRAINT', 'ADD', 'MODIFY',
  'CHANGE', 'RENAME', 'COLUMN', 'IF', 'NULLS', 'FIRST', 'AFTER',
  'USE', 'SHOW', 'DESCRIBE', 'EXPLAIN', 'ANALYZE',
  'TRUE', 'FALSE', 'DISTINCT', 'COUNT', 'SUM', 'AVG', 'MIN', 'MAX',
  'CAST', 'CONVERT', 'COALESCE', 'NULLIF', 'CASE',
  'WITH', 'RECURSIVE', 'TEMP', 'TEMPORARY',
  'TRANSACTION', 'BEGIN', 'COMMIT', 'ROLLBACK',
  'INDEXED', 'CROSS', 'NATURAL', 'USING',
]);

// SQL 函数列表
const SQL_FUNCTIONS = new Set([
  'COUNT', 'SUM', 'AVG', 'MIN', 'MAX', 'ABS', 'ROUND', 'CEIL', 'FLOOR',
  'LENGTH', 'TRIM', 'UPPER', 'LOWER', 'SUBSTR', 'REPLACE',
  'DATE', 'DATETIME', 'TIME', 'YEAR', 'MONTH', 'DAY', 'HOUR', 'MINUTE', 'SECOND',
  'NOW', 'CURRENT_DATE', 'CURRENT_TIME', 'CURRENT_TIMESTAMP',
  'COALESCE', 'NULLIF', 'IFNULL', 'CAST', 'CONVERT',
  'CONCAT', 'GROUP_CONCAT', 'JSON_EXTRACT', 'JSON_OBJECT', 'JSON_ARRAY',
]);

export interface HighlightOptions {
  useColors?: boolean;
  keywordColor?: keyof typeof chalk;
  stringColor?: keyof typeof chalk;
  numberColor?: keyof typeof chalk;
  commentColor?: keyof typeof chalk;
  functionColor?: keyof typeof chalk;
}

const defaultOptions: HighlightOptions = {
  useColors: true,
  keywordColor: 'cyan',
  stringColor: 'green',
  numberColor: 'yellow',
  commentColor: 'gray',
  functionColor: 'blue',
};

/**
 * 高亮 SQL 语句
 */
export function highlightSql(sql: string, options: HighlightOptions = {}): string {
  const opts = { ...defaultOptions, ...options };

  if (!opts.useColors) {
    return sql;
  }

  let result = sql;

  // 1. 先处理多行注释 /* ... */
  const multiLineComments: string[] = [];
  result = result.replace(/\/\*[\s\S]*?\*\//g, (match) => {
    const id = `__MULTILINE_COMMENT_${multiLineComments.length}__`;
    multiLineComments.push(chalk.gray(match));
    return id;
  });

  // 2. 处理单行注释 -- ...
  const singleLineComments: string[] = [];
  result = result.replace(/--.*$/gm, (match) => {
    const id = `__SINGLELINE_COMMENT_${singleLineComments.length}__`;
    singleLineComments.push(chalk.gray(match));
    return id;
  });

  // 3. 处理字符串（单引号和双引号）
  const strings: string[] = [];
  result = result.replace(/('[^']*'|"[^"]*")/g, (match) => {
    const id = `__STRING_${strings.length}__`;
    strings.push(chalk.green(match));
    return id;
  });

  // 4. 处理数字
  const numbers: string[] = [];
  result = result.replace(/\b(\d+\.?\d*)\b/g, (match) => {
    const id = `__NUMBER_${numbers.length}__`;
    numbers.push(chalk.yellow(match));
    return id;
  });

  // 5. 处理 SQL 函数（后跟括号的标识符）
  const functions: string[] = [];
  result = result.replace(/\b([A-Za-z_][A-Za-z0-9_]*)\s*\(/g, (match, p1) => {
    const funcName = p1.toUpperCase();
    if (SQL_FUNCTIONS.has(funcName)) {
      const id = `__FUNCTION_${functions.length}__`;
      functions.push(chalk.blue(p1) + match.slice(p1.length));
      return id + '(';
    }
    return match;
  });

  // 6. 处理 SQL 关键字
  result = result.replace(/\b([A-Za-z_][A-Za-z0-9_]*)\b/g, (match) => {
    const upper = match.toUpperCase();
    if (SQL_KEYWORDS.has(upper)) {
      return chalk.cyan(match);
    }
    return match;
  });

  // 7. 恢复函数占位符
  functions.forEach((colored, i) => {
    result = result.replace(`__FUNCTION_${i}__`, colored);
  });

  // 8. 恢复数字占位符
  numbers.forEach((colored, i) => {
    result = result.replace(`__NUMBER_${i}__`, colored);
  });

  // 9. 恢复字符串占位符
  strings.forEach((colored, i) => {
    result = result.replace(`__STRING_${i}__`, colored);
  });

  // 10. 恢复注释占位符
  singleLineComments.forEach((colored, i) => {
    result = result.replace(`__SINGLELINE_COMMENT_${i}__`, colored);
  });
  multiLineComments.forEach((colored, i) => {
    result = result.replace(`__MULTILINE_COMMENT_${i}__`, colored);
  });

  return result;
}

/**
 * 高亮 SQL 语句（简化版，用于输出回显）
 */
export function highlightSqlSimple(sql: string): string {
  return highlightSql(sql, {
    useColors: true,
    keywordColor: 'cyan',
    stringColor: 'green',
    numberColor: 'yellow',
    commentColor: 'gray',
    functionColor: 'blue',
  });
}

/**
 * 移除 ANSI 颜色代码
 */
export function stripAnsi(text: string): string {
  return text.replace(/\x1b\[[0-9;]*m/g, '');
}

/**
 * 获取 SQL 语句的类型
 */
export function getSqlType(sql: string): string {
  const trimmed = sql.trim().toUpperCase();

  if (trimmed.startsWith('SELECT')) return 'SELECT';
  if (trimmed.startsWith('INSERT')) return 'INSERT';
  if (trimmed.startsWith('UPDATE')) return 'UPDATE';
  if (trimmed.startsWith('DELETE')) return 'DELETE';
  if (trimmed.startsWith('CREATE')) return 'CREATE';
  if (trimmed.startsWith('DROP')) return 'DROP';
  if (trimmed.startsWith('ALTER')) return 'ALTER';
  if (trimmed.startsWith('WITH')) return 'WITH';
  if (trimmed.startsWith('EXPLAIN')) return 'EXPLAIN';
  if (trimmed.startsWith('SHOW')) return 'SHOW';

  return 'UNKNOWN';
}
