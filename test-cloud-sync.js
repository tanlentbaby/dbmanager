/**
 * v0.6.0 Phase 4 - 云端书签同步功能测试
 */

import { CloudSyncManager } from './dist/utils/cloudSync.js';

const syncManager = new CloudSyncManager();

console.log('╔══════════════════════════════════════════════════════════╗');
console.log('║  v0.6.0 Phase 4 - 云端书签同步功能测试                  ║');
console.log('╚══════════════════════════════════════════════════════════╝\n');

let passed = 0;
let failed = 0;

// 测试 1: 登录
console.log('📋 测试 1: 登录');
try {
  const result = syncManager.login('test@example.com');
  if (result.success && result.user) {
    console.log(`✅ 登录成功：${result.user.name} (${result.user.email})`);
    passed++;
  } else {
    console.log(`❌ 登录失败：${result.error}`);
    failed++;
  }
} catch (error) {
  console.log(`❌ 失败：${error instanceof Error ? error.message : String(error)}`);
  failed++;
}

// 测试 2: 检查连接状态
console.log('\n📋 测试 2: 检查连接状态');
try {
  const isConnected = syncManager.checkConnection();
  console.log(`✅ 连接状态：${isConnected ? '已连接' : '未连接'}`);
  if (isConnected) passed++;
  else { console.log('❌ 应该已连接'); failed++; }
} catch (error) {
  console.log(`❌ 失败：${error instanceof Error ? error.message : String(error)}`);
  failed++;
}

// 测试 3: 获取当前用户
console.log('\n📋 测试 3: 获取当前用户');
try {
  const user = syncManager.getCurrentUser();
  if (user) {
    console.log(`✅ 用户：${user.name}, 计划：${user.plan}`);
    passed++;
  } else {
    console.log('❌ 未获取到用户');
    failed++;
  }
} catch (error) {
  console.log(`❌ 失败：${error instanceof Error ? error.message : String(error)}`);
  failed++;
}

// 测试 4: 获取同步状态
console.log('\n📋 测试 4: 获取同步状态');
try {
  const status = syncManager.getSyncStatus([]);
  const output = syncManager.formatSyncStatus(status);
  console.log(`✅ 同步状态:\n${output}`);
  passed++;
} catch (error) {
  console.log(`❌ 失败：${error instanceof Error ? error.message : String(error)}`);
  failed++;
}

// 测试 5: 上传书签
console.log('\n📋 测试 5: 上传书签');
try {
  const mockBookmarks = [
    { id: '1', name: '测试书签', sql: 'SELECT 1', tags: [], localVersion: 1, syncStatus: 'pending', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
  ];
  const result = syncManager.uploadBookmarks(mockBookmarks);
  if (result.success) {
    console.log(`✅ 上传成功：${result.uploaded} 个书签`);
    passed++;
  } else {
    console.log(`❌ 上传失败：${result.error}`);
    failed++;
  }
} catch (error) {
  console.log(`❌ 失败：${error instanceof Error ? error.message : String(error)}`);
  failed++;
}

// 测试 6: 下载书签
console.log('\n📋 测试 6: 下载书签');
try {
  const result = syncManager.downloadBookmarks();
  if (result.success) {
    console.log(`✅ 下载成功：${result.bookmarks.length} 个书签`);
    passed++;
  } else {
    console.log(`❌ 下载失败：${result.error}`);
    failed++;
  }
} catch (error) {
  console.log(`❌ 失败：${error instanceof Error ? error.message : String(error)}`);
  failed++;
}

// 测试 7: 同步
console.log('\n📋 测试 7: 同步');
try {
  const mockBookmarks = [
    { id: '2', name: '本地书签', sql: 'SELECT 2', tags: [], localVersion: 1, syncStatus: 'pending', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
  ];
  const result = syncManager.sync(mockBookmarks);
  if (result.success) {
    console.log(`✅ 同步成功：合并 ${result.merged.length} 个，冲突 ${result.conflicts.length} 个`);
    passed++;
  } else {
    console.log(`❌ 同步失败：${result.error}`);
    failed++;
  }
} catch (error) {
  console.log(`❌ 失败：${error instanceof Error ? error.message : String(error)}`);
  failed++;
}

// 测试 8: 获取同步历史
console.log('\n📋 测试 8: 获取同步历史');
try {
  const history = syncManager.getSyncHistory(10);
  console.log(`✅ 同步历史：${history.length} 条记录`);
  if (history.length > 0) {
    console.log(`   最近：${history[history.length - 1].action}`);
  }
  passed++;
} catch (error) {
  console.log(`❌ 失败：${error instanceof Error ? error.message : String(error)}`);
  failed++;
}

// 测试 9: 格式化同步历史
console.log('\n📋 测试 9: 格式化同步历史');
try {
  const history = syncManager.getSyncHistory(5);
  const output = syncManager.formatSyncHistory(history);
  console.log(`✅ 格式化输出:\n${output.split('\n').slice(0, 5).join('\n')}`);
  passed++;
} catch (error) {
  console.log(`❌ 失败：${error instanceof Error ? error.message : String(error)}`);
  failed++;
}

// 测试 10: 登出
console.log('\n📋 测试 10: 登出');
try {
  syncManager.logout();
  const isConnected = syncManager.checkConnection();
  if (!isConnected) {
    console.log(`✅ 登出成功`);
    passed++;
  } else {
    console.log('❌ 应该已登出');
    failed++;
  }
} catch (error) {
  console.log(`❌ 失败：${error instanceof Error ? error.message : String(error)}`);
  failed++;
}

// 测试 11: 未登录状态测试
console.log('\n📋 测试 11: 未登录状态测试');
try {
  const result = syncManager.uploadBookmarks([]);
  if (!result.success && result.error) {
    console.log(`✅ 正确拒绝未登录操作：${result.error}`);
    passed++;
  } else {
    console.log('❌ 应该拒绝未登录操作');
    failed++;
  }
} catch (error) {
  console.log(`❌ 失败：${error instanceof Error ? error.message : String(error)}`);
  failed++;
}

// 测试 12: 无效邮箱登录
console.log('\n📋 测试 12: 无效邮箱登录');
try {
  const result = syncManager.login('invalid-email');
  if (!result.success && result.error) {
    console.log(`✅ 正确拒绝无效邮箱：${result.error}`);
    passed++;
  } else {
    console.log('❌ 应该拒绝无效邮箱');
    failed++;
  }
} catch (error) {
  console.log(`❌ 失败：${error instanceof Error ? error.message : String(error)}`);
  failed++;
}

console.log('\n╔══════════════════════════════════════════════════════════╗');
console.log(`║  测试结果：${passed} 通过，${failed} 失败${failed === 0 ? ' ✅' : ' ❌'}                        ║`);
console.log('╚══════════════════════════════════════════════════════════╝\n');

process.exit(failed > 0 ? 1 : 0);
