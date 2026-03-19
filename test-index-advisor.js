/**
 * v0.6.0 Phase 1 - 自动索引建议功能测试
 */

import { IndexAdvisor } from './dist/utils/indexAdvisor.js';

const advisor = new IndexAdvisor();

console.log('╔══════════════════════════════════════════════════════════╗');
console.log('║  v0.6.0 Phase 1 - 自动索引建议功能测试                  ║');
console.log('╚══════════════════════════════════════════════════════════╝\n');

// 测试用例
const testCases = [
  {
    name: '简单 WHERE 查询',
    sql: "SELECT * FROM users WHERE email = 'test@example.com'",
  },
  {
    name: '多条件 WHERE 查询',
    sql: "SELECT * FROM orders WHERE user_id = 1 AND status = 'pending'",
  },
  {
    name: 'ORDER BY 查询',
    sql: 'SELECT * FROM products ORDER BY created_at DESC',
  },
  {
    name: 'JOIN 查询',
    sql: 'SELECT * FROM orders JOIN users ON orders.user_id = users.id WHERE orders.status = "completed"',
  },
  {
    name: 'GROUP BY 查询',
    sql: 'SELECT user_id, COUNT(*) FROM orders GROUP BY user_id',
  },
  {
    name: '复杂查询',
    sql: 'SELECT * FROM orders WHERE user_id = 1 AND status = "pending" ORDER BY created_at DESC LIMIT 10',
  },
];

let passed = 0;
let failed = 0;

for (const testCase of testCases) {
  console.log(`\n📋 测试：${testCase.name}`);
  console.log(`SQL: ${testCase.sql}\n`);
  
  try {
    const analysis = advisor.analyze(testCase.sql);
    
    if (analysis.suggestions.length === 0) {
      console.log('✅ 暂无索引建议\n');
    } else {
      console.log(`💡 发现 ${analysis.suggestions.length} 个建议:\n`);
      
      for (const suggestion of analysis.suggestions) {
        const icon = suggestion.priority === 'high' ? '🔴' : '🟡';
        const improvement = Math.round(suggestion.estimatedImprovement * 100);
        
        console.log(`${icon} ${suggestion.indexName}`);
        console.log(`   类型：${suggestion.type}`);
        console.log(`   表：${suggestion.tableName}`);
        console.log(`   列：${suggestion.columns.join(', ')}`);
        console.log(`   原因：${suggestion.reason}`);
        console.log(`   预估提升：${improvement}%`);
        console.log(`   语句：${suggestion.createStatement}`);
        console.log('');
      }
    }
    
    passed++;
  } catch (error) {
    console.log(`❌ 失败：${error instanceof Error ? error.message : String(error)}\n`);
    failed++;
  }
}

console.log('\n╔══════════════════════════════════════════════════════════╗');
console.log(`║  测试结果：${passed} 通过，${failed} 失败${failed === 0 ? ' ✅' : ' ❌'}                        ║`);
console.log('╚══════════════════════════════════════════════════════════╝\n');

process.exit(failed > 0 ? 1 : 0);
