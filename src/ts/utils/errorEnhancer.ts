/**
 * 错误消息增强器
 * v0.8.0 Phase 4 - 错误提示改进
 * 
 * 功能:
 * - 友好错误消息
 * - 自动修复建议
 * - 错误分类
 * - 错误日志
 */

export enum ErrorCategory {
  CONNECTION = 'CONNECTION',
  SYNTAX = 'SYNTAX',
  PERMISSION = 'PERMISSION',
  TIMEOUT = 'TIMEOUT',
  NOT_FOUND = 'NOT_FOUND',
  VALIDATION = 'VALIDATION',
  UNKNOWN = 'UNKNOWN',
}

export interface EnhancedError {
  original: Error;
  message: string;
  friendlyMessage: string;
  category: ErrorCategory;
  suggestions: string[];
  technicalDetails?: string;
  errorCode?: string;
}

export class ErrorEnhancer {
  private errorPatterns: Map<RegExp, {
    category: ErrorCategory;
    friendlyMessage: string;
    suggestions: string[];
  }>;

  constructor() {
    this.errorPatterns = new Map();
    this.initializePatterns();
  }

  /**
   * 初始化错误模式
   */
  private initializePatterns(): void {
    // 连接错误
    this.addPattern(/ECONNREFUSED|connect ECONNREFUSED/i, {
      category: ErrorCategory.CONNECTION,
      friendlyMessage: '无法连接到数据库服务器',
      suggestions: [
        '检查数据库服务是否正在运行',
        '验证主机名和端口号是否正确',
        '检查防火墙设置是否允许连接',
        '确认数据库配置中的 host 和 port 设置',
      ],
    });

    this.addPattern(/ETIMEDOUT|timeout|timed out/i, {
      category: ErrorCategory.TIMEOUT,
      friendlyMessage: '数据库连接超时',
      suggestions: [
        '检查网络连接是否稳定',
        '增加连接超时设置',
        '检查数据库服务器负载是否过高',
        '考虑使用连接池减少连接开销',
      ],
    });

    this.addPattern(/ER_ACCESS_DENIED|access denied|authentication failed/i, {
      category: ErrorCategory.PERMISSION,
      friendlyMessage: '数据库认证失败',
      suggestions: [
        '检查用户名和密码是否正确',
        '确认用户是否有连接权限',
        '检查是否允许从当前主机连接',
        '联系数据库管理员重置密码',
      ],
    });

    // SQL 语法错误
    this.addPattern(/syntax error|SQL syntax|near.*at/i, {
      category: ErrorCategory.SYNTAX,
      friendlyMessage: 'SQL 语法错误',
      suggestions: [
        '检查 SQL 语句的关键字拼写',
        '确认表名和列名是否正确',
        '检查引号和括号是否匹配',
        '使用 /fix-sql 命令自动修复',
      ],
    });

    // 表/列不存在
    this.addPattern(/doesn't exist|Unknown (table|column)/i, {
      category: ErrorCategory.NOT_FOUND,
      friendlyMessage: '表或列不存在',
      suggestions: [
        '检查表名或列名拼写',
        '使用 /list 查看可用表',
        '使用 /desc <表名> 查看表结构',
        '确认当前数据库是否正确',
      ],
    });

    // 权限错误
    this.addPattern(/PERMISSION DENIED|permission denied|not permitted/i, {
      category: ErrorCategory.PERMISSION,
      friendlyMessage: '权限不足',
      suggestions: [
        '联系数据库管理员授予相应权限',
        '检查当前用户的权限设置',
        '确认是否有该表的操作权限',
      ],
    });

    // 约束违反
    this.addPattern(/violates.*constraint|FOREIGN KEY|UNIQUE constraint/i, {
      category: ErrorCategory.VALIDATION,
      friendlyMessage: '数据约束冲突',
      suggestions: [
        '检查是否违反了唯一性约束',
        '验证外键引用是否存在',
        '确认数据是否符合约束条件',
      ],
    });

