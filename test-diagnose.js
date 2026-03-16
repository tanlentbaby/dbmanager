#!/usr/bin/env node
/**
 * SQL 错误诊断功能测试脚本
 * v0.5.0 新功能验证
 */

import { SqlDiagnoser } from './dist/utils/sqlDiagnoser.js';

console.log('╔══════════════════════════════════════════════════════════╗');
console.log('║  DBManager v0.5.0 - SQL 错误诊断功能测试                  ║');
console.log('╚══════════════════════════════════════════════════════════╝\n');

// 测试用例
const testCases = [
  {
    name: 'MySQL 语法错误 (1064)',
    error: { code: '1064', message: "You have an error in your SQL syntax; check the manual that corresponds to your MySQL server version for the right syntax to use near 'SELEC * FROM users' at line 1" },
    sql: 'SELEC * FROM users',
  },
  {
    name: '表不存在 (MySQL 1146)',
    error: { code: '1146', message: "Table 'test.users' doesn't exist" },
    sql: 'SELECT * FROM users',
  },
  {
    name: '列不存在 (MySQL 1054)',
    error: { code: '1054', message: "Unknown column 'email' in 'field list'" },
    sql: 'SELECT email FROM users',
  },
  {
    name: '唯一约束冲突 (MySQL 1062)',
    error: { code: '1062', message: "Duplicate entry 'admin@example.com' for key 'email'" },
    sql: "INSERT INTO users (email) VALUES ('admin@example.com')",
  },
  {
    name: 'PostgreSQL 表不存在 (42P01)',
    error: { code: '42P01', message: 'relation "users" does not exist' },
    sql: 'SELECT * FROM users',
  },
  {
    name: 'SQLite 语法错误',
    error: { code: 'SQLITE_ERROR', message: 'near "SELEC": syntax error' },
    sql: 'SELEC * FROM users',
  },
  {
    name: '通用错误 - 权限不足',
    error: new Error('Access denied for user "test"@"localhost" to database "test"'),
    sql: 'USE test',
  },
  {
    name: '通用错误 - 连接超时',
    error: new Error('Connection timed out after 30000ms'),
    sql: null,
  },
];

let passed = 0;
let failed = 0;

for (const testCase of testCases) {
  console.log('─'.repeat(60));
  console.log(`📋 测试：${testCase.name}`);
  console.log('─'.repeat(60));
  
  try {
    const result = SqlDiagnoser.diagnose(testCase.error, testCase.sql || undefined);
    
    console.log(`✅ 诊断成功`);
    console.log(`   摘要：${result.summary}`);
    console.log(`   建议数：${result.suggestions.length}`);
    
    if (result.suggestions.length > 0) {
      const top = result.suggestions[0];
      console.log(`   最可能原因：${top.title} (置信度：${Math.round(top.confidence * 100)}%)`);
      console.log(`   建议：${top.suggestion}`);
    }
    
    passed++;
  } catch (err) {
    console.log(`❌ 诊断失败：${err instanceof Error ? err.message : err}`);
    failed++;
  }
  
  console.log('');
}

// 格式化输出测试
console.log('═'.repeat(60));
console.log('📄 格式化输出示例');
console.log('═'.repeat(60));

const sampleError = new Error("Table 'test.users' doesn't exist");
const diagnostic = SqlDiagnoser.diagnose(sampleError, 'SELECT * FROM users');
console.log(SqlDiagnoser.formatResult(diagnostic));

// 快速诊断测试
console.log('═'.repeat(60));
console.log('⚡ 快速诊断示例');
console.log('═'.repeat(60));

const quickResult = SqlDiagnoser.quickDiagnose(
  new Error("Duplicate entry 'admin' for key 'username'"),
  "INSERT INTO users (username) VALUES ('admin')"
);
console.log(quickResult);
console.log('');

// 总结
console.log('═'.repeat(60));
console.log('📊 测试总结');
console.log('═'.repeat(60));
console.log(`✅ 通过：${passed}/${testCases.length}`);
console.log(`❌ 失败：${failed}/${testCases.length}`);
console.log('');

if (failed === 0) {
  console.log('🎉 所有测试通过！SQL 错误诊断功能正常工作。\n');
  process.exit(0);
} else {
  console.log('⚠️  部分测试失败，请检查实现。\n');
  process.exit(1);
}
