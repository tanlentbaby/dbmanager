/**
 * 自动索引建议引擎
 * v0.6.0 新功能 - AI 增强
 * 
 * 功能：
 * - 分析 SQL 查询模式
 * - 识别需要索引的列
 * - 检测现有索引避免重复
 * - 生成 CREATE INDEX 语句
 * - 预估性能提升
 */



export interface IndexSuggestion {
  type: 'single' | 'composite' | 'covering';
  tableName: string;
  columns: string[];
  indexName: string;
  createStatement: string;
  reason: string;
  estimatedImprovement: number; // 0-1 (85% = 0.85)
  priority: 'high' | 'medium' | 'low';
}

export interface ExistingIndex {
  name: string;
  tableName: string;
  columns: string[];
  isUnique: boolean;
  isPrimary: boolean;
}

export interface IndexAnalysis {
  sql: string;
  tableName: string;
  suggestions: IndexSuggestion[];
  existingIndexes: ExistingIndex[];
  redundantSuggestions: IndexSuggestion[]; // 已存在索引的建议
}

/**
 * 索引建议引擎
 */
export class IndexAdvisor {
  /**
   * 分析 SQL 并生成索引建议
   */
  analyze(sql: string, tableName?: string): IndexAnalysis {
    const normalizedSql = sql.trim().replace(/\s+/g, ' ');
    
    // 提取表名
    const detectedTable = tableName || this.extractTableName(normalizedSql);
    
    // 获取现有索引（v0.6.0 暂不实现，返回空数组）
    const existingIndexes: ExistingIndex[] = [];
    
    // 生成索引建议
    const suggestions = this.generateSuggestions(normalizedSql, detectedTable);
    
    // 过滤掉已存在的索引
    const redundantSuggestions = this.filterRedundant(suggestions, existingIndexes);
    const validSuggestions = suggestions.filter(s => !redundantSuggestions.includes(s));
    
    return {
      sql: normalizedSql,
      tableName: detectedTable,
      suggestions: validSuggestions,
      existingIndexes,
      redundantSuggestions,
    };
  }

  /**
   * 从 SQL 中提取表名
   */
  private extractTableName(sql: string): string {
    const upperSql = sql.toUpperCase();
    
    // FROM 子句
    const fromMatch = sql.match(/FROM\s+([a-zA-Z_][a-zA-Z0-9_]*)/i);
    if (fromMatch) return fromMatch[1];
    
    // INTO 子句 (INSERT)
    const intoMatch = sql.match(/INTO\s+([a-zA-Z_][a-zA-Z0-9_]*)/i);
    if (intoMatch) return intoMatch[1];
    
    // UPDATE 子句
    const updateMatch = sql.match(/UPDATE\s+([a-zA-Z_][a-zA-Z0-9_]*)/i);
    if (updateMatch) return updateMatch[1];
    
    // DELETE 子句
    const deleteMatch = sql.match(/DELETE\s+FROM\s+([a-zA-Z_][a-zA-Z0-9_]*)/i);
    if (deleteMatch) return deleteMatch[1];
    
    return 'unknown';
  }

  /**
   * 生成索引建议
   */
  private generateSuggestions(sql: string, tableName: string): IndexSuggestion[] {
    const suggestions: IndexSuggestion[] = [];
    const upperSql = sql.toUpperCase();
    
    // 1. WHERE 子句中的列
    const whereColumns = this.extractWhereColumns(sql);
    for (const col of whereColumns) {
      suggestions.push(this.createSuggestion(tableName, [col], 'WHERE 条件过滤', 'high'));
    }
    
    // 2. JOIN 条件中的列
    const joinColumns = this.extractJoinColumns(sql);
    for (const col of joinColumns) {
      suggestions.push(this.createSuggestion(tableName, [col], 'JOIN 连接条件', 'high'));
    }
    
    // 3. ORDER BY 子句中的列
    const orderByColumns = this.extractOrderByColumns(sql);
    for (const col of orderByColumns) {
      suggestions.push(this.createSuggestion(tableName, [col], 'ORDER BY 排序', 'medium'));
    }
    
    // 4. GROUP BY 子句中的列
    const groupByColumns = this.extractGroupByColumns(sql);
    for (const col of groupByColumns) {
      suggestions.push(this.createSuggestion(tableName, [col], 'GROUP BY 分组', 'medium'));
    }
    
    // 5. 检测复合索引机会
    const compositeSuggestions = this.detectCompositeOpportunities(sql, tableName);
    suggestions.push(...compositeSuggestions);
    
    return suggestions;
  }

