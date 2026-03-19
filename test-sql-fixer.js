/**
 * v0.6.0 Phase 2 - SQL 自动修复功能测试
 */

import { SqlAutoFixer } from './dist/utils/sqlAutoFixer.js';

const fixer = new SqlAutoFixer();

console.log('╔══════════════════════════════════════════════════════════╗');
console.log('║  v0.6.0 Phase 2 - SQL 自动修复功能测试                  ║');
console.log('╚══════════════════════════════════════════════════════════╝\n');

// 测试用例
const testCases = [
  {
    name: 'SELECT 拼写错误',
    sql: "SELEC * FROM users WHERE id = 1",
  },
  {
    name: 'FROM 拼写错误',
    sql: "SELECT * FORM users WHERE id = 1",
  },
  {
    name: 'WHERE 拼写错误',
    sql: "SELECT * FROM users WHER id = 1",
  },
  {
    name: '多个拼写错误',
    sql: "SELEC * FORM users WHER id = 1",
  },
  {
    name: '缺少 FROM 子句',
    sql: "SELECT * users WHERE id = 1",
  },
  {
    name: '括号不匹配',
    sql: "SELECT * FROM users WHERE id IN (1, 2, 3",
  },
  {
    name: '正确的 SQL',
    sql: "SELECT * FROM users WHERE id = 1",
  },
  {
    name: 'ORDER 拼写错误',
    sql: "SELECT * FROM users ORDR BY created_at",
  },
  {
    name: 'LIMIT 拼写错误',
    sql: "SELECT * FROM users LIMT 10",
  },
  {
    name: 'AND 拼写错误',
    sql: "SELECT * FROM users WHERE id = 1 NAD name = 'test'",
  },
];

let passed = 0;
let failed = 0;

for (const testCase of testCases) {
  console.log(`\n📋 测试：${testCase.name}`);
  console.log(`SQL: ${testCase.sql}\n`);
  
  try {
    const result = fixer.analyze(testCase.sql);
    const output = fixer.formatResult(result);
    console.log(output);
    
    if (result.issues.length > 0 || result.suggestions.length > 0) {
      console.log('✅ 检测到问题并提供建议');
    } else {
      console.log('✅ 无问题（符合预期）');
    }
    
    passed++;
  } catch (error) {
    console.log(`❌ 失败：${error instanceof Error ? error.message : String(error)}\n`);
    failed++;
  }
  
  console.log('\n' + '─'.repeat(60));
}

console.log('\n╔══════════════════════════════════════════════════════════╗');
console.log(`║  测试结果：${passed} 通过，${failed} 失败${failed === 0 ? ' ✅' : ' ❌'}                        ║`);
console.log('╚══════════════════════════════════════════════════════════╝\n');

process.exit(failed > 0 ? 1 : 0);
