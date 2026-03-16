#!/usr/bin/env node
/**
 * EXPLAIN 查询计划可视化测试脚本
 * v0.5.0 新功能验证
 */

import { renderExplainReport, ExplainParser } from './dist/utils/explain.js';

console.log('╔══════════════════════════════════════════════════════════╗');
console.log('║  DBManager v0.5.0 - EXPLAIN 查询计划可视化测试            ║');
console.log('╚══════════════════════════════════════════════════════════╝\n');

// MySQL 风格的 EXPLAIN 数据
const mysqlExplainRows = [
  {
    id: 1,
    selectType: 'SIMPLE',
    table: 'users',
    type: 'ALL',
    possibleKeys: null,
    key: null,
    keyLen: null,
    ref: null,
    rows: 10000,
    Extra: 'Using where',
  },
  {
    id: 1,
    selectType: 'SIMPLE',
    table: 'orders',
    type: 'ref',
    possibleKeys: 'user_id',
    key: 'user_id',
    keyLen: '4',
    ref: 'test.users.id',
    rows: 5,
    Extra: '',
  },
];

// PostgreSQL 风格的 EXPLAIN 数据
const pgExplainRows = [
  {
    'Node Type': 'Hash Join',
    'Parallel Aware': false,
    'Join Type': 'Inner',
    'Startup Cost': 42.5,
    'Total Cost': 186.0,
    'Rows': 1000,
    'Width': 100,
    'Hash Cond': '(orders.user_id = users.id)',
  },
  {
    'Node Type': 'Seq Scan',
    'Parallel Aware': false,
    'Relation Name': 'users',
    'Startup Cost': 0.0,
    'Total Cost': 30.0,
    'Rows': 2000,
    'Width': 50,
    'Filter': '(status = 1)',
  },
  {
    'Node Type': 'Hash',
    'Parallel Aware': false,
    'Startup Cost': 35.0,
    'Total Cost': 35.0,
    'Rows': 1500,
    'Width': 8,
  },
  {
    'Node Type': 'Seq Scan',
    'Parallel Aware': false,
    'Relation Name': 'orders',
    'Startup Cost': 0.0,
    'Total Cost': 35.0,
    'Rows': 1500,
    'Width': 8,
  },
];

// SQLite 风格的 EXPLAIN 数据
const sqliteExplainRows = [
  {
    id: 1,
    parent: 0,
    notused: 0,
    detail: 'SCAN TABLE users',
  },
  {
    id: 2,
    parent: 1,
    notused: 0,
    detail: 'SEARCH TABLE orders USING INDEX user_id (user_id=?)',
  },
];

console.log('═'.repeat(60));
console.log('📋 测试 1: MySQL 风格 EXPLAIN（全表扫描场景）');
console.log('═'.repeat(60));
try {
  const report = renderExplainReport(mysqlExplainRows);
  console.log(report);
} catch (error) {
  console.log(`❌ 失败：${error instanceof Error ? error.message : error}`);
}

console.log('═'.repeat(60));
console.log('📋 测试 2: PostgreSQL 风格 EXPLAIN（Hash Join 场景）');
console.log('═'.repeat(60));
try {
  const report = renderExplainReport(pgExplainRows);
  console.log(report);
} catch (error) {
  console.log(`❌ 失败：${error instanceof Error ? error.message : error}`);
}

console.log('═'.repeat(60));
console.log('📋 测试 3: SQLite 风格 EXPLAIN（简单查询）');
console.log('═'.repeat(60));
try {
  const report = renderExplainReport(sqliteExplainRows);
  console.log(report);
} catch (error) {
  console.log(`❌ 失败：${error instanceof Error ? error.message : error}`);
}

console.log('═'.repeat(60));
console.log('📊 测试完成');
console.log('═'.repeat(60));
console.log('✅ EXPLAIN 查询计划可视化功能正常工作\n');
