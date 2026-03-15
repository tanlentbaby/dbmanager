/**
 * EXPLAIN 查询计划解析器和可视化工具
 * 支持 MySQL, PostgreSQL, SQLite 的 EXPLAIN 输出
 */

export interface ExplainRow {
  id?: number;
  selectType?: string;
  table?: string;
  partitions?: string;
  type?: string;
  possibleKeys?: string;
  key?: string;
  keyLen?: string;
  ref?: string;
  rows?: number;
  filtered?: number;
  extra?: string;
  [key: string]: unknown;
}

export interface PlanNode {
  id: string;
  operation: string;
  table?: string;
  cost?: number;
  rows?: number;
  width?: number;
  children: PlanNode[];
  details?: Record<string, unknown>;
}

export interface ExecutionPlan {
  root: PlanNode;
  totalCost?: number;
  totalRows?: number;
  warnings?: string[];
}

export interface OptimizationSuggestion {
  severity: 'info' | 'warning' | 'critical';
  message: string;
  suggestion: string;
  affectedTable?: string;
}

/**
 * EXPLAIN 解析器
 */
export class ExplainParser {
  /**
   * 解析 EXPLAIN 结果
   */
  parse(rows: ExplainRow[]): ExecutionPlan {
    const nodes: PlanNode[] = rows.map((row, index) => this.rowToNode(row, index));
    
    // 构建树形结构 (简单情况：线性执行)
    // 复杂情况：需要分析 id 和 parent 关系
    const root = this.buildTree(nodes);
    
    const totalCost = nodes.reduce((sum, node) => sum + (node.cost || 0), 0);
    const totalRows = nodes.reduce((sum, node) => sum + (node.rows || 0), 0);
    const warnings = this.analyzePlan(nodes);
    
    return { root, totalCost, totalRows, warnings };
  }

  /**
   * 将 EXPLAIN 行转换为节点
   */
  private rowToNode(row: ExplainRow, index: number): PlanNode {
    const operation = this.extractOperation(row);
    const cost = this.estimateCost(row);
    
    return {
      id: `node_${index}`,
      operation,
      table: row.table,
      cost,
      rows: row.rows,
      width: 1,
      children: [],
      details: {
        type: row.type,
        key: row.key,
        possibleKeys: row.possibleKeys,
        extra: row.extra,
      },
    };
  }

  /**
   * 提取操作类型
   */
  private extractOperation(row: ExplainRow): string {
    if (row.selectType) {
      switch (row.selectType) {
        case 'SIMPLE':
          return 'TABLE SCAN';
        case 'PRIMARY':
          return 'PRIMARY';
        case 'SUBQUERY':
          return 'SUBQUERY';
        case 'DERIVED':
          return 'DERIVED';
        case 'UNION':
          return 'UNION';
      }
    }
    
    if (row.type) {
      switch (row.type) {
        case 'ALL':
          return 'FULL TABLE SCAN';
        case 'index':
          return 'INDEX SCAN';
        case 'range':
          return 'RANGE SCAN';
        case 'ref':
          return 'INDEX LOOKUP';
        case 'eq_ref':
          return 'UNIQUE INDEX LOOKUP';
        case 'const':
        case 'system':
          return 'CONSTANT';
        case 'NULL':
          return 'NULL';
      }
    }
    
    return 'SCAN';
  }

  /**
   * 估算成本 (简化版)
   */
  private estimateCost(row: ExplainRow): number {
    const rows = row.rows || 1;
    
    // 根据访问类型估算成本
    const typeCost: Record<string, number> = {
      'system': 0,
      'const': 1,
      'eq_ref': 1,
      'ref': 2,
      'range': 3,
      'index': 4,
      'ALL': 5,
    };
    
    const baseCost = typeCost[row.type || 'ALL'] || 5;
    return baseCost * rows;
  }

  /**
   * 构建树形结构
   */
  private buildTree(nodes: PlanNode[]): PlanNode {
    if (nodes.length === 0) {
      return this.createEmptyNode();
    }
    
    if (nodes.length === 1) {
      return nodes[0];
    }
    
    // 简单情况：链式结构
    for (let i = 0; i < nodes.length - 1; i++) {
      nodes[i].children.push(nodes[i + 1]);
    }
    
    return nodes[0];
  }

