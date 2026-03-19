/**
 * SQL 自动修复引擎
 * v0.6.0 新功能 - AI 增强
 * 
 * 功能：
 * - 语法错误检测
 * - 拼写纠错（Levenshtein 距离）
 * - 表名/列名模糊匹配
 * - 提供修复建议
 * - 交互式修复选项
 */

export interface SqlIssue {
  type: 'syntax' | 'typo' | 'unknown_table' | 'unknown_column' | 'missing_keyword';
  severity: 'error' | 'warning';
  message: string;
  position?: { start: number; end: number };
  originalText?: string;
}

export interface FixSuggestion {
  title: string;
  description: string;
  originalSql: string;
  fixedSql: string;
  confidence: number; // 0-1
  changes: string[];
}

export interface SqlFixResult {
  sql: string;
  issues: SqlIssue[];
  suggestions: FixSuggestion[];
  canAutoFix: boolean;
}

/**
 * SQL 自动修复器
 */
export class SqlAutoFixer {
  // SQL 关键字列表
  private readonly keywords = [
    'SELECT', 'FROM', 'WHERE', 'AND', 'OR', 'NOT', 'IN', 'BETWEEN',
    'LIKE', 'IS', 'NULL', 'TRUE', 'FALSE', 'ORDER', 'BY', 'GROUP',
    'HAVING', 'LIMIT', 'OFFSET', 'JOIN', 'LEFT', 'RIGHT', 'INNER',
    'OUTER', 'ON', 'AS', 'DISTINCT', 'ALL', 'UNION', 'INTERSECT',
    'EXCEPT', 'ASC', 'DESC', 'NULLS', 'FIRST', 'LAST', 'INSERT',
    'INTO', 'VALUES', 'UPDATE', 'SET', 'DELETE', 'CREATE', 'TABLE',
    'ALTER', 'DROP', 'INDEX', 'PRIMARY', 'KEY', 'FOREIGN', 'REFERENCES',
    'CONSTRAINT', 'DEFAULT', 'UNIQUE', 'CHECK', 'CASCADE', 'RESTRICT',
  ];

  // 常见拼写错误映射
  private readonly commonTypos: Record<string, string> = {
    'selec': 'SELECT',
    'selet': 'SELECT',
    'slect': 'SELECT',
    'selct': 'SELECT',
    'form': 'FROM',
    'fom': 'FROM',
    'whe': 'WHERE',
    'wher': 'WHERE',
    'whree': 'WHERE',
    'nad': 'AND',
    'adn': 'AND',
    'ro': 'OR',
    'ot': 'NOT',
    'rodre': 'ORDER',
    'oder': 'ORDER',
    'ordr': 'ORDER',
    'grop': 'GROUP',
    'grou': 'GROUP',
    'limt': 'LIMIT',
    'limti': 'LIMIT',
    'jon': 'JOIN',
    'jion': 'JOIN',
    'elt': 'LEFT',
    'righ': 'RIGHT',
    'inne': 'INNER',
    'oute': 'OUTER',
  };

  /**
   * 分析 SQL 并检测问题
   */
  analyze(sql: string): SqlFixResult {
    const normalizedSql = sql.trim().replace(/\s+/g, ' ');
    const issues: SqlIssue[] = [];
    const suggestions: FixSuggestion[] = [];

    // 1. 检测语法错误
    this.detectSyntaxErrors(normalizedSql, issues);

    // 2. 检测拼写错误
    this.detectTypos(normalizedSql, issues);

    // 3. 生成修复建议
    if (issues.length > 0) {
      this.generateSuggestions(normalizedSql, issues, suggestions);
    }

    return {
      sql: normalizedSql,
      issues,
      suggestions,
      canAutoFix: suggestions.length > 0 && suggestions[0].confidence > 0.8,
    };
  }

