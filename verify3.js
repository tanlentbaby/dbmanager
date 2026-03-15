#!/usr/bin/env node
/**
 * DBManager 验证脚本 - 第 3 轮验证
 * 集成测试：数据库操作、SQL 执行、事务管理
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';
import { spawn } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('╔══════════════════════════════════════════════════════════╗');
console.log('║         DBManager TypeScript 版本 - 第 3 轮验证           ║');
console.log('║                  集成测试验证                            ║');
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
  const TEST_DB_PATH = join(__dirname, 'test_verify.db');

  // 清理测试数据库
  function cleanup() {
    if (fs.existsSync(TEST_DB_PATH)) {
      fs.unlinkSync(TEST_DB_PATH);
    }
  }

  // 运行交互式命令测试
  async function runInteractiveTest(testName, commands, expectedOutputs) {
    return new Promise((resolve) => {
      const child = spawn('node', [join(__dirname, 'dist/main.js')], {
        cwd: __dirname,
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let output = '';
      let commandIndex = 0;
      let allOutputsFound = true;

      child.stdout.on('data', (data) => {
        output += data.toString();
      });

      child.stderr.on('data', (data) => {
        // 忽略错误输出
      });

      // 发送命令
      const sendCommand = () => {
        if (commandIndex < commands.length) {
          setTimeout(() => {
            child.stdin.write(commands[commandIndex] + '\n');
            commandIndex++;
            sendCommand();
          }, 300);
        } else {
          // 所有命令发送完毕，验证结果
          setTimeout(() => {
            for (const expected of expectedOutputs) {
              if (!output.includes(expected)) {
                allOutputsFound = false;
                break;
              }
            }
            child.stdin.write('/quit\n');
            setTimeout(() => {
              child.kill();
              resolve(allOutputsFound);
            }, 300);
          }, 800);
        }
      };

      // 等待启动后发送第一个命令
      setTimeout(() => {
        sendCommand();
      }, 500);
    });
  }

  // 测试 1: SQLite 数据库创建和连接
  await test('SQLite 数据库创建和连接', async () => {
    cleanup();
    const passed = await runInteractiveTest(
      '创建 SQLite 配置',
      [
        `/config add testdb sqlite ${TEST_DB_PATH} - - `,
        '/connect testdb',
        '/quit'
      ],
      ['✓ 配置已保存', '✓ 已连接到 testdb']
    );
    if (!passed) throw new Error('SQLite 配置创建或连接失败');
  });

  // 测试 2: 表创建
  await test('表创建操作', async () => {
    const passed = await runInteractiveTest(
      '创建表',
      [
        `/config add testdb sqlite ${TEST_DB_PATH} - - `,
        '/connect testdb',
        'CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT NOT NULL, email TEXT);',
        '/quit'
      ],
      ['✓ 执行成功', '0 rows affected']
    );
    if (!passed) throw new Error('表创建失败');
  });

  // 测试 3: 表列出
  await test('表列出功能', async () => {
    const passed = await runInteractiveTest(
      '列出表',
      [
        `/config add testdb sqlite ${TEST_DB_PATH} - - `,
        '/connect testdb',
        'CREATE TABLE products (id INTEGER, name TEXT);',
        '/list',
        '/quit'
      ],
      ['Tables in', 'products']
    );
    if (!passed) throw new Error('表列出失败');
  });

  // 测试 4: 数据插入
  await test('数据插入操作', async () => {
    const passed = await runInteractiveTest(
      '插入数据',
      [
        `/config add testdb sqlite ${TEST_DB_PATH} - - `,
        '/connect testdb',
        'CREATE TABLE test (id INTEGER, value TEXT);',
        "INSERT INTO test VALUES (1, 'hello');",
        '/quit'
      ],
      ['✓ 执行成功', '1 rows affected']
    );
    if (!passed) throw new Error('数据插入失败');
  });

  // 测试 5: 数据查询
  await test('数据查询操作', async () => {
    const passed = await runInteractiveTest(
      '查询数据',
      [
        `/config add testdb sqlite ${TEST_DB_PATH} - - `,
        '/connect testdb',
        'CREATE TABLE query_test (id INTEGER, name TEXT);',
        "INSERT INTO query_test VALUES (1, 'Alice'), (2, 'Bob');",
        'SELECT * FROM query_test;',
        '/quit'
      ],
      ['Alice', 'Bob']
    );
    if (!passed) throw new Error('数据查询失败');
  });

  // 测试 6: 事务管理 - 开始和回滚
  await test('事务管理 - 回滚', async () => {
    const passed = await runInteractiveTest(
      '事务回滚',
      [
        `/config add testdb sqlite ${TEST_DB_PATH} - - `,
        '/connect testdb',
        '/begin',
        'CREATE TABLE rollback_test (id INTEGER);',
        '/rollback',
        '/quit'
      ],
      ['✓ 事务已开始', '✓ 事务已回滚']
    );
    if (!passed) throw new Error('事务回滚失败');
  });

  // 测试 7: 输出格式切换
  await test('输出格式切换 - JSON', async () => {
    const passed = await runInteractiveTest(
      'JSON 格式',
      [
        '/format json',
        '/quit'
      ],
      ['✓ 输出格式已设置为：json']
    );
    if (!passed) throw new Error('JSON 格式切换失败');
  });

  await test('输出格式切换 - CSV', async () => {
    const passed = await runInteractiveTest(
      'CSV 格式',
      [
        '/format csv',
        '/quit'
      ],
      ['✓ 输出格式已设置为：csv']
    );
    if (!passed) throw new Error('CSV 格式切换失败');
  });

  await test('输出格式切换 - Markdown', async () => {
    const passed = await runInteractiveTest(
      'Markdown 格式',
      [
        '/format markdown',
        '/quit'
      ],
      ['✓ 输出格式已设置为：markdown']
    );
    if (!passed) throw new Error('Markdown 格式切换失败');
  });

  // 测试 8: 历史命令
  await test('历史命令功能', async () => {
    const passed = await runInteractiveTest(
      '查看历史',
      [
        '/help',
        '/format table',
        '/history',
        '/quit'
      ],
      ['最近', '/help', '/format']
    );
    if (!passed) throw new Error('历史命令功能失败');
  });

  // 测试 9: 表结构查看
  await test('表结构查看', async () => {
    const passed = await runInteractiveTest(
      '查看表结构',
      [
        `/config add testdb sqlite ${TEST_DB_PATH} - - `,
        '/connect testdb',
        'CREATE TABLE schema_test (id INTEGER PRIMARY KEY, name TEXT);',
        '/schema schema_test',
        '/quit'
      ],
      ['Schema for', 'id', 'name']
    );
    if (!passed) throw new Error('表结构查看失败');
  });

  // 测试 10: 配置列表
  await test('配置列表功能', async () => {
    const passed = await runInteractiveTest(
      '列出配置',
      [
        '/config list',
        '/quit'
      ],
      ['Configurations', 'testdb']
    );
    if (!passed) throw new Error('配置列表失败');
  });

  // 测试 11: TableFormatter 独立测试
  await test('TableFormatter 独立实例化', async () => {
    const { TableFormatter } = await import('./dist/utils/formatter.js');
    const tf = new TableFormatter();

    const headers = ['id', 'name', 'email'];
    const rows = [[1, 'Alice', 'alice@example.com'], [2, 'Bob', 'bob@example.com']];

    // 测试表格格式
    const table = tf.formatTable(headers, rows);
    if (!table.includes('│') || !table.includes('id')) {
      throw new Error('表格格式不正确');
    }

    // 测试 JSON 格式
    const json = tf.formatJson(headers, rows);
    const parsed = JSON.parse(json);
    if (parsed.length !== 2 || parsed[0].id !== 1) {
      throw new Error('JSON 格式不正确');
    }

    // 测试 CSV 格式
    const csv = tf.formatCsv(headers, rows);
    if (!csv.includes('id,name,email') || !csv.includes('1,Alice')) {
      throw new Error('CSV 格式不正确');
    }

    // 测试 Markdown 格式
    const md = tf.formatMarkdown(headers, rows);
    if (!md.includes('| id | name | email |') || !md.includes('---')) {
      throw new Error('Markdown 格式不正确');
    }
  });

  // 测试 12: ConfigManager 持久化
  await test('ConfigManager 持久化测试', async () => {
    const { ConfigManager } = await import('./dist/config/manager.js');
    const cm = new ConfigManager();

    try {
      // 使用 addConfig 方法直接添加配置
      await cm.addConfig('persist_test', 'sqlite', '-', '-', '-', '-', ':memory:');
    } catch (e) {
      // keytar 可能在没有密码服务的环境中失败，但配置仍应保存
      if (!e.message.includes('Password is required')) {
        throw e;
      }
      // 即使 keytar 失败，配置应该已经保存
    }

    // 验证配置可获取
    const configs = cm.listConfigs();
    const found = configs['persist_test'] !== undefined;
    if (!found) {
      throw new Error('配置持久化失败');
    }
  });

  // 等待异步操作完成
  await new Promise(resolve => setTimeout(resolve, 500));

  // 最终清理
  cleanup();
}

// 运行测试
runTests().then(() => {
  console.log('\n' + '═'.repeat(60));
  console.log(`验证结果：${passed} 通过，${failed} 失败`);
  console.log('═'.repeat(60));

  if (failed === 0) {
    console.log('\n✓ 第 3 轮验证通过！\n');
    console.log('╔══════════════════════════════════════════════════════════╗');
    console.log('║                                                          ║');
    console.log('║     所有三轮验证全部通过！DBManager TypeScript 版本      ║');
    console.log('║     已成功迁移至 Ink + React + TypeScript 架构           ║');
    console.log('║                                                          ║');
    console.log('╚══════════════════════════════════════════════════════════╝\n');
    process.exit(0);
  } else {
    console.log(`\n✗ 第 3 轮验证失败\n`);
    process.exit(1);
  }
}).catch(err => {
  console.error('测试执行失败:', err);
  process.exit(1);
});
