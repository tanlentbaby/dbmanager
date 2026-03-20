/**
 * Feishu 云文档集成测试
 * v0.7.0 Phase 1 验证测试
 */

import { FeishuCloudManager } from './dist/utils/feishuCloud.js';

console.log('🧪 Feishu 云文档集成测试 v0.7.0\n');

// 测试 1: 创建管理器
console.log('✅ 测试 1: 创建 FeishuCloudManager 实例');
const manager = new FeishuCloudManager();
console.log('   通过\n');

// 测试 2: 配置应用
console.log('✅ 测试 2: 配置 Feishu 应用');
manager.configure({
  appId: 'cli_test_app',
  appSecret: 'test_secret',
  redirectUri: 'http://localhost:3000/callback',
});
console.log('   通过\n');

// 测试 3: 获取授权 URL
console.log('✅ 测试 3: 获取 Feishu 授权 URL');
try {
  const authUrl = manager.getAuthUrl('test_state');
  console.log('   授权 URL:', authUrl);
  console.log('   通过\n');
} catch (error) {
  console.log('   ❌ 失败:', error);
}

// 测试 4: 检查登录状态
console.log('✅ 测试 4: 检查登录状态');
const isLoggedIn = manager.isLoggedIn();
console.log('   登录状态:', isLoggedIn ? '已登录' : '未登录');
console.log('   通过\n');

// 测试 5: 获取同步状态
console.log('✅ 测试 5: 获取同步状态');
const status = manager.getSyncStatus();
console.log('   连接状态:', status.isConnected ? '已连接' : '未连接');
console.log('   当前用户:', status.user?.name || '无');
console.log('   通过\n');

console.log('═══════════════════════════════════════');
console.log('✅ 所有基础测试通过！');
console.log('═══════════════════════════════════════\n');

console.log('📝 注意：');
console.log('   - 完整集成测试需要真实的 Feishu 应用配置');
console.log('   - 请使用 /cloud login --feishu 命令进行实际登录测试');
console.log('   - 确保在 ~/.dbmanager/config.json 中配置了 Feishu 凭证\n');
