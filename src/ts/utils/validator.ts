/**
 * SQL 验证器 - 错误检测和建议
 */

export interface ValidationError {
  type: 'syntax' | 'semantic' | 'warning';
  message: string;
  position?: number;
  suggestion?: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

export class SqlValidator {
  /**
   * 验证 SQL 语句
   */
  validate(sql: string): ValidationResult {
    const errors: ValidationError[] = [];
    const trimmed = sql.trim().toUpperCase();

    // 检查 SELECT 语句的基本结构
    if (trimmed.startsWith('SELECT')) {
      errors.push(...this.validateSelect(sql));
    }

    // 检查未闭合的引号
    errors.push(...this.validateQuotes(sql));

    // 检查常见错误
    errors.push(...this.validateCommonErrors(sql));

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * 验证 SELECT 语句
   */
  private validateSelect(sql: string): ValidationError[] {
    const errors: ValidationError[] = [];
    const upper = sql.toUpperCase();

    // 检查是否有 FROM
    if (upper.startsWith('SELECT') && !upper.includes('FROM')) {
      errors.push({
        type: 'syntax',
        message: 'SELECT 语句缺少 FROM 子句',
        suggestion: '添加 FROM 子句指定表名',
      });
    }

    // 检查 SELECT * 在大表上的使用
    if (upper.includes('SELECT *') && upper.includes('FROM')) {
      errors.push({
        type: 'warning',
        message: 'SELECT * 可能返回大量数据',
        suggestion: '考虑指定需要的列名',
      });
    }

    return errors;
  }

  /**
   * 验证引号闭合
   */
  private validateQuotes(sql: string): ValidationError[] {
    const errors: ValidationError[] = [];
    
    const singleQuotes = (sql.match(/'/g) || []).length;
    const doubleQuotes = (sql.match(/"/g) || []).length;

    if (singleQuotes % 2 !== 0) {
      errors.push({
        type: 'syntax',
        message: '未闭合的单引号',
        suggestion: '检查字符串是否用单引号正确闭合',
      });
    }

    if (doubleQuotes % 2 !== 0) {
      errors.push({
        type: 'syntax',
        message: '未闭合的双引号',
        suggestion: '检查标识符是否用双引号正确闭合',
      });
    }

    return errors;
  }

  /**
   * 验证常见错误
   */
  private validateCommonErrors(sql: string): ValidationError[] {
    const errors: ValidationError[] = [];
    const upper = sql.toUpperCase();

    // 检查常见的拼写错误
    const commonTypos: Record<string, string> = {
      'SELEC': 'SELECT',
      'SLECT': 'SELECT',
      'FROMM': 'FROM',
      'WHER': 'WHERE',
      'WHEREE': 'WHERE',
      'INSRT': 'INSERT',
      'UPDAT': 'UPDATE',
      'DELET': 'DELETE',
    };

    for (const [typo, correction] of Object.entries(commonTypos)) {
      if (upper.includes(typo)) {
        errors.push({
          type: 'syntax',
          message: `可能的拼写错误：${typo}`,
          suggestion: `是否想输入：${correction}`,
        });
      }
    }

    // 检查逗号后缺少空格
    if (sql.match(/,\s*\S/)) {
      errors.push({
        type: 'warning',
        message: '逗号后建议添加空格',
        suggestion: '提高可读性',
      });
    }

    return errors;
  }

  /**
   * 获取建议
   */
  getSuggestions(error: ValidationError): string[] {
    const suggestions: string[] = [];

    if (error.suggestion) {
      suggestions.push(error.suggestion);
    }

    // 根据错误类型添加额外建议
    if (error.type === 'syntax') {
      suggestions.push('检查 SQL 语法是否正确');
      suggestions.push('使用 /help 查看命令帮助');
    }

    return suggestions;
  }
}