  /**
   * 提取 WHERE 子句中的列
   */
  private extractWhereColumns(sql: string): string[] {
    const columns: string[] = [];
    const whereMatch = sql.match(/WHERE\s+(.+?)(?:ORDER BY|GROUP BY|LIMIT|$)/i);
    
    if (whereMatch) {
      const whereClause = whereMatch[1];
      // 匹配列名 = 值、列名 > 值等模式
      const colMatches = whereClause.matchAll(/([a-zA-Z_][a-zA-Z0-9_.]*)\s*(?:=|>|<|>=|<=|<>|!=|LIKE|IN|BETWEEN)/gi);
      for (const match of colMatches) {
        const col = match[1].split('.').pop() || match[1];
        if (!this.isKeyword(col)) {
          columns.push(col);
        }
      }
    }
    
    return [...new Set(columns)];
  }

  /**
   * 提取 JOIN 条件中的列
   */
  private extractJoinColumns(sql: string): string[] {
    const columns: string[] = [];
    const joinMatches = sql.matchAll(/JOIN\s+[a-zA-Z_][a-zA-Z0-9_]*\s+ON\s+([a-zA-Z_][a-zA-Z0-9_.]*)\s*=\s*([a-zA-Z_][a-zA-Z0-9_.]*)/gi);
    
    for (const match of joinMatches) {
      const col1 = match[1].split('.').pop() || match[1];
      const col2 = match[2].split('.').pop() || match[2];
      if (!this.isKeyword(col1)) columns.push(col1);
      if (!this.isKeyword(col2)) columns.push(col2);
    }
    
    return [...new Set(columns)];
  }

  /**
   * 提取 ORDER BY 子句中的列
   */
  private extractOrderByColumns(sql: string): string[] {
    const columns: string[] = [];
    const orderByMatch = sql.match(/ORDER BY\s+(.+?)(?:LIMIT|$)/i);
    
    if (orderByMatch) {
      const orderByClause = orderByMatch[1];
      const colMatches = orderByClause.matchAll(/([a-zA-Z_][a-zA-Z0-9_.]*)(?:\s+(?:ASC|DESC))?/gi);
      for (const match of colMatches) {
        const col = match[1].split('.').pop() || match[1];
        if (!this.isKeyword(col)) {
          columns.push(col);
        }
      }
    }
    
    return [...new Set(columns)];
  }

  /**
   * 提取 GROUP BY 子句中的列
   */
  private extractGroupByColumns(sql: string): string[] {
    const columns: string[] = [];
    const groupByMatch = sql.match(/GROUP BY\s+(.+?)(?:HAVING|ORDER BY|LIMIT|$)/i);
    
    if (groupByMatch) {
      const groupByClause = groupByMatch[1];
      const colMatches = groupByClause.matchAll(/([a-zA-Z_][a-zA-Z0-9_.]*)/gi);
      for (const match of colMatches) {
        const col = match[1].split('.').pop() || match[1];
        if (!this.isKeyword(col)) {
          columns.push(col);
        }
      }
    }
    
    return [...new Set(columns)];
  }

  /**
   * 检测复合索引机会
   */
  private detectCompositeOpportunities(sql: string, tableName: string): IndexSuggestion[] {
    const suggestions: IndexSuggestion[] = [];
    const whereColumns = this.extractWhereColumns(sql);
    
    // 如果 WHERE 子句有多个列，建议复合索引
    if (whereColumns.length >= 2) {
      const indexName = `idx_${tableName}_${whereColumns.slice(0, 3).join('_')}`;
      suggestions.push({
        type: 'composite',
        tableName,
        columns: whereColumns.slice(0, 3),
        indexName,
        createStatement: `CREATE INDEX ${indexName} ON ${tableName} (${whereColumns.slice(0, 3).join(', ')})`,
        reason: `WHERE 子句包含 ${whereColumns.length} 个过滤条件，复合索引更高效`,
        estimatedImprovement: 0.9,
        priority: 'high',
      });
    }
    
    return suggestions;
  }

