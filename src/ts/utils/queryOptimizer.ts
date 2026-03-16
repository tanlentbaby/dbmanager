/**
 * SQL 查询优化建议引擎
 * v0.5.0 新功能 - 智能查询助手
 * 
 * 功能：
 * - 分析 SQL 查询结构
 * - 检测潜在性能问题
 * - 提供优化建议
 * - 支持 MySQL/PostgreSQL/SQLite
 */

export interface OptimizationIssue {
  severity: 'critical' | 'warning' | 'info';
  category: 'index' | 'join' | 'subquery' | 'where' | 'select' | 'general';
  message: string;
  suggestion: string;
  sqlFragment?: string;
  confidence: number; // 0-1
}

export interface QueryAnalysis {
  sql: string;
  type: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE' | 'UNKNOWN';
  tables: string[];
  columns: string[];
  hasWhere: boolean;
  hasJoin: boolean;
  hasSubquery: boolean;
  hasGroupBy: boolean;
  hasOrderBy: boolean;
  hasLimit: boolean;
  issues: OptimizationIssue[];
  optimizedSql?: string;
}

/**
 * SQL 查询优化器
 */
export class QueryOptimizer {
  /**
   * 分析 SQL 查询
   */
  analyze(sql: string): QueryAnalysis {
    const normalizedSql = sql.trim().replace(/\s+/g, ' ');
    const upperSql = normalizedSql.toUpperCase();

    // 检测查询类型
    const type = this.detectQueryType(upperSql);

    // 提取表名
    const tables = this.extractTables(normalizedSql, upperSql);

    // 提取列名
    const columns = this.extractColumns(normalizedSql, upperSql);

    // 检测子句
    const analysis: QueryAnalysis = {
      sql: normalizedSql,
      type,
      tables,
      columns,
      hasWhere: upperSql.includes('WHERE'),
      hasJoin: upperSql.includes('JOIN') || upperSql.includes(' INNER JOIN') || upperSql.includes(' LEFT JOIN') || upperSql.includes(' RIGHT JOIN'),
      hasSubquery: this.hasSubquery(upperSql),
      hasGroupBy: upperSql.includes('GROUP BY'),
      hasOrderBy: upperSql.includes('ORDER BY'),
      hasLimit: upperSql.includes('LIMIT') || upperSql.includes('FETCH FIRST'),
      issues: [],
    };

    // 分析问题
    this.analyzeIssues(analysis);

    return analysis;
  }

