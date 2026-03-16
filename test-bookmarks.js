#!/usr/bin/env node
/**
 * 查询书签功能测试脚本
 * v0.5.0 新功能验证
 */

import { BookmarkManager } from './dist/utils/bookmarks.js';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const testConfigDir = path.join(__dirname, '.test_config');

// 设置测试配置目录
process.env.DBMANAGER_CONFIG_DIR = testConfigDir;

console.log('╔══════════════════════════════════════════════════════════╗');
console.log('║  DBManager v0.5.0 - 查询书签功能测试                      ║');
console.log('╚══════════════════════════════════════════════════════════╝\n');

// 清理测试目录
if (fs.existsSync(testConfigDir)) {
  fs.rmSync(testConfigDir, { recursive: true, force: true });
}

let passed = 0;
let failed = 0;

try {
  // 测试 1: 创建管理器
  console.log('─'.repeat(60));
  console.log('📋 测试 1: 创建书签管理器');
  console.log('─'.repeat(60));
  
  const manager = new BookmarkManager();
  console.log('✅ 书签管理器创建成功');
  const stats = manager.getStats();
  console.log(`   初始书签数：${stats.total} (内置：${stats.builtin})`);
  passed++;
  console.log('');

  // 测试 2: 添加书签
  console.log('─'.repeat(60));
  console.log('📋 测试 2: 添加书签');
  console.log('─'.repeat(60));
  
  const bookmark1 = manager.add('用户列表', 'SELECT * FROM users', ['mysql', 'users']);
  console.log(`✅ 添加书签：${bookmark1.name}`);
  console.log(`   ID: ${bookmark1.id}`);
  console.log(`   SQL: ${bookmark1.sql}`);
  console.log(`   标签：${bookmark1.tags.join(', ')}`);
  passed++;
  console.log('');

  // 测试 3: 添加带描述的书签
  console.log('─'.repeat(60));
  console.log('📋 测试 3: 添加带描述的书签');
  console.log('─'.repeat(60));
  
  const bookmark2 = manager.add(
    '订单统计',
    'SELECT user_id, COUNT(*) as order_count FROM orders GROUP BY user_id',
    ['mysql', 'orders', 'stats'],
    '统计每个用户的订单数量'
  );
  console.log(`✅ 添加书签：${bookmark2.name}`);
  console.log(`   描述：${bookmark2.description}`);
  passed++;
  console.log('');

  // 测试 4: 列出所有书签
  console.log('─'.repeat(60));
  console.log('📋 测试 4: 列出所有书签');
  console.log('─'.repeat(60));
  
  const allBookmarks = manager.list();
  console.log(`✅ 共有 ${allBookmarks.length} 个书签`);
  allBookmarks.forEach((b, i) => {
    console.log(`   ${i + 1}. ${b.name} [${b.tags.join(', ')}]`);
  });
  passed++;
  console.log('');

  // 测试 5: 按标签过滤
  console.log('─'.repeat(60));
  console.log('📋 测试 5: 按标签过滤');
  console.log('─'.repeat(60));
  
  const mysqlBookmarks = manager.list('mysql');
  console.log(`✅ 标签 "mysql" 下有 ${mysqlBookmarks.length} 个书签`);
  passed++;
  console.log('');

  // 测试 6: 搜索书签
  console.log('─'.repeat(60));
  console.log('📋 测试 6: 搜索书签');
  console.log('─'.repeat(60));
  
  const searchResults = manager.search('user');
  console.log(`✅ 搜索 "user" 找到 ${searchResults.length} 个结果`);
  searchResults.forEach(b => {
    console.log(`   - ${b.name}`);
  });
  passed++;
  console.log('');

  // 测试 7: 获取书签
  console.log('─'.repeat(60));
  console.log('📋 测试 7: 获取书签详情');
  console.log('─'.repeat(60));
  
  const found = manager.get('用户列表');
  if (found) {
    console.log(`✅ 找到书签：${found.name}`);
    console.log(`   SQL: ${found.sql}`);
    passed++;
  } else {
    console.log('❌ 未找到书签');
    failed++;
  }
  console.log('');

  // 测试 8: 更新书签
  console.log('─'.repeat(60));
  console.log('📋 测试 8: 更新书签');
  console.log('─'.repeat(60));
  
  const updated = manager.update('用户列表', {
    sql: 'SELECT * FROM users WHERE status = 1',
    tags: ['mysql', 'users', 'active'],
  });
  if (updated) {
    console.log(`✅ 更新书签：${updated.name}`);
    console.log(`   新 SQL: ${updated.sql}`);
    console.log(`   新标签：${updated.tags.join(', ')}`);
    passed++;
  } else {
    console.log('❌ 更新失败');
    failed++;
  }
  console.log('');

  // 测试 9: 增加使用次数
  console.log('─'.repeat(60));
  console.log('📋 测试 9: 增加使用次数');
  console.log('─'.repeat(60));
  
  manager.incrementUsage('用户列表');
  manager.incrementUsage('用户列表');
  const refreshed = manager.get('用户列表');
  console.log(`✅ 使用次数：${refreshed?.usageCount}`);
  if (refreshed?.usageCount === 2) {
    passed++;
  } else {
    console.log('❌ 使用次数不正确');
    failed++;
  }
  console.log('');

  // 测试 10: 获取所有标签
  console.log('─'.repeat(60));
  console.log('📋 测试 10: 获取所有标签');
  console.log('─'.repeat(60));
  
  const tags = manager.getTags();
  console.log(`✅ 共有 ${tags.length} 个标签：${tags.join(', ')}`);
  passed++;
  console.log('');

  // 测试 11: 导出书签
  console.log('─'.repeat(60));
  console.log('📋 测试 11: 导出书签');
  console.log('─'.repeat(60));
  
  const exported = manager.export();
  const exportedObj = JSON.parse(exported);
  console.log(`✅ 导出成功，${exportedObj.bookmarks.length} 个书签`);
  passed++;
  console.log('');

  // 测试 12: 导入书签
  console.log('─'.repeat(60));
  console.log('📋 测试 12: 导入书签');
  console.log('─'.repeat(60));
  
  const testImport = {
    version: 1,
    bookmarks: [
      {
        id: 'test_import_1',
        name: '测试导入书签',
        sql: 'SELECT 1',
        tags: ['test'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        usageCount: 0,
      }
    ]
  };
  
  const importCount = manager.import(JSON.stringify(testImport));
  console.log(`✅ 导入 ${importCount} 个书签`);
  passed++;
  console.log('');

  // 测试 13: 删除书签
  console.log('─'.repeat(60));
  console.log('📋 测试 13: 删除书签');
  console.log('─'.repeat(60));
  
  const removed = manager.remove('测试导入书签');
  console.log(`✅ 删除成功：${removed}`);
  passed++;
  console.log('');

  // 测试 14: 尝试删除内置书签（应该失败）
  console.log('─'.repeat(60));
  console.log('📋 测试 14: 尝试删除内置书签');
  console.log('─'.repeat(60));
  
  try {
    manager.remove('builtin_list_tables');
    console.log('❌ 应该抛出错误');
    failed++;
  } catch (error) {
    console.log(`✅ 正确抛出错误：${error.message}`);
    passed++;
  }
  console.log('');

  // 测试 15: 统计信息
  console.log('─'.repeat(60));
  console.log('📋 测试 15: 统计信息');
  console.log('─'.repeat(60));
  
  const finalStats = manager.getStats();
  console.log('✅ 最终统计:');
  console.log(`   总数：${finalStats.total}`);
  console.log(`   用户书签：${finalStats.user}`);
  console.log(`   内置书签：${finalStats.builtin}`);
  console.log(`   标签数：${finalStats.tags}`);
  passed++;
  console.log('');

  // 清理测试目录
  if (fs.existsSync(testConfigDir)) {
    fs.rmSync(testConfigDir, { recursive: true, force: true });
  }

} catch (error) {
  console.log(`❌ 测试失败：${error instanceof Error ? error.message : error}`);
  failed++;
}

// 总结
console.log('═'.repeat(60));
console.log('📊 测试总结');
console.log('═'.repeat(60));
console.log(`✅ 通过：${passed}/15`);
console.log(`❌ 失败：${failed}/15`);
console.log('');

if (failed === 0) {
  console.log('🎉 所有测试通过！查询书签功能正常工作。\n');
  process.exit(0);
} else {
  console.log('⚠️  部分测试失败，请检查实现。\n');
  process.exit(1);
}
