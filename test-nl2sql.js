#!/usr/bin/env node
/**
 * NL2SQL 功能测试脚本
 * v0.5.0 新功能验证
 */

import { NL2SQLConverter } from './dist/utils/nl2sql.js';

console.log('╔══════════════════════════════════════════════════════════╗');
console.log('║  DBManager v0.5.0 - NL2SQL 功能测试                       ║');
console.log('╚══════════════════════════════════════════════════════════╝\n');

const converter = new NL2SQLConverter();

// 注册示例 schema
converter.registerSchema({
  tableName: 'users',
  columns: [
    { name: 'id', type: 'INT', nullable: false },
    { name: 'name', type: 'VARCHAR(50)', nullable: false },
    { name: 'email', type: 'VARCHAR(100)', nullable: true },
    { name: 'age', type: 'INT', nullable: true },
    { name: 'status', type: 'INT', nullable: true, defaultValue: '1' },
    { name: 'created_at', type: 'DATETIME', nullable: true },
  ],
  primaryKey: 'id',
});

converter.registerSchema({
  tableName: 'orders',
  columns: [
    { name: 'id', type: 'INT', nullable: false },
    { name: 'user_id', type: 'INT', nullable: false },
    { name: 'total', type: 'DECIMAL(10,2)', nullable: true },
    { name: 'status', type: 'INT', nullable: true },
    { name: 'created_at', type: 'DATETIME', nullable: true },
  ],
  primaryKey: 'id',
});

const testCases = [
  {
    name: '简单查询所有用户',
    input: '查询所有用户',
    expectSuccess: true,
  },
  {
    name: '带条件查询',
    input: '查找年龄大于 25 的用户',
    expectSuccess: true,
  },
  {
    name: '统计查询',
    input: '统计用户数量',
    expectSuccess: true,
  },
  {
    name: '排序查询',
    input: '显示用户，按年龄降序排序',
    expectSuccess: true,
  },
  {
    name: '限制结果数',
    input: '显示前 10 个用户',
    expectSuccess: true,
  },
  {
    name: '多条件查询',
    input: '查找年龄大于 25 且状态等于 1 的用户',
    expectSuccess: true,
  },
  {
    name: '订单查询',
    input: '查询所有订单',
    expectSuccess: true,
  },
  {
    name: 'DELETE 语句',
    input: '删除 id 等于 1 的用户',
    expectSuccess: true,
  },
  {
    name: '复杂查询',
    input: '查找年龄大于 25 的用户，按创建时间降序排序，显示前 10 条',
    expectSuccess: true,
  },
  {
    name: '模糊输入',
    input: '随便什么东西',
    expectSuccess: true, // 应该降级为简单 SELECT
  },
];

let passed = 0;
let failed = 0;

testCases.forEach((testCase, index) => {
  console.log('─'.repeat(60));
  console.log(`📋 测试 ${index + 1}: ${testCase.name}`);
  console.log('─'.repeat(60));
  console.log(`输入：${testCase.input}`);
  
  try {
    const result = converter.convert(testCase.input);
    
    if (result.success) {
      console.log(`✅ 转换成功`);
      console.log(`   SQL: ${result.sql}`);
      console.log(`   置信度：${Math.round(result.confidence * 100)}%`);
      console.log(`   说明：${result.explanation}`);
      
      if (result.warnings.length > 0) {
        console.log(`   警告：${result.warnings.join(', ')}`);
      }
      
      passed++;
    } else {
      console.log(`⚠️  转换失败：${result.explanation}`);
      if (testCase.expectSuccess) {
        failed++;
      } else {
        passed++;
      }
    }
  } catch (error) {
    console.log(`❌ 测试失败：${error instanceof Error ? error.message : error}`);
    failed++;
  }
  
  console.log('');
});

// 完整报告示例
console.log('═'.repeat(60));
console.log('📄 完整报告示例');
console.log('═'.repeat(60));

const sampleInput = '查找年龄大于 25 的用户，按创建时间降序排序，显示前 10 条';
const result = converter.convert(sampleInput);

console.log('');
console.log('╔══════════════════════════════════════════════════════════╗');
console.log('║  🗣️ 自然语言生成 SQL                                     ║');
console.log('╚══════════════════════════════════════════════════════════╝');
console.log('');
console.log(`📝 输入：${sampleInput}`);
console.log('');
if (result.success && result.sql) {
  console.log('┌─────────────────────────────────────────────────────────');
  console.log('│ 生成的 SQL');
  console.log('├─────────────────────────────────────────────────────────');
  console.log(`│ ${result.sql}`);
  console.log('└─────────────────────────────────────────────────────────');
  console.log('');
  console.log(`📊 置信度：${Math.round(result.confidence * 100)}%`);
  console.log(`💡 说明：${result.explanation}`);
  if (result.warnings.length > 0) {
    console.log('');
    console.log('⚠️ 注意：');
    result.warnings.forEach(w => console.log(`   - ${w}`));
  }
}
console.log('');

// 总结
console.log('═'.repeat(60));
console.log('📊 测试总结');
console.log('═'.repeat(60));
console.log(`✅ 通过：${passed}/${testCases.length}`);
console.log(`❌ 失败：${failed}/${testCases.length}`);
console.log('');

if (failed === 0) {
  console.log('🎉 所有测试通过！NL2SQL 功能正常工作。\n');
  process.exit(0);
} else {
  console.log('⚠️  部分测试失败，请检查实现。\n');
  process.exit(1);
}