    // 值过大
    this.addPattern(/too long|too large|exceeds.*size/i, {
      category: ErrorCategory.VALIDATION,
      friendlyMessage: '数据长度或大小超出限制',
      suggestions: [
        '检查字段长度限制',
        '缩短输入的数据',
        '考虑修改表结构增加字段长度',
      ],
    });
  }

  /**
   * 添加错误模式
   */
  addPattern(
    pattern: RegExp,
    config: { category: ErrorCategory; friendlyMessage: string; suggestions: string[] }
  ): void {
    this.errorPatterns.set(pattern, config);
  }

  /**
   * 增强错误消息
   */
  enhance(error: Error | string, context?: string): EnhancedError {
    const originalError = error instanceof Error ? error : new Error(error);
    const errorMessage = originalError.message;

    // 查找匹配的模式
    let match = this.findMatchingPattern(errorMessage);

    // 如果没有匹配，使用默认处理
    if (!match) {
      match = {
        category: ErrorCategory.UNKNOWN,
        friendlyMessage: '发生未知错误',
        suggestions: ['检查操作是否正确', '查看错误日志获取更多信息'],
      };
    }

    const enhanced: EnhancedError = {
      original: originalError,
      message: errorMessage,
      friendlyMessage: match.friendlyMessage,
      category: match.category,
      suggestions: match.suggestions,
      technicalDetails: context,
    };

    // 记录错误日志
    this.logError(enhanced);

    return enhanced;
  }

  /**
   * 格式化输出错误
   */
  formatError(enhanced: EnhancedError): string {
    const lines: string[] = [];

    // 错误图标
    const icon = this.getErrorIcon(enhanced.category);
    lines.push(`${icon} ${enhanced.friendlyMessage}`);

    // 建议
    if (enhanced.suggestions.length > 0) {
      lines.push('\n💡 建议:');
      enhanced.suggestions.forEach((s, i) => {
        lines.push(`  ${i + 1}. ${s}`);
      });
    }

    // 技术详情
    if (enhanced.technicalDetails) {
      lines.push(`\n📝 详情：${enhanced.technicalDetails}`);
    }

    // 原始错误（调试模式）
    if (process.env.DEBUG === 'true') {
      lines.push(`\n🔧 原始错误：${enhanced.message}`);
      if (enhanced.original.stack) {
        lines.push(`\n${enhanced.original.stack}`);
      }
    }

    return lines.join('\n');
  }

  /**
   * 获取错误图标
   */
  private getErrorIcon(category: ErrorCategory): string {
    const icons: Record<ErrorCategory, string> = {
      [ErrorCategory.CONNECTION]: '🔌',
      [ErrorCategory.SYNTAX]: '📝',
      [ErrorCategory.PERMISSION]: '🔒',
      [ErrorCategory.TIMEOUT]: '⏱️',
      [ErrorCategory.NOT_FOUND]: '❓',
      [ErrorCategory.VALIDATION]: '⚠️',
      [ErrorCategory.UNKNOWN]: '❗',
    };
    return icons[category] || '❗';
  }

  /**
   * 查找匹配的模式
   */
  private findMatchingPattern(errorMessage: string): {
    category: ErrorCategory;
    friendlyMessage: string;
    suggestions: string[];
  } | null {
    for (const [pattern, config] of this.errorPatterns.entries()) {
      if (pattern.test(errorMessage)) {
        return config;
      }
    }
    return null;
  }

  /**
   * 记录错误日志
   */
  private logError(enhanced: EnhancedError): void {
    const logEntry = {
      timestamp: new Date().toISOString(),
      category: enhanced.category,
      message: enhanced.message,
      friendlyMessage: enhanced.friendlyMessage,
    };

    // 可以写入日志文件
    // console.log('[ErrorEnhancer]', JSON.stringify(logEntry));
  }

  /**
   * 获取错误统计
   */
  getErrorStats(): Record<string, number> {
    // 简化实现，实际可以从日志中统计
    return {};
  }

  /**
   * 清除错误模式
   */
  clearPatterns(): void {
    this.errorPatterns.clear();
    this.initializePatterns();
  }
}

export default ErrorEnhancer;
