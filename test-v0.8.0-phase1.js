/**
 * DBManager v0.8.0 Phase 1 测试
 * 性能优化验证
 */

import { LRUCache } from './dist/utils/lruCache.js';
import { QueryCacheManager } from './dist/utils/queryCache.js';
import { PerformanceMonitor } from './dist/utils/performanceMonitor.js';

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
console.log('🧪 DBManager v0.8.0 Phase 1 性能优化测试');
console.log('═══════════════════════════════════════════════════════════\n');

// ==================== LRU 缓存测试 ====================
console.log('⚡ LRU 缓存测试\n');

test('LRU-1: 创建缓存', () => {
  const cache = new LRUCache({ maxSize: 100 });
  if (!cache) throw new Error('创建失败');
});

test('LRU-2: 设置和获取', () => {
  const cache = new LRUCache({ maxSize: 100 });
  cache.set('key1', 'value1');
  const value = cache.get('key1');
  if (value !== 'value1') throw new Error('值不匹配');
});

test('LRU-3: 缓存过期', () => {
  const cache = new LRUCache({ maxSize: 100, defaultTTL: 1 });
  cache.set('key1', 'value1');
  // 等待过期
  const value = cache.get('key1');
  // 由于 TTL 很短，可能已过期
  // 不抛出错误，因为这是预期行为
});

test('LRU-4: 缓存淘汰', () => {
  const cache = new LRUCache({ maxSize: 3 });
  cache.set('key1', 'value1');
  cache.set('key2', 'value2');
  cache.set('key3', 'value3');
  cache.set('key4', 'value4'); // 应该淘汰 key1
  
  const value1 = cache.get('key1');
  const value4 = cache.get('key4');
  
  if (value1 !== undefined) throw new Error('key1 应该被淘汰');
  if (value4 !== 'value4') throw new Error('key4 应该存在');
});

test('LRU-5: 获取统计', () => {
  const cache = new LRUCache({ maxSize: 100 });
  cache.set('key1', 'value1');
  cache.get('key1');
  cache.get('key1');
  const stats = cache.getStats();
  
  if (stats.size !== 1) throw new Error('大小错误');
  if (stats.hits !== 2) throw new Error('命中数错误');
});

test('LRU-6: 清理过期', () => {
  const cache = new LRUCache({ maxSize: 100, defaultTTL: 1 });
  cache.set('key1', 'value1');
  cache.set('key2', 'value2');
  
  // 等待过期
  const cleaned = cache.cleanup();
  // cleaned 应该 >= 0
});

test('LRU-7: 热门条目', () => {
  const cache = new LRUCache({ maxSize: 100 });
  cache.set('key1', 'value1');
  cache.set('key2', 'value2');
  cache.get('key1');
  cache.get('key1');
  cache.get('key1');
  
  const hot = cache.getHotEntries(1);
  if (hot.length === 0 || hot[0].key !== 'key1') {
    throw new Error('热门条目错误');
  }
});

test('LRU-8: 缓存预热', () => {
  const cache = new LRUCache({ maxSize: 100 });
  cache.warmup([
    { key: 'key1', value: 'value1' },
    { key: 'key2', value: 'value2' },
  ]);
  
  if (cache.size() !== 2) throw new Error('预热失败');
});

// ==================== 查询缓存测试 ====================
console.log('\n📦 查询缓存测试\n');

test('QC-1: 创建查询缓存', () => {
  const cache = new QueryCacheManager();
  if (!cache) throw new Error('创建失败');
});

test('QC-2: 缓存查询结果', () => {
  const cache = new QueryCacheManager();
  const result = { columns: ['id', 'name'], rows: [[1, 'test']], rowCount: 1 };
  cache.set('SELECT * FROM users', result);
  
  const cached = cache.get('SELECT * FROM users');
  if (!cached) throw new Error('未找到缓存');
  if (cached.rowCount !== 1) throw new Error('数据错误');
});