  /**
   * 检测查询类型
   */
  private detectQueryType(upperSql: string): 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE' | 'UNKNOWN' {
    if (upperSql.startsWith('SELECT')) return 'SELECT';
    if (upperSql.startsWith('INSERT')) return 'INSERT';
    if (upperSql.startsWith('UPDATE')) return 'UPDATE';
    if (upperSql.startsWith('DELETE')) return 'DELETE';
    return 'UNKNOWN';
  }

  /**
   * 提取表名
   */
  private extractTables(sql: string, upperSql: string): string[] {
    const tables = new Set<string>();

    // FROM 子句
    const fromMatch = sql.match(/FROM\s+([^\s,()]+)/gi);
    if (fromMatch) {
      fromMatch.forEach(match => {
        const table = match.replace(/FROM\s+/i, '').trim();
        if (table && !this.isKeyword(table)) {
          tables.add(table);
        }
      });
    }

    // JOIN 子句
    const joinMatches = sql.match(/JOIN\s+([^\s,()]+)/gi);
    if (joinMatches) {
      joinMatches.forEach(match => {
        const table = match.replace(/JOIN\s+/i, '').trim();
        if (table && !this.isKeyword(table)) {
          tables.add(table);
        }
      });
    }

    // UPDATE 语句
    const updateMatch = sql.match(/UPDATE\s+([^\s,()]+)/i);
    if (updateMatch) {
      tables.add(updateMatch[1]);
    }

    // INSERT INTO
    const insertMatch = sql.match(/INSERT\s+INTO\s+([^\s,()]+)/i);
    if (insertMatch) {
      tables.add(insertMatch[1]);
    }

    return Array.from(tables);
  }

  /**
   * 提取列名
   */
  private extractColumns(sql: string, upperSql: string): string[] {
    const columns = new Set<string>();

    // SELECT 后的列
    const selectMatch = sql.match(/SELECT\s+(.*?)\s+FROM/i);
    if (selectMatch && !selectMatch[1].trim().startsWith('*')) {
      const colStr = selectMatch[1];
      // 简单分割
      colStr.split(',').forEach(col => {
        const cleanCol = col.trim().split(/\s+/).pop() || '';
        if (cleanCol && !this.isKeyword(cleanCol)) {
          columns.add(cleanCol.replace(/[.*()]/g, ''));
        }
      });
    }

    // WHERE 后的列
    const whereMatch = sql.match(/WHERE\s+(.*?)(?:GROUP|ORDER|LIMIT|$)/i);
    if (whereMatch) {
      const whereCols = whereMatch[1].match(/([a-zA-Z_][a-zA-Z0-9_]*)\s*[=<>!]/g);
      if (whereCols) {
        whereCols.forEach(col => {
          columns.add(col.replace(/\s*[=<>!]/g, ''));
        });
      }
    }

    return Array.from(columns);
  }

  /**
   * 检测是否有子查询
   */
  private hasSubquery(upperSql: string): boolean {
    // 检测 SELECT ... (SELECT ...)
    const subqueryPattern = /\(\s*SELECT\s+/i;
    return subqueryPattern.test(upperSql);
  }

  /**
   * 分析性能问题
   */
  private analyzeIssues(analysis: QueryAnalysis): void {
    const issues: OptimizationIssue[] = [];

    // 1. SELECT * 检测
    if (analysis.type === 'SELECT' && /\bSELECT\s+\*/i.test(analysis.sql)) {
      issues.push({
        severity: 'warning',
        category: 'select',
        message: '使用 SELECT * 会获取所有列，可能影响性能',
        suggestion: '明确指定需要的列名，如：SELECT id, name, email FROM ...',
        sqlFragment: 'SELECT *',
        confidence: 0.9,
      });
    }

    // 2. 缺少 WHERE 子句
    if (analysis.type === 'SELECT' && !analysis.hasWhere && !analysis.hasLimit) {
      issues.push({
        severity: 'warning',
        category: 'where',
        message: '查询没有 WHERE 条件，可能返回大量数据',
        suggestion: '添加 WHERE 条件限制结果集，或使用 LIMIT 限制行数',
        confidence: 0.8,
      });
    }

    if (analysis.type === 'UPDATE' && !analysis.hasWhere) {
      issues.push({
        severity: 'critical',
        category: 'where',
        message: 'UPDATE 语句没有 WHERE 条件，会更新所有行！',
        suggestion: '添加 WHERE 条件，如：UPDATE users SET status = 1 WHERE id = 1',
        confidence: 0.95,
      });
    }

    if (analysis.type === 'DELETE' && !analysis.hasWhere) {
      issues.push({
        severity: 'critical',
        category: 'where',
        message: 'DELETE 语句没有 WHERE 条件，会删除所有数据！',
        suggestion: '添加 WHERE 条件，如：DELETE FROM users WHERE id = 1',
        confidence: 0.95,
      });
    }

    // 3. LIKE 以通配符开头
    const likeWildcardMatch = analysis.sql.match(/LIKE\s+['"]%/i);
    if (likeWildcardMatch) {
      issues.push({
        severity: 'warning',
        category: 'where',
        message: 'LIKE 以 % 开头会导致索引失效',
        suggestion: '考虑使用全文索引，或重构查询避免前缀通配符',
        sqlFragment: likeWildcardMatch[0],
        confidence: 0.85,
      });
    }

    // 4. 子查询检测
    if (analysis.hasSubquery) {
      // 检测 IN 子查询
      if (/IN\s*\(\s*SELECT/i.test(analysis.sql)) {
        issues.push({
          severity: 'info',
          category: 'subquery',
          message: 'IN 子查询在某些情况下性能较差',
          suggestion: '考虑改用 EXISTS 或 JOIN，如：SELECT ... FROM t1 EXISTS (SELECT 1 FROM t2 WHERE ...)',
          confidence: 0.7,
        });
      }

      // 检测相关子查询
      if (/\(\s*SELECT.*WHERE.*=.*\./i.test(analysis.sql)) {
        issues.push({
          severity: 'warning',
          category: 'subquery',
          message: '检测到相关子查询，可能对每行执行一次',
          suggestion: '考虑改写为 JOIN 以提高性能',
          confidence: 0.75,
        });
      }
    }

    // 5. JOIN 检测
    if (analysis.hasJoin) {
      // 检测缺少 ON 条件
      if (/JOIN\s+\w+\s*(?!ON)/i.test(analysis.sql)) {
        issues.push({
          severity: 'critical',
          category: 'join',
          message: 'JOIN 缺少 ON 条件，可能产生笛卡尔积',
          suggestion: '添加 ON 条件指定连接条件',
          confidence: 0.9,
        });
      }

      // 检测多表 JOIN
      const joinCount = (analysis.sql.match(/JOIN/gi) || []).length;
      if (joinCount >= 3) {
        issues.push({
          severity: 'info',
          category: 'join',
          message: `查询包含 ${joinCount} 个 JOIN，可能影响性能`,
          suggestion: '考虑简化查询或确保连接列有索引',
          confidence: 0.6,
        });
      }
    }

    // 6. ORDER BY + LIMIT 检测
    if (analysis.hasOrderBy && !analysis.hasLimit && analysis.type === 'SELECT') {
      issues.push({
        severity: 'info',
        category: 'general',
        message: 'ORDER BY 没有 LIMIT，会对所有结果排序',
        suggestion: '添加 LIMIT 限制返回行数，如：ORDER BY created_at DESC LIMIT 10',
        confidence: 0.65,
      });
    }

    // 7. GROUP BY 检测
    if (analysis.hasGroupBy) {
      // 检测没有聚合函数
      if (!/COUNT|SUM|AVG|MAX|MIN|GROUP_CONCAT/i.test(analysis.sql)) {
        issues.push({
          severity: 'info',
          category: 'general',
          message: 'GROUP BY 没有使用聚合函数',
          suggestion: '确认是否需要聚合函数，如 COUNT(), SUM() 等',
          confidence: 0.5,
        });
      }
    }

    // 8. OR 条件检测
    if (/\bOR\b/i.test(analysis.sql)) {
      issues.push({
        severity: 'info',
        category: 'where',
        message: 'OR 条件可能导致索引失效',
        suggestion: '考虑改用 UNION 或 IN，如：WHERE id IN (1, 2, 3)',
        confidence: 0.6,
      });
    }

    // 9. 函数包裹列检测
    if (/(WHERE|AND)\s+\w+\s*\(/i.test(analysis.sql)) {
      const funcMatch = analysis.sql.match(/(WHERE|AND)\s+([A-Z]+\s*\(\s*[a-zA-Z_]+)/i);
      if (funcMatch) {
        issues.push({
          severity: 'warning',
          category: 'where',
          message: 'WHERE 条件中对列使用函数会导致索引失效',
          suggestion: '改写为列在左边，如：WHERE date_col >= "2024-01-01" 而不是 WHERE DATE(date_col) >= ...',
          sqlFragment: funcMatch[2],
          confidence: 0.8,
        });
      }
    }

    // 10. NOT IN 检测
    if (/NOT\s+IN\s*\(/i.test(analysis.sql)) {
      issues.push({
        severity: 'info',
        category: 'where',
        message: 'NOT IN 在大数据集上性能较差',
        suggestion: '考虑改用 NOT EXISTS 或 LEFT JOIN ... IS NULL',
        confidence: 0.65,
      });
    }

    // 按严重程度和置信度排序
    issues.sort((a, b) => {
      const severityOrder = { critical: 0, warning: 1, info: 2 };
      if (severityOrder[a.severity] !== severityOrder[b.severity]) {
        return severityOrder[a.severity] - severityOrder[b.severity];
      }
      return b.confidence - a.confidence;
    });

    analysis.issues = issues;
  }

  /**
   * 判断是否为 SQL 关键字
   */
  private isKeyword(word: string): boolean {
    const keywords = [
      'SELECT', 'FROM', 'WHERE', 'JOIN', 'INNER', 'LEFT', 'RIGHT', 'ON',
      'AND', 'OR', 'NOT', 'IN', 'EXISTS', 'BETWEEN', 'LIKE', 'IS', 'NULL',
      'ORDER', 'BY', 'GROUP', 'HAVING', 'LIMIT', 'OFFSET', 'UNION', 'ALL',
      'INSERT', 'INTO', 'VALUES', 'UPDATE', 'SET', 'DELETE', 'CREATE', 'TABLE',
      'INDEX', 'DROP', 'ALTER', 'AS', 'DISTINCT', 'COUNT', 'SUM', 'AVG', 'MAX', 'MIN',
      'ASC', 'DESC', 'CASE', 'WHEN', 'THEN', 'ELSE', 'END', 'NULLS', 'FIRST', 'LAST',
    ];
    return keywords.includes(word.toUpperCase());
  }

  /**
   * 生成优化建议报告
   */
  generateReport(analysis: QueryAnalysis): string {
    const lines: string[] = [];

    lines.push('');
    lines.push('╔══════════════════════════════════════════════════════════╗');
    lines.push('║  ⚡ SQL 查询优化建议报告                                  ║');
    lines.push('╚══════════════════════════════════════════════════════════╝');
    lines.push('');

    // 查询信息
    lines.push('┌─────────────────────────────────────────────────────────');
    lines.push('│ 查询信息');
    lines.push('├─────────────────────────────────────────────────────────');
    lines.push(`│ 类型：${analysis.type}`);
    lines.push(`│ 表：${analysis.tables.join(', ') || '无'}`);
    if (analysis.columns.length > 0) {
      lines.push(`│ 列：${analysis.columns.slice(0, 5).join(', ')}${analysis.columns.length > 5 ? '...' : ''}`);
    }
    lines.push(`│ 子句：${[
      analysis.hasWhere ? 'WHERE' : null,
      analysis.hasJoin ? 'JOIN' : null,
      analysis.hasSubquery ? '子查询' : null,
      analysis.hasGroupBy ? 'GROUP BY' : null,
      analysis.hasOrderBy ? 'ORDER BY' : null,
      analysis.hasLimit ? 'LIMIT' : null,
    ].filter(Boolean).join(', ') || '无'}`);
    lines.push('└─────────────────────────────────────────────────────────');
    lines.push('');

    // 优化建议
    if (analysis.issues.length === 0) {
      lines.push('✅ 查询结构良好，未发现明显优化空间');
    } else {
      lines.push('┌─────────────────────────────────────────────────────────');
      lines.push(`│ 发现 ${analysis.issues.length} 个优化点`);
      lines.push('├─────────────────────────────────────────────────────────');

      analysis.issues.forEach((issue, index) => {
        const icon = issue.severity === 'critical' ? '🔴' : issue.severity === 'warning' ? '🟡' : '🟢';
        const category = this.getCategoryName(issue.category);
        
        lines.push('│');
        lines.push(`│ ${index + 1}. ${icon} [${category}] ${issue.message}`);
        lines.push(`│    建议：${issue.suggestion}`);
        if (issue.sqlFragment) {
          lines.push(`│    位置：${issue.sqlFragment}`);
        }
        lines.push(`│    置信度：${Math.round(issue.confidence * 100)}%`);
      });

      lines.push('│');
      lines.push('└─────────────────────────────────────────────────────────');
    }

    lines.push('');
    lines.push('💡 提示：使用 /optimize <SQL> 分析其他查询');
    lines.push('');

    return lines.join('\n');
  }

  /**
   * 获取分类名称
   */
  private getCategoryName(category: string): string {
    const names: Record<string, string> = {
      'index': '索引',
      'join': '连接',
      'subquery': '子查询',
      'where': '条件',
      'select': '选择',
      'general': '常规',
    };
    return names[category] || category;
  }

  /**
   * 快速分析（返回简洁版本）
   */
  quickAnalyze(sql: string): string {
    const analysis = this.analyze(sql);
    
    if (analysis.issues.length === 0) {
      return '✅ 查询结构良好';
    }

    const critical = analysis.issues.filter(i => i.severity === 'critical');
    const warning = analysis.issues.filter(i => i.severity === 'warning');
    
    const parts: string[] = [];
    if (critical.length > 0) {
      parts.push(`🔴 ${critical.length} 个严重问题`);
    }
    if (warning.length > 0) {
      parts.push(`🟡 ${warning.length} 个警告`);
    }
    if (parts.length === 0) {
      parts.push(`ℹ️ ${analysis.issues.length} 个建议`);
    }

    return parts.join(', ');
  }
}