  /**
   * 检测语法错误
   */
  private detectSyntaxErrors(sql: string, issues: SqlIssue[]): void {
    const upperSql = sql.toUpperCase();

    // 检测 SELECT 语句缺少 FROM
    if (upperSql.startsWith('SELECT') && !upperSql.includes('FROM')) {
      // 但排除 SELECT 1+1 这种简单表达式
      if (!/SELECT\s+\d+[\s\+\-\*\/]/i.test(sql)) {
        issues.push({
          type: 'syntax',
          severity: 'error',
          message: 'SELECT 语句缺少 FROM 子句',
        });
      }
    }

    // 检测 UPDATE 语句缺少 SET
    if (upperSql.startsWith('UPDATE') && !upperSql.includes('SET')) {
      issues.push({
        type: 'syntax',
        severity: 'error',
        message: 'UPDATE 语句缺少 SET 子句',
      });
    }

    // 检测 INSERT 语句缺少 VALUES 或 SELECT
    if (upperSql.startsWith('INSERT INTO') && !upperSql.includes('VALUES') && !upperSql.includes('SELECT')) {
      issues.push({
        type: 'syntax',
        severity: 'error',
        message: 'INSERT 语句缺少 VALUES 或 SELECT 子句',
      });
    }

    // 检测 WHERE 后没有条件
    if (upperSql.includes('WHERE') && /WHERE\s*$/i.test(sql)) {
      issues.push({
        type: 'syntax',
        severity: 'error',
        message: 'WHERE 子句后缺少条件',
      });
    }

    // 检测不匹配的括号
    const openParens = (sql.match(/\(/g) || []).length;
    const closeParens = (sql.match(/\)/g) || []).length;
    if (openParens !== closeParens) {
      issues.push({
        type: 'syntax',
        severity: 'error',
        message: `括号不匹配：${openParens} 个左括号，${closeParens} 个右括号`,
      });
    }

    // 检测不匹配的引号
    const singleQuotes = (sql.match(/'/g) || []).length;
    if (singleQuotes % 2 !== 0) {
      issues.push({
        type: 'syntax',
        severity: 'error',
        message: '字符串引号未闭合',
      });
    }
  }

  /**
   * 检测拼写错误
   */
  private detectTypos(sql: string, issues: SqlIssue[]): void {
    const tokens = sql.split(/[\s,()=<>!]+/);

    for (const token of tokens) {
      if (token.length < 3) continue;

      const upperToken = token.toUpperCase();

      // 检查常见拼写错误
      if (this.commonTypos[upperToken.toLowerCase()]) {
        const correct = this.commonTypos[upperToken.toLowerCase()];
        issues.push({
          type: 'typo',
          severity: 'error',
          message: `可能的拼写错误："${token}" 应该是 "${correct}"`,
          originalText: token,
        });
      }

      // 检查与关键字的相似度
      if (!this.isKeyword(upperToken)) {
        const similarKeyword = this.findSimilarKeyword(upperToken);
        if (similarKeyword && similarKeyword !== upperToken) {
          issues.push({
            type: 'typo',
            severity: 'warning',
            message: `可能的拼写错误："${token}" 可能是 "${similarKeyword}"`,
            originalText: token,
          });
        }
      }
    }
  }

  /**
   * 查找相似的关键字
   */
  private findSimilarKeyword(token: string): string | null {
    const upperToken = token.toUpperCase();
    let bestMatch: string | null = null;
    let bestDistance = Infinity;

    for (const keyword of this.keywords) {
      // 只检查长度相近的关键字
      if (Math.abs(keyword.length - upperToken.length) > 2) continue;

      const distance = this.levenshteinDistance(upperToken, keyword);
      if (distance < bestDistance && distance <= 2) {
        bestDistance = distance;
        bestMatch = keyword;
      }
    }

    return bestMatch;
  }

  /**
   * 计算 Levenshtein 距离
   */
  private levenshteinDistance(s1: string, s2: string): number {
    const m = s1.length;
    const n = s2.length;

    // 创建距离矩阵
    const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));

    // 初始化边界
    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;

    // 填充矩阵
    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        if (s1[i - 1] === s2[j - 1]) {
          dp[i][j] = dp[i - 1][j - 1];
        } else {
          dp[i][j] = Math.min(
            dp[i - 1][j] + 1,     // 删除
            dp[i][j - 1] + 1,     // 插入
            dp[i - 1][j - 1] + 1  // 替换
          );
        }
      }
    }

    return dp[m][n];
  }

  /**
   * 生成修复建议
   */
  private generateSuggestions(sql: string, issues: SqlIssue[], suggestions: FixSuggestion[]): void {
    let fixedSql = sql;
    const changes: string[] = [];

    // 按类型处理问题
    for (const issue of issues) {
      if (issue.type === 'typo' && issue.originalText) {
        // 查找正确的拼写
        const upperOriginal = issue.originalText.toUpperCase();
        const correct = this.commonTypos[upperOriginal.toLowerCase()] ||
                       this.findSimilarKeyword(upperOriginal);

        if (correct) {
          fixedSql = fixedSql.replace(
            new RegExp(`\\b${this.escapeRegex(issue.originalText)}\\b`, 'gi'),
            correct
          );
          changes.push(`"${issue.originalText}" → "${correct}"`);
        }
      }
    }

    // 如果有修复，添加建议
    if (changes.length > 0 && fixedSql !== sql) {
      suggestions.push({
        title: '修复拼写错误',
        description: `发现 ${changes.length} 个拼写错误`,
        originalSql: sql,
        fixedSql: fixedSql,
        confidence: 0.95,
        changes,
      });
    }

    // 针对特定语法问题提供建议
    for (const issue of issues) {
      if (issue.type === 'syntax') {
        if (issue.message.includes('缺少 FROM')) {
          suggestions.push({
            title: '添加 FROM 子句',
            description: 'SELECT 语句需要指定数据源',
            originalSql: sql,
            fixedSql: sql.replace(/SELECT\s+/i, 'SELECT * FROM '),
            confidence: 0.7,
            changes: ['添加 FROM 子句'],
          });
        }

        if (issue.message.includes('括号不匹配')) {
          const openParens = (sql.match(/\(/g) || []).length;
          const closeParens = (sql.match(/\)/g) || []).length;
          const missing = openParens - closeParens;
          if (missing > 0) {
            suggestions.push({
              title: '闭合括号',
              description: `缺少 ${missing} 个右括号`,
              originalSql: sql,
              fixedSql: sql + ')'.repeat(missing),
              confidence: 0.8,
              changes: [`添加 ${missing} 个右括号`],
            });
          }
        }
      }
    }

    // 按置信度排序
    suggestions.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * 检查是否是关键字
   */
  private isKeyword(token: string): boolean {
    return this.keywords.includes(token.toUpperCase());
  }

  /**
   * 转义正则表达式特殊字符
   */
  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * 格式化输出
   */
  formatResult(result: SqlFixResult): string {
    const lines: string[] = [];

    if (result.issues.length === 0) {
      lines.push('✅ SQL 语法检查通过，未发现问题');
    } else {
      lines.push(`⚠️ 发现 ${result.issues.length} 个问题:\n`);

      for (const issue of result.issues) {
        const icon = issue.severity === 'error' ? '🔴' : '🟡';
        lines.push(`${icon} ${issue.message}`);
      }

      if (result.suggestions.length > 0) {
        lines.push('\n💡 修复建议:\n');

        for (let i = 0; i < result.suggestions.length; i++) {
          const suggestion = result.suggestions[i];
          const confidence = Math.round(suggestion.confidence * 100);

          lines.push(`${i === 0 ? '🔧' : '💭'} 建议 ${i + 1}: ${suggestion.title} (${confidence}% 置信度)`);
          lines.push(`   ${suggestion.description}`);
          lines.push('');
          lines.push(`   原 SQL: ${suggestion.originalSql}`);
          lines.push(`   修复后：${suggestion.fixedSql}`);
          lines.push('');
          lines.push(`   变更:`);
          for (const change of suggestion.changes) {
            lines.push(`     - ${change}`);
          }
          lines.push('');
        }

        if (result.canAutoFix) {
          lines.push('✨ 高置信度修复，可直接应用！');
        }
      }
    }

    return lines.join('\n');
  }
}
