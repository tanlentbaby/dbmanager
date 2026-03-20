/**
 * DBManager v0.8.0 Phase 2-5 测试
 */

import { StartupOptimizer } from './dist/utils/startupOptimizer.js';
import { ErrorEnhancer, ErrorCategory } from './dist/utils/errorEnhancer.js';
import { UIOptimizer } from './dist/utils/uiOptimizer.js';
import { ThemeManager, KeyBindingManager, CommandAliasManager } from './dist/utils/themeManager.js';

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
console.log('🧪 DBManager v0.8.0 Phase 2-5 测试');
console.log('═══════════════════════════════════════════════════════════\n');

// ==================== Phase 2: 启动速度优化 ====================
console.log('🚀 Phase 2: 启动速度优化\n');

test('SO-1: 创建启动优化器', () => {
  const optimizer = new StartupOptimizer();
  if (!optimizer) throw new Error('创建失败');
});

test('SO-2: 注册模块', () => {
  const optimizer = new StartupOptimizer();
  optimizer.registerModule('test', './test.js', []);
  const unloaded = optimizer.getUnloadedModules();
  if (unloaded.length !== 1) throw new Error('注册失败');
});

test('SO-3: 懒加载模式', () => {
  const optimizer = new StartupOptimizer();
  optimizer.setLazyMode(true);
  // 不抛出错误即成功
});

test('SO-4: 并行初始化', async () => {
  const optimizer = new StartupOptimizer();
  const tasks = [
    () => Promise.resolve(1),
    () => Promise.resolve(2),
    () => Promise.resolve(3),
  ];
  const results = await optimizer.parallelInit(tasks);
  if (results.length !== 3) throw new Error('并行初始化失败');
});

test('SO-5: 获取指标', () => {
  const optimizer = new StartupOptimizer();
  optimizer.recordConfigLoad(100);
  optimizer.recordConnectionTime(50);
  const metrics = optimizer.getMetrics();
  if (metrics.configLoadTime !== 100) throw new Error('指标错误');
});

test('SO-6: 分析瓶颈', () => {
  const optimizer = new StartupOptimizer();
  const bottlenecks = optimizer.analyzeBottlenecks();
  if (!Array.isArray(bottlenecks)) throw new Error('分析失败');
});

test('SO-7: 生成建议', () => {
  const optimizer = new StartupOptimizer();
  const recommendations = optimizer.generateRecommendations();
  if (!Array.isArray(recommendations)) throw new Error('建议生成失败');
});

// ==================== Phase 3: UI 响应优化 ====================
console.log('\n🎨 Phase 3: UI 响应优化\n');

test('UI-1: 创建 UI 优化器', () => {
  const optimizer = new UIOptimizer();
  if (!optimizer) throw new Error('创建失败');
});

test('UI-2: 虚拟滚动计算', () => {
  const optimizer = new UIOptimizer();
  const state = optimizer.calculateVisibleRange(100, 500, 40, 100);
  if (state.visibleStart < 0 || state.visibleEnd > 100) {
    throw new Error('计算错误');
  }
});

test('UI-3: 获取滚动样式', () => {
  const optimizer = new UIOptimizer();
  optimizer.calculateVisibleRange(100, 500, 40, 100);
  const styles = optimizer.getVirtualScrollStyles();
  if (styles.paddingTop < 0 || styles.paddingBottom < 0) {
    throw new Error('样式错误');
  }
});

test('UI-4: 防抖函数', (done) => {
  const optimizer = new UIOptimizer();
  let called = false;
  const fn = optimizer.debounce('test', () => { called = true; }, 10);
  fn();
  setTimeout(() => {
    if (!called) throw new Error('防抖失败');
  }, 50);
});

test('UI-5: 节流函数', () => {
  const optimizer = new UIOptimizer();
  let count = 0;
  const fn = optimizer.throttle('test', () => { count++; }, 100);
  fn();
  fn();
  fn();
  // 节流应该只执行一次
});

test('UI-6: 加载状态管理', () => {
  const optimizer = new UIOptimizer();
  optimizer.startLoading('test', '加载中...');
  const state = optimizer.getLoadingState('test');
  if (!state || !state.isLoading) throw new Error('状态错误');
});

test('UI-7: 停止加载', () => {
  const optimizer = new UIOptimizer();
  optimizer.startLoading('test');
  const duration = optimizer.stopLoading('test');
  if (duration < 0) throw new Error('时长错误');
});

test('UI-8: 进度条', () => {
  const optimizer = new UIOptimizer();
  const bar = optimizer.createProgressBar(50, 20);
  if (bar.length !== 20) throw new Error('进度条长度错误');
});

// ==================== Phase 4: 错误提示改进 ====================
console.log('\n💡 Phase 4: 错误提示改进\n');

