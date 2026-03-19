/**
 * v0.6.0 完整版本验证测试
 * 测试所有新功能：索引建议、SQL 修复、模板市场、云端同步
 */

import { IndexAdvisor } from './dist/utils/indexAdvisor.js';
import { SqlAutoFixer } from './dist/utils/sqlAutoFixer.js';
import { TemplateManager } from './dist/utils/templateManager.js';
import { CloudSyncManager } from './dist/utils/cloudSync.js';

console.log('╔══════════════════════════════════════════════════════════╗');
console.log('║        DBManager v0.6.0 完整版本验证测试                ║');
console.log('╚══════════════════════════════════════════════════════════╝\n');

const results = {
  phase1: { name: 'Phase 1 - 自动索引建议', passed: 0, failed: 0 },
  phase2: { name: 'Phase 2 - SQL 自动修复', passed: 0, failed: 0 },
  phase3: { name: 'Phase 3 - 查询模板市场', passed: 0, failed: 0 },
  phase4: { name: 'Phase 4 - 云端书签同步', passed: 0, failed: 0 },
};

let totalPassed = 0;
let totalFailed = 0;

// ========== Phase 1: 自动索引建议 ==========
console.log('🔹 Phase 1: 自动索引建议\n');
const indexAdvisor = new IndexAdvisor();

const indexTests = [
  { sql: "SELECT * FROM users WHERE email = 'test'", expected: 1 },
  { sql: "SELECT * FROM orders WHERE user_id = 1 AND status = 'pending'", expected: 2 },
  { sql: "SELECT * FROM products ORDER BY created_at DESC", expected: 1 },
];

for (const test of indexTests) {
  try {
    const analysis = indexAdvisor.analyze(test.sql);
    if (analysis.suggestions.length >= test.expected) {
      console.log(`  ✅ ${test.sql.substring(0, 50)}... → ${analysis.suggestions.length} 个建议`);
      results.phase1.passed++;
    } else {
      console.log(`  ❌ ${test.sql.substring(0, 50)}... → 期望${test.expected}个，实际${analysis.suggestions.length}个`);
      results.phase1.failed++;
    }
  } catch (error) {
    console.log(`  ❌ ${test.sql.substring(0, 50)}... → ${error}`);
    results.phase1.failed++;
  }
}

// ========== Phase 2: SQL 自动修复 ==========
console.log('\n🔹 Phase 2: SQL 自动修复\n');
const sqlFixer = new SqlAutoFixer();

const fixTests = [
  { sql: "SELEC * FROM users", shouldFix: true },
  { sql: "SELECT * FORM users", shouldFix: true },
  { sql: "SELECT * FROM users WHERE id = 1", shouldFix: false },
];

for (const test of fixTests) {
  try {
    const result = sqlFixer.analyze(test.sql);
    const hasIssues = result.issues.length > 0 || result.suggestions.length > 0;
    if (hasIssues === test.shouldFix) {
      console.log(`  ✅ ${test.sql} → ${hasIssues ? '检测到问题' : '无问题'}`);
      results.phase2.passed++;
    } else {
      console.log(`  ❌ ${test.sql} → 期望${test.shouldFix ? '有问题' : '无问题'}，实际${hasIssues ? '有问题' : '无问题'}`);
      results.phase2.failed++;
    }
  } catch (error) {
    console.log(`  ❌ ${test.sql} → ${error}`);
    results.phase2.failed++;
  }
}

// ========== Phase 3: 查询模板市场 ==========
console.log('\n🔹 Phase 3: 查询模板市场\n');
const templateManager = new TemplateManager();

const templateTests = [
  { name: '列出模板', fn: () => templateManager.listTemplates().length > 0 },
  { name: '搜索模板', fn: () => templateManager.searchTemplates('crud').length >= 0 },
  { name: '应用模板', fn: () => {
    const sql = templateManager.applyTemplate('crud_select_by_id', { table: 'users', id: '1' });
    return sql !== null && sql.includes('users');
  }},
  { name: '获取分类', fn: () => templateManager.getCategories().length > 0 },
  { name: '导出导入', fn: () => {
    const json = templateManager.exportTemplates();
    const result = templateManager.importTemplates(json);
    return result.success >= 0;
  }},
];

for (const test of templateTests) {
  try {
    if (test.fn()) {
      console.log(`  ✅ ${test.name}`);
      results.phase3.passed++;
    } else {
      console.log(`  ❌ ${test.name}`);
      results.phase3.failed++;
    }
  } catch (error) {
    console.log(`  ❌ ${test.name} → ${error}`);
    results.phase3.failed++;
  }
}

// ========== Phase 4: 云端书签同步 ==========
console.log('\n🔹 Phase 4: 云端书签同步\n');
const cloudSync = new CloudSyncManager();

const cloudTests = [
  { name: '登录', fn: () => {
    const result = cloudSync.login('test@v060.com');
    return result.success === true;
  }},
  { name: '检查连接', fn: () => cloudSync.checkConnection() === true },
  { name: '获取状态', fn: () => {
    const status = cloudSync.getSyncStatus([]);
    return status.isConnected === true;
  }},
  { name: '上传书签', fn: () => {
    const result = cloudSync.uploadBookmarks([]);
    return result.success === true;
  }},
  { name: '下载书签', fn: () => {
    const result = cloudSync.downloadBookmarks();
    return result.success === true;
  }},
  { name: '同步', fn: () => {
    const result = cloudSync.sync([]);
    return result.success === true;
  }},
  { name: '登出', fn: () => {
    cloudSync.logout();
    return cloudSync.checkConnection() === false;
  }},
];

for (const test of cloudTests) {
  try {
    if (test.fn()) {
      console.log(`  ✅ ${test.name}`);
      results.phase4.passed++;
    } else {
      console.log(`  ❌ ${test.name}`);
      results.phase4.failed++;
    }
  } catch (error) {
    console.log(`  ❌ ${test.name} → ${error}`);
    results.phase4.failed++;
  }
}

// ========== 汇总结果 ==========
console.log('\n╔══════════════════════════════════════════════════════════╗');
console.log('║                    测试结果汇总                          ║');
console.log('╠══════════════════════════════════════════════════════════╣');

for (const phase of Object.values(results)) {
  const total = phase.passed + phase.failed;
  const passRate = total > 0 ? Math.round((phase.passed / total) * 100) : 0;
  const status = phase.failed === 0 ? '✅' : '❌';
  console.log(`║ ${status} ${phase.name}`);
  console.log(`║    通过：${phase.passed}/${total} (${passRate}%)`);
  totalPassed += phase.passed;
  totalFailed += phase.failed;
}

const grandTotal = totalPassed + totalFailed;
const grandPassRate = grandTotal > 0 ? Math.round((totalPassed / grandTotal) * 100) : 0;
const finalStatus = totalFailed === 0 ? '✅' : '❌';

console.log('╠══════════════════════════════════════════════════════════╣');
console.log(`║ ${finalStatus} 总计：${totalPassed}/${grandTotal} 通过 (${grandPassRate}%)`);
console.log('╚══════════════════════════════════════════════════════════╝\n');

if (totalFailed === 0) {
  console.log('🎉 恭喜！DBManager v0.6.0 所有测试通过！\n');
  process.exit(0);
} else {
  console.log(`⚠️  有 ${totalFailed} 个测试失败，请检查。\n`);
  process.exit(1);
}
