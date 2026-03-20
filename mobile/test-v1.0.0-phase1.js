/**
 * v1.0.0 Phase 1 测试
 * 功能完善验证
 */

import { authService } from './dist/services/auth.js';
import { storageService, queryCacheService } from './dist/services/storage.js';

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    passed++;
    console.log(`✅ ${name}`);
  } catch (error) {
    failed++;
    console.log(`❌ ${name}: ${error.message}`);
  }
}

async function asyncTest(name, fn) {
  try {
    await fn();
    passed++;
    console.log(`✅ ${name}`);
  } catch (error) {
    failed++;
    console.log(`❌ ${name}: ${error.message}`);
  }
}

console.log('═══════════════════════════════════════════════════════════');
console.log('🧪 DBManager v1.0.0 Phase 1 测试');
console.log('═══════════════════════════════════════════════════════════\n');

// ==================== 认证服务测试 ====================
console.log('🔐 认证服务测试\n');

await asyncTest('AUTH-1: 用户登录', async () => {
  const user = await authService.login({ email: 'test@example.com', password: 'password123' });
  if (!user || !user.token) throw new Error('登录失败');
  await authService.logout();
});

await asyncTest('AUTH-2: 用户注册', async () => {
  const user = await authService.register({
    email: 'newuser@example.com',
    password: 'password123',
    name: 'Test User',
  });
  if (!user || !user.id) throw new Error('注册失败');
  await authService.logout();
});

await asyncTest('AUTH-3: 获取当前用户', async () => {
  await authService.login({ email: 'test@example.com', password: 'password123' });
  const user = await authService.getCurrentUser();
  if (!user) throw new Error('获取用户失败');
  await authService.logout();
});

await asyncTest('AUTH-4: 检查登录状态', async () => {
  const loggedIn = await authService.isLoggedIn();
  // 未登录应该返回 false
  if (loggedIn) throw new Error('状态检查失败');
});

await asyncTest('AUTH-5: 登出', async () => {
  await authService.login({ email: 'test@example.com', password: 'password123' });
  await authService.logout();
  const user = await authService.getCurrentUser();
  if (user !== null) throw new Error('登出失败');
});

// ==================== 存储服务测试 ====================
console.log('\n💾 存储服务测试\n');

await asyncTest('STOR-1: 设置和获取数据', async () => {
  await storageService.set('test_key', { name: 'test' });
  const data = await storageService.get('test_key');
  if (!data || data.name !== 'test') throw new Error('存储失败');
  await storageService.remove('test_key');
});

await asyncTest('STOR-2: 数据过期', async () => {
  await storageService.set('expire_key', { test: true }, 1); // 1ms TTL
  await new Promise((r) => setTimeout(r, 10));
  const data = await storageService.get('expire_key');
  if (data !== null) throw new Error('过期失败');
});

await asyncTest('STOR-3: 检查键存在', async () => {
  await storageService.set('exists_key', 'value');
  const exists = await storageService.has('exists_key');
  if (!exists) throw new Error('检查失败');
  await storageService.remove('exists_key');
});

await asyncTest('STOR-4: 批量设置和获取', async () => {
  await storageService.setMany([
    { key: 'batch_1', value: 'value1' },
    { key: 'batch_2', value: 'value2' },
  ]);
  const data = await storageService.getMany(['batch_1', 'batch_2']);
  if (!data.batch_1 || !data.batch_2) throw new Error('批量操作失败');
  await storageService.remove('batch_1');
  await storageService.remove('batch_2');
});

await asyncTest('STOR-5: 清理过期数据', async () => {
  await storageService.set('cleanup_1', 'value1', 1);
  await storageService.set('cleanup_2', 'value2', 100000); // 不过期
  await new Promise((r) => setTimeout(r, 10));
  const cleaned = await storageService.cleanup();
  if (cleaned < 1) throw new Error('清理失败');
  await storageService.remove('cleanup_2');
});

// ==================== 查询缓存测试 ====================
console.log('\n📦 查询缓存测试\n');

await asyncTest('CACHE-1: 设置和获取查询缓存', async () => {
  const sql = 'SELECT * FROM users';
  const result = { rows: [{ id: 1, name: 'test' }] };
  await queryCacheService.set(sql, result);
  const cached = await queryCacheService.get(sql);
  if (!cached || !cached.rows) throw new Error('缓存失败');
  await queryCacheService.invalidate(sql);
});

await asyncTest('CACHE-2: 缓存失效', async () => {
  const sql = 'SELECT * FROM orders';
  await queryCacheService.set(sql, { test: true });
  await queryCacheService.invalidate(sql);
  const cached = await queryCacheService.get(sql);
  if (cached !== null) throw new Error('失效失败');
});

await asyncTest('CACHE-3: 清空缓存', async () => {
  await queryCacheService.set('SELECT 1', { test: 1 });
  await queryCacheService.set('SELECT 2', { test: 2 });
  await queryCacheService.clear();
  const cached1 = await queryCacheService.get('SELECT 1');
  const cached2 = await queryCacheService.get('SELECT 2');
  if (cached1 !== null || cached2 !== null) throw new Error('清空失败');
});

// ==================== 总结 ====================
console.log('\n═══════════════════════════════════════════════════════════');
console.log('📊 测试结果汇总');
console.log('═══════════════════════════════════════════════════════════');
console.log(`✅ 通过：${passed}`);
console.log(`❌ 失败：${failed}`);
console.log(`📝 总计：${passed + failed}`);
console.log('═══════════════════════════════════════════════════════════\n');

if (failed > 0) {
  console.log('失败的测试需要检查');
  process.exit(1);
} else {
  console.log('🎉 所有测试通过！v1.0.0 Phase 1 完成！');
  process.exit(0);
}