  /**
   * 创建索引建议
   */
  private createSuggestion(
    tableName: string,
    columns: string[],
    reason: string,
    priority: 'high' | 'medium' | 'low'
  ): IndexSuggestion {
    const indexName = `idx_${tableName}_${columns.join('_')}`;
    const columnList = columns.join(', ');
    
    return {
      type: columns.length === 1 ? 'single' : 'composite',
      tableName,
      columns,
      indexName,
      createStatement: `CREATE INDEX ${indexName} ON ${tableName} (${columnList})`,
      reason,
      estimatedImprovement: priority === 'high' ? 0.85 : 0.6,
      priority,
    };
  }

  /**
   * 获取现有索引（v0.6.0 暂不实现）
   */
  private getExistingIndexes(tableName: string): ExistingIndex[] {
    // TODO: 连接数据库查询实际索引
    return [];
  }

  /**
   * 过滤冗余建议（已存在的索引）
   */
  private filterRedundant(
    suggestions: IndexSuggestion[],
    existingIndexes: ExistingIndex[]
  ): IndexSuggestion[] {
    return suggestions.filter(suggestion => {
      return existingIndexes.some(existing => {
        return existing.tableName === suggestion.tableName &&
               this.columnsMatch(existing.columns, suggestion.columns);
      });
    });
  }

  /**
   * 检查列是否匹配
   */
  private columnsMatch(cols1: string[], cols2: string[]): boolean {
    if (cols1.length !== cols2.length) return false;
    const sorted1 = [...cols1].sort();
    const sorted2 = [...cols2].sort();
    return sorted1.every((col, i) => col === sorted2[i]);
  }

  /**
   * 检查是否是 SQL 关键字
   */
  private isKeyword(word: string): boolean {
    const keywords = [
      'SELECT', 'FROM', 'WHERE', 'AND', 'OR', 'NOT', 'IN', 'BETWEEN',
      'LIKE', 'IS', 'NULL', 'TRUE', 'FALSE', 'ORDER', 'BY', 'GROUP',
      'HAVING', 'LIMIT', 'OFFSET', 'JOIN', 'LEFT', 'RIGHT', 'INNER',
      'OUTER', 'ON', 'AS', 'DISTINCT', 'ALL', 'UNION', 'INTERSECT',
      'EXCEPT', 'ASC', 'DESC', 'NULLS', 'FIRST', 'LAST',
    ];
    return keywords.includes(word.toUpperCase());
  }

  /**
   * 格式化输出建议
   */
  formatSuggestions(analysis: IndexAnalysis): string {
    const lines: string[] = [];
    
    if (analysis.suggestions.length === 0) {
      lines.push('✅ 暂无索引建议（查询模式良好或索引已存在）');
    } else {
      lines.push(`💡 发现 ${analysis.suggestions.length} 个索引建议:\n`);
      
      for (const suggestion of analysis.suggestions) {
        const icon = suggestion.priority === 'high' ? '🔴' : '🟡';
        const improvement = Math.round(suggestion.estimatedImprovement * 100);
        
        lines.push(`${icon} **${suggestion.indexName}**`);
        lines.push(`   类型：${suggestion.type}`);
        lines.push(`   表：${suggestion.tableName}`);
        lines.push(`   列：${suggestion.columns.join(', ')}`);
        lines.push(`   原因：${suggestion.reason}`);
        lines.push(`   预估提升：${improvement}%`);
        lines.push(`   语句：${suggestion.createStatement}`);
        lines.push('');
      }
    }
    
    if (analysis.redundantSuggestions.length > 0) {
      lines.push(`\nℹ️  ${analysis.redundantSuggestions.length} 个建议已存在对应索引:`);
      for (const s of analysis.redundantSuggestions) {
        lines.push(`   - ${s.indexName}`);
      }
    }
    
    return lines.join('\n');
  }
}
