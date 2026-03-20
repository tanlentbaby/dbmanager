# DBManager v1.7.0 发布说明

**发布日期：** 2026-03-20  
**版本：** v1.7.0  
**主题：** 数据结构同步和迁移

---

## 🎉 重大更新

v1.7.0 引入了数据结构同步和数据迁移功能：

1. **结构同步** - 对比并同步表结构
2. **数据迁移** - 批量迁移数据
3. **同步计划** - 预览和验证
4. **导出功能** - SQL/JSON/CSV 报告

---

## 🔄 结构同步

### 核心功能

**对比内容：**
- 新增列
- 删除列
- 修改列 (类型/约束/默认值)

**同步操作：**
- 创建新表
- 修改现有表
- 添加列
- 修改列
- 删除列 (可选)

**使用场景：**
- 开发→生产同步
- 数据库重构
- 版本升级

---

## 📦 数据迁移

### 核心功能

**迁移选项：**
- 选择表
- 排除表
- 批量大小
- 清空目标表
- 禁用约束

**迁移过程：**
- 生成迁移计划
- 预览和验证
- 执行迁移
- 进度追踪
- 导出报告

**使用场景：**
- 数据库迁移
- 数据备份
- 数据合并

---

## 📤 导出功能

### 结构同步导出

| 格式 | 说明 | 使用场景 |
|------|------|----------|
| SQL | DDL 脚本 | 执行同步 |
| JSON | 结构化数据 | 存档/分析 |

### 数据迁移导出

| 格式 | 说明 | 使用场景 |
|------|------|----------|
| TXT | 文本报告 | 查看 |
| CSV | 表格数据 | Excel 分析 |
| JSON | 结构化数据 | 程序处理 |

---

## 🔧 技术实现

### 核心库

| 库 | 用途 |
|------|------|
| schemaSync.ts | 结构同步逻辑 |
| dataMigration.ts | 数据迁移逻辑 |

### 核心函数

**schemaSync.ts:**
- `generateSyncPlan()` - 生成同步计划
- `validateSyncPlan()` - 验证计划
- `exportSyncPlan()` - 导出计划
- `calculateSyncProgress()` - 计算进度

**dataMigration.ts:**
- `generateMigrationPlan()` - 生成迁移计划
- `validateMigrationPlan()` - 验证计划
- `generateBatchInsertSQL()` - 生成批量 INSERT
- `exportMigrationReport()` - 导出报告

---

## 📊 使用示例

### 结构同步

```typescript
import { generateSyncPlan } from '@/lib/schemaSync'

const plan = generateSyncPlan(sourceTables, targetTables, {
  sourceDatabase: 'source_db',
  targetDatabase: 'target_db',
})

console.log('表数量:', plan.tables.length)
console.log('需要同步:', plan.tables.filter(t => t.action !== 'skip').length)
```

### 数据迁移

```typescript
import { generateMigrationPlan } from '@/lib/dataMigration'

const plan = generateMigrationPlan(tables, {
  sourceDatabase: 'source_db',
  targetDatabase: 'target_db',
  batchSize: 100,
  truncateTarget: true,
})

console.log('总行数:', plan.totalRows)
console.log('预计时间:', estimateMigrationTime(plan.totalRows), '秒')
```

---

## ⚠️ 已知限制

### 当前限制
1. **结构同步** - 仅支持基础类型
2. **数据迁移** - 无断点续传
3. **外键处理** - 需手动处理

### 待优化
1. 事务支持
2. 断点续传
3. 增量同步
4. 性能优化

---

## 🚀 后续版本

### v1.7.1 (补丁版本)
- [ ] Bug 修复
- [ ] 性能优化

### v1.8.0 (下一版本)
- [ ] 增量同步
- [ ] 断点续传
- [ ] 定时任务

---

<div align="center">
  <strong>🎉 v1.7.0 正式发布！</strong>
</div>

<div align="center">
  
[下载 v1.7.0](https://github.com/dbmanager/dbmanager/releases/tag/v1.7.0) | [同步迁移文档](./docs/SYNC_MIGRATION.md) | [问题反馈](https://github.com/dbmanager/dbmanager/issues)

</div>