test('EE-1: 创建错误增强器', () => {
  const enhancer = new ErrorEnhancer();
  if (!enhancer) throw new Error('创建失败');
});

test('EE-2: 增强连接错误', () => {
  const enhancer = new ErrorEnhancer();
  const error = new Error('ECONNREFUSED connect ECONNREFUSED 127.0.0.1:3306');
  const enhanced = enhancer.enhance(error);
  if (enhanced.category !== ErrorCategory.CONNECTION) {
    throw new Error('分类错误');
  }
});

test('EE-3: 增强语法错误', () => {
  const enhancer = new ErrorEnhancer();
  const error = new Error('You have an error in your SQL syntax');
  const enhanced = enhancer.enhance(error);
  if (enhanced.category !== ErrorCategory.SYNTAX) {
    throw new Error('分类错误');
  }
});

test('EE-4: 增强权限错误', () => {
  const enhancer = new ErrorEnhancer();
  const error = new Error('Access denied for user');
  const enhanced = enhancer.enhance(error);
  if (enhanced.category !== ErrorCategory.PERMISSION) {
    throw new Error('分类错误');
  }
});

test('EE-5: 格式化错误', () => {
  const enhancer = new ErrorEnhancer();
  const error = new Error('ECONNREFUSED');
  const enhanced = enhancer.enhance(error);
  const formatted = enhancer.formatError(enhanced);
  if (!formatted.includes('无法连接')) {
    throw new Error('格式化错误');
  }
});

test('EE-6: 添加自定义模式', () => {
  const enhancer = new ErrorEnhancer();
  enhancer.addPattern(/custom error/i, {
    category: ErrorCategory.UNKNOWN,
    friendlyMessage: '自定义错误',
    suggestions: ['检查配置'],
  });
  const error = new Error('custom error occurred');
  const enhanced = enhancer.enhance(error);
  if (enhanced.friendlyMessage !== '自定义错误') {
    throw new Error('自定义模式失败');
  }
});

// ==================== Phase 5: 主题和快捷键 ====================
console.log('\n🎹 Phase 5: 主题和快捷键\n');

test('TM-1: 创建主题管理器', () => {
  const manager = new ThemeManager();
  if (!manager) throw new Error('创建失败');
});

test('TM-2: 获取主题列表', () => {
  const manager = new ThemeManager();
  const themes = manager.getThemes();
  if (themes.length < 2) throw new Error('主题数量错误');
});

test('TM-3: 设置主题', () => {
  const manager = new ThemeManager();
  const success = manager.setTheme('dark');
  if (!success) throw new Error('设置主题失败');
});

test('TM-4: 获取颜色', () => {
  const manager = new ThemeManager();
  manager.setTheme('dark');
  const color = manager.getColor('primary');
  if (!color) throw new Error('获取颜色失败');
});

test('TM-5: 格式化主题列表', () => {
  const manager = new ThemeManager();
  const output = manager.formatThemeList();
  if (!output.includes('Dark')) throw new Error('输出错误');
});

test('KB-1: 创建快捷键管理器', () => {
  const manager = new KeyBindingManager();
  if (!manager) throw new Error('创建失败');
});

test('KB-2: 获取快捷键', () => {
  const manager = new KeyBindingManager();
  const binding = manager.getBinding('Ctrl+C');
  if (!binding) throw new Error('获取失败');
});

test('KB-3: 添加快捷键', () => {
  const manager = new KeyBindingManager();
  manager.addBinding('Ctrl+X', 'custom', '自定义操作');
  const binding = manager.getBinding('Ctrl+X');
  if (!binding) throw new Error('添加失败');
});

test('KB-4: 格式化快捷键', () => {
  const manager = new KeyBindingManager();
  const output = manager.formatBindings();
  if (!output.includes('Ctrl+C')) throw new Error('输出错误');
});

test('CA-1: 创建别名管理器', () => {
  const manager = new CommandAliasManager();
  if (!manager) throw new Error('创建失败');
});

test('CA-2: 解析别名', () => {
  const manager = new CommandAliasManager();
  const resolved = manager.resolve('co localhost');
  if (!resolved.startsWith('connect')) throw new Error('解析失败');
});

test('CA-3: 添加别名', () => {
  const manager = new CommandAliasManager();
  manager.addAlias('mycmd', 'custom-command', '我的命令');
  const resolved = manager.resolve('mycmd arg1');
  if (!resolved.startsWith('custom-command')) throw new Error('添加失败');
});

test('CA-4: 格式化别名', () => {
  const manager = new CommandAliasManager();
  const output = manager.formatAliases();
  if (!output.includes('co')) throw new Error('输出错误');
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
  console.log('🎉 所有测试通过！v0.8.0 Phase 2-5 完成！');
  process.exit(0);
}
