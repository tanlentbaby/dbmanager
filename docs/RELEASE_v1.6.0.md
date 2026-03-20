# DBManager v1.6.0 发布说明

**发布日期：** 2026-03-20  
**版本：** v1.6.0  
**主题：** 数据对比和批量操作

---

## 🎉 重大更新

v1.6.0 引入了数据对比和批量操作功能：

1. **数据对比工具** - 表结构对比/数据对比
2. **批量操作** - 批量执行 SQL
3. **同步 SQL 生成** - 自动生成同步脚本

---

## ⚖️ 数据对比工具

### 表结构对比

**对比内容：**
- 新增列
- 删除列
- 修改列 (类型/约束/默认值)

**使用场景：**
- 数据库迁移前对比
- 开发/生产环境对比
- 版本升级对比

### 数据对比

**对比内容：**
- 新增记录
- 删除记录
- 修改记录

**使用场景：**
- 数据迁移验证
- 数据同步检查
- 数据一致性验证

---

## 🔧 批量操作

### 批量执行 SQL

**功能：**
- 多条 SQL 批量执行
- 执行结果统计
- 错误处理
- 执行日志

**使用场景：**
- 批量更新数据
- 批量删除数据
- 批量导入数据

### 批量操作生成

**支持的类型：**
- 批量 INSERT
- 批量 UPDATE
- 批量 DELETE
- 自定义 SQL

---

## 📤 导出功能

### 对比报告导出

**格式：**
- 文本报告 (.txt)
- 结构化数据 (.json)

**内容：**
- 表结构变化汇总
- 详细变化列表
- 同步 SQL 脚本

### 执行结果导出

**格式：**
- JSON
- CSV
- SQL

---

## 🔧 技术实现

### 核心库

| 库 | 用途 |
|------|------|
| dataCompare.ts | 数据对比逻辑 |
| batchOperations.ts | 批量操作逻辑 |

### 核心函数

**dataCompare.ts:**
- `compareTableSchemas()` - 对比表结构
- `compareData()` - 对比数据
- `generateSyncSQL()` - 生成同步 SQL
- `formatDiffReport()` - 格式化报告

**batchOperations.ts:**
- `executeBatch()` - 批量执行
- `generateBatchInsert()` - 生成批量 INSERT
- `generateBatchUpdate()` - 生成批量 UPDATE
- `generateBatchDelete()` - 生成批量 DELETE

---

## 📊 使用示例

### 表结构对比

```typescript
import { compareTableSchemas } from '@/lib/dataCompare'

const diff = compareTableSchemas('users', schema1, schema2)

console.log('新增列:', diff.columnsAdded)
console.log('删除列:', diff.columnsRemoved)
console.log('修改列:', diff.columnsModified)
```

### 数据对比

```typescript
import { compareData } from '@/lib/dataCompare'

const diffs = compareData(data1, data2, {
  keyColumns: ['id'],
})

console.log('新增记录:', diffs.filter(d => d.changeType === 'inserted'))
console.log('删除记录:', diffs.filter(d => d.changeType === 'deleted'))
console.log('修改记录:', diffs.filter(d => d.changeType === 'modified'))
```

### 批量执行

```typescript
import { executeBatch } from '@/lib/batchOperations'

const operations = [
  { id: '1', type: 'execute', sql: 'UPDATE users SET status = "active"', status: 'pending' },
  { id: '2', type: 'execute', sql: 'DELETE FROM logs WHERE created_at < "2026-01-01"', status: 'pending' },
]

const result = await executeBatch(operations, (sql) => dbApi.executeQuery(sql))

console.log('成功:', result.success)
console.log('失败:', result.failed)
console.log('耗时:', result.duration, 'ms')
```

---

## ⚠️ 已知限制

### 当前限制
1. **数据对比** - 仅支持主键对比
2. **批量操作** - 无事务支持
3. **表结构对比** - 仅支持基础类型

### 待优化
1. 事务支持
2. 外键对比
3. 索引对比
4. 性能优化 (大数据量)

---

## 🚀 后续版本

### v1.6.1 (补丁版本)
- [ ] Bug 修复
- [ ] 性能优化

### v1.7.0 (下一版本)
- [ ] 数据结构同步
- [ ] 数据对比增强
- [ ] 批量操作事务支持

---

<div align="center">
  <strong>🎉 v1.6.0 正式发布！</strong>
</div>

<div align="center">
  
[下载 v1.6.0](https://github.com/dbmanager/dbmanager/releases/tag/v1.6.0) | [数据对比文档](./docs/COMPARE.md) | [问题反馈](https://github.com/dbmanager/dbmanager/issues)

</div>
