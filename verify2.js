#!/usr/bin/env node
/**
 * DBManager 验证脚本 - 第 2 轮验证
 * 测试模块导出和类型定义
 */

import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const require = createRequire(import.meta.url);

console.log('╔══════════════════════════════════════════════════════════╗');
console.log('║         DBManager TypeScript 版本 - 第 2 轮验证           ║');
console.log('║                    模块导出测试                          ║');
console.log('╚══════════════════════════════════════════════════════════╝\n');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`✓ ${name}`);
    passed++;
  } catch (error) {
    console.log(`✗ ${name}`);
    console.log(`  错误：${error.message}`);
    failed++;
  }
}

// 异步测试包装
async function runTests() {
  // 测试 1: 类型定义验证
  test('类型定义完整', () => {
    const typesContent = fs.readFileSync(join(__dirname, 'dist/types.d.ts'), 'utf-8');
    const requiredTypes = [
      'DbConfig',
      'ConfigInstance',
      'ConfigData',
      'Settings',
      'ColumnInfo',
      'TableSchema',
      'IndexInfo',
      'QueryResult',
      'ConnectionTestResult',
      'DatabaseConnection',
      'ExplainResult'
    ];
    for (const type of requiredTypes) {
      if (!typesContent.includes(type)) {
        throw new Error(`缺少类型定义：${type}`);
      }
    }
  });

  // 测试 2: ConfigManager 导出
  test('ConfigManager 模块导出', async () => {
    const module = await import('./dist/config/manager.js');
    if (!module.ConfigManager) throw new Error('ConfigManager 未导出');
    const cm = new module.ConfigManager();
    if (!cm.listConfigs) throw new Error('listConfigs 方法不存在');
    if (!cm.getConfig) throw new Error('getConfig 方法不存在');
    if (!cm.addConfig) throw new Error('addConfig 方法不存在');
  });

  // 测试 3: ConnectionManager 导出
  test('ConnectionManager 模块导出', async () => {
    const module = await import('./dist/database/connection.js');
    if (!module.ConnectionManager) throw new Error('ConnectionManager 未导出');
  });

  // 测试 4: CommandHandler 导出
  test('CommandHandler 模块导出', async () => {
    const module = await import('./dist/cli/commands.js');
    if (!module.CommandHandler) throw new Error('CommandHandler 未导出');
  });

  // 测试 5: TableFormatter 导出
  test('TableFormatter 模块导出', async () => {
    const module = await import('./dist/utils/formatter.js');
    if (!module.TableFormatter) throw new Error('TableFormatter 未导出');
    const tf = new module.TableFormatter();
    const result = tf.formatTable(['a', 'b'], [[1, 2]]);
    if (!result.includes('│')) throw new Error('表格格式不正确');
  });

  // 测试 6: App 组件导出
  test('App 组件导出', async () => {
    const module = await import('./dist/app.js');
    if (!module.App) throw new Error('App 组件未导出');
  });

  // 测试 7: 输出格式函数验证
  test('输出格式函数验证', async () => {
    const module = await import('./dist/utils/formatter.js');
    const tf = new module.TableFormatter();

    // 表格格式
    const table = tf.formatTable(['id', 'name'], [[1, 'Alice'], [2, 'Bob']]);
    if (!table.includes('id') || !table.includes('name')) throw new Error('表格输出异常');

    // JSON 格式
    const json = tf.formatJson(['id', 'name'], [[1, 'Alice'], [2, 'Bob']]);
    const parsed = JSON.parse(json);
    if (parsed.length !== 2) throw new Error('JSON 输出异常');

    // CSV 格式
    const csv = tf.formatCsv(['id', 'name'], [[1, 'Alice'], [2, 'Bob']]);
    if (!csv.includes('id,name')) throw new Error('CSV 输出异常');

    // Markdown 格式
    const md = tf.formatMarkdown(['id', 'name'], [[1, 'Alice'], [2, 'Bob']]);
    if (!md.includes('| id | name |')) throw new Error('Markdown 输出异常');
  });

  // 测试 8: 配置管理功能
  test('配置管理功能', async () => {
    const module = await import('./dist/config/manager.js');
    const cm = new module.ConfigManager();

    // 获取设置
    const settings = cm.settings;
    if (!settings.maxDisplayRows) throw new Error('settings 获取失败');
    if (settings.outputFormat !== 'table') throw new Error('默认格式异常');
  });

  // 测试 9: 命令处理器验证
  test('命令处理器验证', async () => {
    const commandsModule = await import('./dist/cli/commands.js');
    const configModule = await import('./dist/config/manager.js');
    const connectionModule = await import('./dist/database/connection.js');

    const cm = new configModule.ConfigManager();
    const connM = new connectionModule.ConnectionManager(cm);
    const ch = new commandsModule.CommandHandler(cm, connM, () => {});

    if (!ch.handleCommand) throw new Error('handleCommand 方法不存在');
  });

  // 等待所有异步测试完成
  await new Promise(resolve => setTimeout(resolve, 1000));
}

// 运行测试
runTests().then(() => {
  console.log('\n' + '═'.repeat(60));
  console.log(`验证结果：${passed} 通过，${failed} 失败`);
  console.log('═'.repeat(60));

  if (failed === 0) {
    console.log('\n✓ 第 2 轮验证通过！\n');
    process.exit(0);
  } else {
    console.log(`\n✗ 第 2 轮验证失败\n`);
    process.exit(1);
  }
}).catch(err => {
  console.error('测试执行失败:', err);
  process.exit(1);
});