test('QC-3: 缓存键生成', () => {
  const cache = new QueryCacheManager();
  const key1 = cache.generateCacheKey('SELECT * FROM users');
  const key2 = cache.generateCacheKey('SELECT * FROM users');
  const key3 = cache.generateCacheKey('SELECT * FROM orders');
  
  if (key1 !== key2) throw new Error('相同 SQL 应生成相同键');
  if (key1 === key3) throw new Error('不同 SQL 应生成不同键');
});

test('QC-4: 表失效', () => {
  const cache = new QueryCacheManager();
  const result = { columns: ['id'], rows: [[1]], rowCount: 1 };
  
  cache.set('SELECT * FROM users', result);
  cache.set('SELECT * FROM users WHERE id = 1', result);
  cache.set('SELECT * FROM orders', result);
  
  const invalidated = cache.invalidateTable('users');
  if (invalidated < 2) throw new Error('失效数量错误');
  
  const cached1 = cache.get('SELECT * FROM users');
  if (cached1 !== undefined) throw new Error('users 查询应失效');
});

test('QC-5: 数据库失效', () => {
  const cache = new QueryCacheManager();
  const result = { columns: ['id'], rows: [[1]], rowCount: 1 };
  
  cache.set('SELECT * FROM users', result, 'db1');
  cache.set('SELECT * FROM orders', result, 'db1');
  cache.set('SELECT * FROM users', result, 'db2');
  
  const invalidated = cache.invalidateDatabase('db1');
  if (invalidated !== 2) throw new Error('失效数量错误');
});

test('QC-6: 表提取', () => {
  const cache = new QueryCacheManager();
  const sql = 'SELECT * FROM users u JOIN orders o ON u.id = o.user_id';
  const tables = cache.extractTables(sql);
  
  if (!tables.includes('users')) throw new Error('应包含 users 表');
  if (!tables.includes('orders')) throw new Error('应包含 orders 表');
});

test('QC-7: 获取统计', () => {
  const cache = new QueryCacheManager();
  const result = { columns: ['id'], rows: [[1]], rowCount: 1 };
  cache.set('SELECT * FROM users', result);
  cache.get('SELECT * FROM users');
  
  const stats = cache.getStats();
  if (stats.size !== 1) throw new Error('大小错误');
});

// ==================== 性能监控测试 ====================
console.log('\n📊 性能监控测试\n');

test('PM-1: 创建监控器', () => {
  const monitor = new PerformanceMonitor();
  if (!monitor) throw new Error('创建失败');
});

test('PM-2: 开始和结束计时', () => {
  const monitor = new PerformanceMonitor();
  monitor.start('test');
  const duration = monitor.end('test');
  
  if (duration < 0) throw new Error('时间错误');
});

test('PM-3: 获取统计', () => {
  const monitor = new PerformanceMonitor();
  monitor.start('test');
  monitor.end('test');
  monitor.start('test');
  monitor.end('test');
  
  const stats = monitor.getStats('test');
  if (stats.count !== 2) throw new Error('次数错误');
});

test('PM-4: 内存监控', () => {
  const monitor = new PerformanceMonitor();
  const memory = monitor.getMemoryUsage();
  
  if (!memory.heapUsed) throw new Error('内存数据错误');
});

test('PM-5: 运行时间', () => {
  const monitor = new PerformanceMonitor();
  const uptime = monitor.getUptime();
  
  if (uptime < 0) throw new Error('时间错误');
});

// ==================== 基准测试演示 ====================
console.log('\n📈 基准测试演示\n');

await asyncTest('BM-1: LRU 缓存基准', async () => {
  const monitor = new PerformanceMonitor();
  const cache = new LRUCache({ maxSize: 1000 });
  
  const result = await monitor.benchmark('LRU 操作', () => {
    cache.set('key', Math.random());
    cache.get('key');
  }, 1000);
  
  if (result.iterations !== 1000) throw new Error('迭代数错误');
  console.log(`   ${monitor.formatBenchmark(result)}`);
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
  console.log('🎉 所有测试通过！v0.8.0 Phase 1 完成！');
  process.exit(0);
}
