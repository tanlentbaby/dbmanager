# DBManager v1.5.0 发布说明

**发布日期：** 2026-03-20  
**版本：** v1.5.0  
**主题：** 高级查询功能

---

## 🎉 重大更新

v1.5.0 引入了高级查询功能：

1. **可视化查询构建器** - 无需手写 SQL
2. **查询历史记录** - 本地保存查询历史
3. **查询收藏夹** - 收藏常用查询
4. **查询结果导出** - 导出查询结果
5. **查询性能分析** - 分析查询性能
6. **执行计划可视化** - 可视化执行计划

---

## 🔍 查询构建器

### 核心特性

- ✅ 可视化表选择
- ✅ 列选择和过滤
- ✅ JOIN 条件配置
- ✅ WHERE 条件构建
- ✅ ORDER BY 配置
- ✅ GROUP BY 配置
- ✅ 实时 SQL 预览
- ✅ 一键执行查询

### 支持的查询类型

| 类型 | 说明 | 支持 |
|------|------|------|
| SELECT | 数据查询 | ✅ |
| JOIN | 表连接 | ✅ |
| WHERE | 条件过滤 | ✅ |
| GROUP BY | 分组统计 | ✅ |
| ORDER BY | 排序 | ✅ |
| HAVING | 分组过滤 | ✅ |
| 子查询 | 嵌套查询 | ⬜ |

---

## 📤 查询结果导出

### 支持的导出格式

| 格式 | 说明 | 使用场景 |
|------|------|----------|
| CSV | 逗号分隔值 | 数据交换 |
| JSON | JavaScript 对象 | 程序传输 |
| Excel | Excel 工作簿 | 办公场景 |
| SQL | INSERT 语句 | 数据迁移 |
| Markdown | Markdown 表格 | 文档编写 |

### 导出方式

**从查询结果导出：**
1. 执行查询
2. 在结果页面点击导出按钮
3. 选择导出格式
4. 自动下载文件

---

## 📊 查询性能分析

### 性能指标

| 指标 | 说明 | 单位 |
|------|------|------|
| 执行时间 | 查询执行耗时 | ms |
| 扫描行数 | 扫描的数据行数 | 行 |
| 返回行数 | 返回的结果行数 | 行 |
| 索引使用 | 是否使用索引 | 是/否 |
| 临时表 | 是否创建临时表 | 是/否 |

### 执行计划可视化

- ✅ 树形结构展示
- ✅ 节点类型标识
- ✅ 成本估算显示
- ✅ 实际行数对比

---

## 📥 查询历史

### 历史记录功能

- ✅ 自动保存查询历史
- ✅ 本地存储 (IndexedDB)
- ✅ 搜索历史记录
- ✅ 重新执行历史查询
- ✅ 导出历史记录

### 查询收藏功能

- ✅ 收藏常用查询
- ✅ 分类管理收藏
- ✅ 快速访问收藏
- ✅ 导出导入收藏

---

## 🔧 技术实现

### 核心库

| 库 | 用途 | 版本 |
|------|------|------|
| localforage | 本地存储 | ^1.10 |
| react-codemirror2 | SQL 编辑器 | ^7.0 |
| react-json-view | JSON 查看器 | ^1.21 |

### 核心模块

**queryBuilder.ts:**
- `buildSelectQuery()` - 构建 SELECT 查询
- `addJoin()` - 添加 JOIN
- `addWhere()` - 添加 WHERE 条件
- `addOrderBy()` - 添加排序
- `addGroupBy()` - 添加分组

**queryHistory.ts:**
- `saveQuery()` - 保存查询历史
- `getHistory()` - 获取历史记录
- `searchHistory()` - 搜索历史
- `clearHistory()` - 清空历史

**queryFavorites.ts:**
- `addFavorite()` - 添加收藏
- `getFavorites()` - 获取收藏
- `removeFavorite()` - 移除收藏
- `exportFavorites()` - 导出收藏

---

## 📊 使用示例

### 构建 SELECT 查询

```typescript
import { buildSelectQuery } from '@/lib/queryBuilder'

const sql = buildSelectQuery({
  tables: ['users', 'orders'],
  columns: ['users.id', 'users.name', 'orders.amount'],
  joins: [
    {
      type: 'LEFT JOIN',
      table: 'orders',
      on: 'users.id = orders.user_id',
    },
  ],
  where: [
    { column: 'users.status', operator: '=', value: 'active' },
  ],
  orderBy: [
    { column: 'orders.amount', direction: 'DESC' },
  ],
  limit: 100,
})

// 生成的 SQL:
// SELECT users.id, users.name, orders.amount
// FROM users
// LEFT JOIN orders ON users.id = orders.user_id
// WHERE users.status = 'active'
// ORDER BY orders.amount DESC
// LIMIT 100
```

### 保存查询历史

```typescript
import { saveQuery, getHistory } from '@/lib/queryHistory'

// 保存查询
await saveQuery({
  sql: 'SELECT * FROM users',
  database: 'mydb',
  duration: 45,
  rowCount: 100,
})

// 获取历史记录
const history = await getHistory({ limit: 50 })
```

### 添加查询收藏

```typescript
import { addFavorite, getFavorites } from '@/lib/queryFavorites'

// 添加收藏
await addFavorite({
  name: '活跃用户查询',
  sql: 'SELECT * FROM users WHERE status = "active"',
  category: '用户管理',
})

// 获取收藏
const favorites = await getFavorites()
```

---

## ⚠️ 已知限制

### 当前限制
1. **子查询** - 可视化构建器暂不支持
2. **复杂 JOIN** - 多表 JOIN 配置复杂
3. **执行计划** - 仅支持 MySQL/PostgreSQL

### 待优化
1. 查询构建器性能
2. 大数据量导出
3. 执行计划优化建议
4. 查询分享功能

---

## 🚀 后续版本

### v1.5.1 (补丁版本)
- [ ] Bug 修复
- [ ] 性能优化
- [ ] 子查询支持

### v1.6.0 (下一版本)
- [ ] 数据对比工具
- [ ] 批量操作增强
- [ ] 数据结构同步

---

<div align="center">
  <strong>🎉 v1.5.0 正式发布！</strong>
</div>

<div align="center">
  
[下载 v1.5.0](https://github.com/dbmanager/dbmanager/releases/tag/v1.5.0) | [查询功能文档](./docs/QUERY.md) | [问题反馈](https://github.com/dbmanager/dbmanager/issues)

</div>
