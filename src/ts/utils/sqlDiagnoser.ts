/**
 * SQL 错误诊断工具
 * 分析 SQL 错误并提供智能建议
 * 
 * v0.5.0 新功能 - 智能查询助手核心组件
 */

export interface SqlError {
  code?: string;
  message: string;
  sql?: string;
  line?: number;
  position?: number;
}

export interface DiagnosticSuggestion {
  type: 'error' | 'warning' | 'info';
  title: string;
  description: string;
  suggestion: string;
  confidence: number; // 0-1，置信度
}

export interface DiagnosticResult {
  hasError: boolean;
  error?: SqlError;
  suggestions: DiagnosticSuggestion[];
  summary: string;
}

/**
 * 常见 SQL 错误模式
 */
const ERROR_PATTERNS: Array<{
  pattern: RegExp;
  title: string;
  description: string;
  suggestion: string;
  confidence: number;
}> = [
  // 语法错误
  {
    pattern: /syntax error/i,
    title: '语法错误',
    description: 'SQL 语句存在语法问题',
    suggestion: '检查 SQL 语法，确保关键字拼写正确，括号匹配',
    confidence: 0.95,
  },
  {
    pattern: /near\s+["']?(\w+)["']?\s+at/i,
    title: '语法错误 - 位置指示',
    description: '在 "$1" 附近存在语法错误',
    suggestion: '检查该位置附近的语法，可能是缺少逗号、括号或关键字',
    confidence: 0.9,
  },
  
  // 表/列不存在
  {
    pattern: /table\s+(?:\w+\.)?["']?(\w+)["']?\s+(?:doesn't exist|does not exist|not found)/i,
    title: '表不存在',
    description: '表 "$1" 不存在',
    suggestion: '检查表名拼写，或使用 /list 查看可用表',
    confidence: 0.95,
  },
  {
    pattern: /column\s+["']?(\w+)["']?\s+(?:doesn't exist|does not exist|not found)/i,
    title: '列不存在',
    description: '列 "$1" 不存在',
    suggestion: '检查列名拼写，或使用 /desc 表名 查看表结构',
    confidence: 0.95,
  },
  {
    pattern: /unknown column\s+["']?(\w+)["']?\s+/i,
    title: '未知列',
    description: '列 "$1" 不存在于查询中',
    suggestion: '检查列名是否正确，或确认该列属于正确的表',
    confidence: 0.9,
  },
  
  // 权限问题
  {
    pattern: /access denied|permission denied|insufficient privileges/i,
    title: '权限不足',
    description: '当前用户没有执行此操作的权限',
    suggestion: '联系数据库管理员获取相应权限，或检查当前用户权限',
    confidence: 0.9,
  },
  
  // 连接问题
  {
    pattern: /connection refused|connection timed out|connection reset/i,
    title: '连接失败',
    description: '无法连接到数据库服务器',
    suggestion: '检查数据库服务是否运行，网络是否通畅，配置是否正确',
    confidence: 0.85,
  },
  
  // 锁/超时
  {
    pattern: /lock wait timeout|deadlock|transaction.*timeout/i,
    title: '锁等待超时',
    description: '事务等待锁释放超时',
    suggestion: '检查是否有长时间运行的事务，考虑优化查询或增加超时时间',
    confidence: 0.85,
  },
  {
    pattern: /query timeout|statement timeout/i,
    title: '查询超时',
    description: '查询执行时间超过限制',
    suggestion: '添加 LIMIT 限制结果数，优化查询条件，或增加索引',
    confidence: 0.8,
  },
  
  // 数据类型
  {
    pattern: /data truncation|incorrect value|invalid.*value/i,
    title: '数据值错误',
    description: '插入或更新的值不符合列的数据类型或约束',
    suggestion: '检查数据格式，确保符合列的数据类型和约束条件',
    confidence: 0.85,
  },
  
  // 外键约束
  {
    pattern: /foreign key constraint fails|cannot add.*foreign key/i,
    title: '外键约束失败',
    description: '操作违反了外键约束，引用的外键值不存在',
    suggestion: '确保引用的外键值存在于父表中，或先插入父表数据',
    confidence: 0.9,
  },
  
  // 唯一约束
  {
    pattern: /duplicate entry|unique constraint|violates unique constraint/i,
    title: '唯一约束冲突',
    description: '插入或更新的值违反了唯一约束',
    suggestion: '检查是否存在重复值，确保唯一列的值不重复',
    confidence: 0.9,
  },
  
  // 非空约束
  {
    pattern: /column.*cannot be null|null constraint.*failed/i,
    title: '非空约束冲突',
    description: '尝试将非空列设置为 NULL',
    suggestion: '为该列提供一个非空值',
    confidence: 0.9,
  },
  
  // 聚合函数
  {
    pattern: /invalid use of group function|misuse of aggregate/i,
    title: '聚合函数使用错误',
    description: '聚合函数使用方式不正确',
    suggestion: '检查 GROUP BY 子句，确保非聚合列都在 GROUP BY 中',
    confidence: 0.85,
  },
  
  // 子查询
  {
    pattern: /subquery returns more than 1 row|more than one row/i,
    title: '子查询返回多行',
    description: '子查询返回了多于一行的结果',
    suggestion: '使用 LIMIT 1 或改用 IN/EXISTS，或检查子查询逻辑',
    confidence: 0.85,
  },
];

/**
 * 数据库特定的错误代码映射
 */
const MYSQL_ERROR_CODES: Record<string, { title: string; suggestion: string }> = {
  '1045': { title: '认证失败', suggestion: '检查用户名和密码是否正确' },
  '1049': { title: '数据库不存在', suggestion: '检查数据库名或使用 CREATE DATABASE 创建' },
  '1054': { title: '未知列', suggestion: '检查列名拼写' },
  '1062': { title: '重复键值', suggestion: '检查唯一约束冲突' },
  '1064': { title: '语法错误', suggestion: '检查 SQL 语法' },
  '1146': { title: '表不存在', suggestion: '检查表名或使用 /list 查看' },
  '1205': { title: '锁等待超时', suggestion: '检查长时间运行的事务' },
  '2003': { title: '连接失败', suggestion: '检查数据库服务是否运行' },
  '2006': { title: '连接断开', suggestion: '检查网络或重新连接' },
};

const PG_ERROR_CODES: Record<string, { title: string; suggestion: string }> = {
  '28P01': { title: '认证失败', suggestion: '检查用户名和密码' },
  '3D000': { title: '数据库不存在', suggestion: '检查数据库名' },
  '42703': { title: '列不存在', suggestion: '检查列名' },
  '42P01': { title: '表不存在', suggestion: '检查表名' },
  '23505': { title: '唯一约束冲突', suggestion: '检查重复值' },
  '23503': { title: '外键约束失败', suggestion: '检查外键引用' },
  '57014': { title: '查询取消', suggestion: '查询被手动取消或超时' },
};

const SQLITE_ERROR_CODES: Record<string, { title: string; suggestion: string }> = {
  'SQLITE_ERROR': { title: 'SQL 错误', suggestion: '检查 SQL 语法' },
  'SQLITE_INTERNAL': { title: '内部错误', suggestion: '数据库内部错误，可能需要重建' },
  'SQLITE_PERM': { title: '权限错误', suggestion: '检查文件权限' },
  'SQLITE_BUSY': { title: '数据库被锁定', suggestion: '等待其他事务完成' },
  'SQLITE_LOCKED': { title: '表被锁定', suggestion: '等待锁释放' },
  'SQLITE_FULL': { title: '数据库已满', suggestion: '清理数据或扩容' },
};

export class SqlDiagnoser {
  /**
   * 诊断 SQL 错误
   */
  static diagnose(error: unknown, sql?: string): DiagnosticResult {
    const sqlError = this.parseError(error, sql);
    const suggestions: DiagnosticSuggestion[] = [];

    // 1. 基于错误消息匹配模式
    for (const pattern of ERROR_PATTERNS) {
      const match = sqlError.message.match(pattern.pattern);
      if (match) {
        let description = pattern.description;
        // 替换捕获组
        if (match[1]) {
          description = description.replace('$1', match[1]);
        }
        
        suggestions.push({
          type: 'error',
          title: pattern.title,
          description,
          suggestion: pattern.suggestion,
          confidence: pattern.confidence,
        });
      }
    }

    // 2. 基于错误代码提供特定建议
    if (sqlError.code) {
      const mysqlSuggestion = MYSQL_ERROR_CODES[sqlError.code];
      if (mysqlSuggestion) {
        suggestions.push({
          type: 'error',
          title: `MySQL ${sqlError.code}: ${mysqlSuggestion.title}`,
          description: sqlError.message,
          suggestion: mysqlSuggestion.suggestion,
          confidence: 0.95,
        });
      }

      const pgSuggestion = PG_ERROR_CODES[sqlError.code];
      if (pgSuggestion) {
        suggestions.push({
          type: 'error',
          title: `PostgreSQL ${sqlError.code}: ${pgSuggestion.title}`,
          description: sqlError.message,
          suggestion: pgSuggestion.suggestion,
          confidence: 0.95,
        });
      }

      const sqliteSuggestion = SQLITE_ERROR_CODES[sqlError.code];
      if (sqliteSuggestion) {
        suggestions.push({
          type: 'error',
          title: `SQLite ${sqlError.code}: ${sqliteSuggestion.title}`,
          description: sqlError.message,
          suggestion: sqliteSuggestion.suggestion,
          confidence: 0.95,
        });
      }
    }

    // 3. 如果没有匹配到具体错误，提供通用建议
    if (suggestions.length === 0 && sqlError.message) {
      suggestions.push({
        type: 'error',
        title: '未知错误',
        description: sqlError.message,
        suggestion: '请检查 SQL 语法、表/列名、数据库连接状态',
        confidence: 0.5,
      });
    }

    // 4. 按置信度排序
    suggestions.sort((a, b) => b.confidence - a.confidence);

    // 5. 生成摘要
    const summary = suggestions.length > 0
      ? `发现 ${suggestions.length} 个问题，最可能的原因：${suggestions[0].title}`
      : '无法识别具体错误';

    return {
      hasError: true,
      error: sqlError,
      suggestions,
      summary,
    };
  }

  /**
   * 解析错误对象
   */
  private static parseError(error: unknown, sql?: string): SqlError {
    if (error instanceof Error) {
      const errWithCode = error as Error & { code?: string; name?: string };
      return {
        code: errWithCode.code || errWithCode.name,
        message: error.message,
        sql: sql,
      };
    }
    
    if (typeof error === 'string') {
      return {
        message: error,
        sql: sql,
      };
    }

    // 处理对象类型的错误（如 { code: '1064', message: '...' }）
    if (typeof error === 'object' && error !== null) {
      const errObj = error as Record<string, unknown>;
      return {
        code: errObj.code as string || errObj.name as string,
        message: (errObj.message as string) || String(error),
        sql: sql,
      };
    }

    return {
      message: String(error),
      sql: sql,
    };
  }

  /**
   * 格式化诊断结果为可读文本
   */
  static formatResult(result: DiagnosticResult): string {
    const lines: string[] = [];

    lines.push('');
    lines.push('╔══════════════════════════════════════════════════════════╗');
    lines.push('║  🔍 SQL 错误诊断报告                                     ║');
    lines.push('╚══════════════════════════════════════════════════════════╝');
    lines.push('');

    // 摘要
    lines.push(`📋 ${result.summary}`);
    lines.push('');

    // 错误详情
    if (result.error) {
      lines.push('┌─────────────────────────────────────────────────────────');
      lines.push('│ 错误详情');
      lines.push('├─────────────────────────────────────────────────────────');
      if (result.error.code) {
        lines.push(`│ 代码：${result.error.code}`);
      }
      lines.push(`│ 消息：${result.error.message}`);
      if (result.error.sql) {
        const sqlPreview = result.error.sql.length > 60
          ? result.error.sql.substring(0, 60) + '...'
          : result.error.sql;
        lines.push(`│ SQL: ${sqlPreview}`);
      }
      lines.push('└─────────────────────────────────────────────────────────');
      lines.push('');
    }

    // 建议列表
    if (result.suggestions.length > 0) {
      lines.push('┌─────────────────────────────────────────────────────────');
      lines.push('│ 诊断建议');
      lines.push('├─────────────────────────────────────────────────────────');

      result.suggestions.forEach((s, index) => {
        const icon = s.type === 'error' ? '🔴' : s.type === 'warning' ? '🟡' : '🟢';
        const confidenceBar = '█'.repeat(Math.round(s.confidence * 10));
        
        lines.push('│');
        lines.push(`│ ${index + 1}. ${icon} ${s.title}`);
        lines.push(`│    说明：${s.description}`);
        lines.push(`│    建议：${s.suggestion}`);
        lines.push(`│    置信度：${confidenceBar} ${Math.round(s.confidence * 100)}%`);
      });

      lines.push('│');
      lines.push('└─────────────────────────────────────────────────────────');
    }

    lines.push('');
    lines.push('💡 提示：使用 /help 查看更多命令，使用 /diagnose 重新诊断');
    lines.push('');

    return lines.join('\n');
  }

  /**
   * 快速诊断（返回简洁版本）
   */
  static quickDiagnose(error: unknown, sql?: string): string {
    const result = this.diagnose(error, sql);
    if (result.suggestions.length === 0) {
      return `❌ ${result.error?.message || '未知错误'}`;
    }

    const top = result.suggestions[0];
    return `❌ ${top.title} - ${top.suggestion}`;
  }
}
