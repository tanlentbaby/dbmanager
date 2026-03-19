/**
 * v0.6.0 Phase 3 - 查询模板市场功能测试
 */

import { TemplateManager } from './dist/utils/templateManager.js';

const manager = new TemplateManager();

console.log('╔══════════════════════════════════════════════════════════╗');
console.log('║  v0.6.0 Phase 3 - 查询模板市场功能测试                  ║');
console.log('╚══════════════════════════════════════════════════════════╝\n');

let passed = 0;
let failed = 0;

// 测试 1: 列出所有模板
console.log('📋 测试 1: 列出所有模板');
try {
  const templates = manager.listTemplates();
  console.log(`✅ 找到 ${templates.length} 个模板`);
  if (templates.length > 0) {
    console.log(`   前 3 个：${templates.slice(0, 3).map(t => t.name).join(', ')}`);
  }
  passed++;
} catch (error) {
  console.log(`❌ 失败：${error instanceof Error ? error.message : String(error)}`);
  failed++;
}

// 测试 2: 按分类筛选
console.log('\n📋 测试 2: 按分类筛选 (crud)');
try {
  const templates = manager.listTemplates('crud');
  console.log(`✅ CRUD 分类有 ${templates.length} 个模板`);
  passed++;
} catch (error) {
  console.log(`❌ 失败：${error instanceof Error ? error.message : String(error)}`);
  failed++;
}

// 测试 3: 搜索模板
console.log('\n📋 测试 3: 搜索模板 ("用户")');
try {
  const templates = manager.searchTemplates('用户');
  console.log(`✅ 搜索到 ${templates.length} 个相关模板`);
  passed++;
} catch (error) {
  console.log(`❌ 失败：${error instanceof Error ? error.message : String(error)}`);
  failed++;
}

// 测试 4: 获取分类
console.log('\n📋 测试 4: 获取分类');
try {
  const categories = manager.getCategories();
  console.log(`✅ 有 ${categories.length} 个分类`);
  console.log(`   分类：${categories.map(c => c.name).join(', ')}`);
  passed++;
} catch (error) {
  console.log(`❌ 失败：${error instanceof Error ? error.message : String(error)}`);
  failed++;
}

// 测试 5: 获取标签
console.log('\n📋 测试 5: 获取标签');
try {
  const tags = manager.getTags();
  console.log(`✅ 有 ${tags.length} 个标签`);
  console.log(`   标签：${tags.slice(0, 10).join(', ')}${tags.length > 10 ? '...' : ''}`);
  passed++;
} catch (error) {
  console.log(`❌ 失败：${error instanceof Error ? error.message : String(error)}`);
  failed++;
}

// 测试 6: 应用模板
console.log('\n📋 测试 6: 应用模板 (crud_select_by_id)');
try {
  const sql = manager.applyTemplate('crud_select_by_id', { table: 'users', id: '123' });
  console.log(`✅ 应用模板成功:`);
  console.log(`   ${sql}`);
  passed++;
} catch (error) {
  console.log(`❌ 失败：${error instanceof Error ? error.message : String(error)}`);
  failed++;
}

// 测试 7: 应用模板（带未替换变量）
console.log('\n📋 测试 7: 应用模板（部分变量）');
try {
  const sql = manager.applyTemplate('crud_select_by_id', { table: 'users' });
  console.log(`✅ 应用模板:`);
  console.log(`   ${sql}`);
  if (sql.includes('{{')) {
    console.log(`   ⚠️ 包含未替换变量（符合预期）`);
  }
  passed++;
} catch (error) {
  console.log(`❌ 失败：${error instanceof Error ? error.message : String(error)}`);
  failed++;
}

// 测试 8: 获取统计信息
console.log('\n📋 测试 8: 获取统计信息');
try {
  const stats = manager.getStats();
  console.log(`✅ 统计信息:`);
  console.log(`   总数：${stats.total}`);
  console.log(`   内置：${stats.builtin}`);
  console.log(`   自定义：${stats.custom}`);
  passed++;
} catch (error) {
  console.log(`❌ 失败：${error instanceof Error ? error.message : String(error)}`);
  failed++;
}

// 测试 9: 导出模板
console.log('\n📋 测试 9: 导出模板');
try {
  const json = manager.exportTemplates();
  const data = JSON.parse(json);
  console.log(`✅ 导出成功:`);
  console.log(`   版本：${data.version}`);
  console.log(`   模板数：${data.templates.length}`);
  passed++;
} catch (error) {
  console.log(`❌ 失败：${error instanceof Error ? error.message : String(error)}`);
  failed++;
}

// 测试 10: 导入模板
console.log('\n📋 测试 10: 导入模板');
try {
  const testTemplate = {
    version: '1.0',
    exportedAt: new Date().toISOString(),
    templates: [
      {
        name: '测试模板',
        description: '这是一个测试模板',
        sql: 'SELECT * FROM test_table',
        category: 'basic',
        tags: ['test'],
      }
    ]
  };
  
  const result = manager.importTemplates(JSON.stringify(testTemplate));
  console.log(`✅ 导入结果:`);
  console.log(`   成功：${result.success}`);
  console.log(`   失败：${result.failed}`);
  if (result.errors.length > 0) {
    console.log(`   错误：${result.errors.join(', ')}`);
  }
  passed++;
} catch (error) {
  console.log(`❌ 失败：${error instanceof Error ? error.message : String(error)}`);
  failed++;
}

// 测试 11: 验证导入的模板
console.log('\n📋 测试 11: 验证导入的模板');
try {
  const templates = manager.searchTemplates('测试模板');
  if (templates.length > 0) {
    console.log(`✅ 找到导入的模板：${templates[0].name}`);
    passed++;
  } else {
    console.log(`❌ 未找到导入的模板`);
    failed++;
  }
} catch (error) {
  console.log(`❌ 失败：${error instanceof Error ? error.message : String(error)}`);
  failed++;
}

// 测试 12: 格式化输出
console.log('\n📋 测试 12: 格式化输出');
try {
  const templates = manager.listTemplates().slice(0, 3);
  const output = manager.formatTemplateList(templates);
  console.log(`✅ 格式化输出示例:`);
  console.log(output.split('\n').slice(0, 5).join('\n'));
  passed++;
} catch (error) {
  console.log(`❌ 失败：${error instanceof Error ? error.message : String(error)}`);
  failed++;
}

console.log('\n╔══════════════════════════════════════════════════════════╗');
console.log(`║  测试结果：${passed} 通过，${failed} 失败${failed === 0 ? ' ✅' : ' ❌'}                        ║`);
console.log('╚══════════════════════════════════════════════════════════╝\n');

process.exit(failed > 0 ? 1 : 0);
