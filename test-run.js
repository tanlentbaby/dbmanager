/**
 * 测试运行脚本
 */

import { ConfigManager } from './dist/config/manager.js';
import { ConnectionManager } from './dist/database/connection.js';

async function runTest() {
  console.log('🧪 DBManager v0.2.0 测试运行\n');
  
  const configManager = new ConfigManager();
  const connectionManager = new ConnectionManager(configManager);
  
  // 添加测试配置（带密码）
  console.log('1. 添加 SQLite 测试配置...');
  try {
    await configManager.addConfig('test-sqlite', 'sqlite', 'localhost', 0, '', 'test123', '/tmp/test.db');
    console.log('   ✓ 配置已添加\n');
  } catch (error) {
    console.log('   ⚠ 配置可能已存在\n');
  }
  
  // 连接数据库
  console.log('2. 连接到 test-sqlite...');
  try {
    await connectionManager.connect('test-sqlite');
    console.log('   ✓ 连接成功\n');
  } catch (error) {
    console.log(`   ✗ 连接失败：${error.message}\n`);
    return;
  }
  
  // 查询表
  console.log('3. 获取表列表...');
  const tables = await connectionManager.getTables();
  console.log(`   ✓ 找到 ${tables.length} 个表：${tables.join(', ')}\n`);
  
  // 查询数据
  console.log('4. 执行 SELECT * FROM users...');
  const result = await connectionManager.execute('SELECT * FROM users');
  console.log(`   ✓ 返回 ${result.rows.length} 行数据`);
  console.log('   数据:');
  result.rows.forEach(row => {
    console.log(`     - ${JSON.stringify(row)}`);
  });
  console.log('');
  
  // 断开连接
  console.log('5. 断开连接...');
  connectionManager.disconnect();
  console.log('   ✓ 已断开\n');
  
  console.log('🎉 测试完成！');
}

runTest().catch(console.error);