  /**
   * 创建空节点
   */
  private createEmptyNode(): PlanNode {
    return {
      id: 'empty',
      operation: 'NO OPERATION',
      children: [],
    };
  }

  /**
   * 分析执行计划，生成警告
   */
  private analyzePlan(nodes: PlanNode[]): string[] {
    const warnings: string[] = [];
    
    for (const node of nodes) {
      // 全表扫描警告
      if (node.operation === 'FULL TABLE SCAN') {
        warnings.push(`⚠️ 全表扫描：${node.table || 'unknown'}`);
      }
      
      // 大行数警告
      if ((node.rows || 0) > 10000) {
        warnings.push(`⚠️ 大结果集：${node.rows} 行`);
      }
      
      // 无索引警告
      if (node.details?.type === 'ALL' && !node.details?.key) {
        warnings.push(`⚠️ 未使用索引：${node.table || 'unknown'}`);
      }
    }
    
    return warnings;
  }

  /**
   * 生成优化建议
   */
  suggest(plan: ExecutionPlan): OptimizationSuggestion[] {
    const suggestions: OptimizationSuggestion[] = [];
    
    this.traverseNodes(plan.root, suggestions);
    
    // 按严重程度排序
    return suggestions.sort((a, b) => {
      const severityOrder = { critical: 0, warning: 1, info: 2 };
      return severityOrder[a.severity] - severityOrder[b.severity];
    });
  }

  /**
   * 遍历节点生成建议
   */
  private traverseNodes(node: PlanNode, suggestions: OptimizationSuggestion[]): void {
    // 全表扫描建议
    if (node.operation === 'FULL TABLE SCAN') {
      suggestions.push({
        severity: 'warning',
        message: `检测到全表扫描`,
        suggestion: `考虑为 ${node.table} 表添加合适的索引，或在 WHERE 子句中使用索引列`,
        affectedTable: node.table,
      });
    }
    
    // 大结果集建议
    if ((node.rows || 0) > 10000) {
      suggestions.push({
        severity: 'info',
        message: `大结果集 (${node.rows} 行)`,
        suggestion: '考虑添加 LIMIT 子句限制返回行数，或优化查询条件',
      });
    }
    
    // 无索引建议
    if (node.details?.type === 'ALL' && !node.details?.key) {
      suggestions.push({
        severity: 'critical',
        message: `未使用索引`,
        suggestion: `为 ${node.table} 表的查询列创建索引`,
        affectedTable: node.table,
      });
    }
    
    // 递归处理子节点
    node.children.forEach(child => this.traverseNodes(child, suggestions));
  }

  /**
   * 格式化为文本树
   */
  toTextTree(plan: ExecutionPlan): string {
    const lines: string[] = [];
    this.formatNode(plan.root, lines, '', true);
    return lines.join('\n');
  }

  /**
   * 格式化节点为文本
   */
  private formatNode(node: PlanNode, lines: string[], prefix: string, isLast: boolean): void {
    const connector = isLast ? '└─' : '├─';
    const costStr = node.cost !== undefined ? ` (cost: ${node.cost})` : '';
    const rowsStr = node.rows !== undefined ? ` [${node.rows} rows]` : '';
    
    lines.push(`${prefix}${connector} ${node.operation}${node.table ? ` on ${node.table}` : ''}${costStr}${rowsStr}`);
    
    const childPrefix = prefix + (isLast ? '  ' : '│ ');
    
    node.children.forEach((child, index) => {
      this.formatNode(child, lines, childPrefix, index === node.children.length - 1);
    });
  }
}

/**
 * 将 EXPLAIN 结果渲染为 ASCII 树
 */
export function renderExplainTree(rows: ExplainRow[]): string {
  const parser = new ExplainParser();
  const plan = parser.parse(rows);
  return parser.toTextTree(plan);
}

/**
 * 获取 EXPLAIN 优化建议
 */
export function getExplainSuggestions(rows: ExplainRow[]): OptimizationSuggestion[] {
  const parser = new ExplainParser();
  const plan = parser.parse(rows);
  return parser.suggest(plan);
}
