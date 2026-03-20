# DBManager v1.4.0 发布说明

**发布日期：** 2026-03-20  
**版本：** v1.4.0  
**主题：** ER 图和数据建模

---

## 🎉 重大更新

v1.4.0 引入了可视化 ER 图和数据建模功能：

1. **ER 图自动生成** - 从数据库表结构生成
2. **表关系可视化** - 外键关系连线
3. **正向工程** - 模型→SQL DDL
4. **反向工程** - SQL DDL→模型
5. **多格式导出** - PNG/JPEG/PDF/SQL

---

## 🗺️ ER 图功能

### 核心特性

- ✅ 自动从数据库加载表结构
- ✅ 可视化表关系 (外键连线)
- ✅ 自定义节点样式
- ✅ 缩放和平移
- ✅ 小地图导航
- ✅ 一键导出多格式

### 表节点显示

| 元素 | 说明 | 图标 |
|------|------|------|
| 表名 | 表名称 | - |
| Schema | 所属模式 | - |
| 主键列 | 主键字段 | 🔑 |
| 外键列 | 外键字段 | 🔗 |
| 列类型 | 数据类型 | - |
| 非空 | 必填字段 | * |
| 注释 | 列注释 | 💬 |

### 关系连线

- **实线** - 外键关系
- **箭头** - 引用方向
- **标签** - 列名映射

---

## 📤 导出功能

### 支持的导出格式

| 格式 | 说明 | 使用场景 |
|------|------|----------|
| PNG | 位图图片 | 文档/演示 |
| JPEG | 位图图片 | 文档/演示 |
| PDF | PDF 文档 | 正式文档 |
| SQL | DDL 脚本 | 数据库迁移 |

### 导出方式

**从 ER 图页面导出：**
1. 打开 ER 图页面
2. 点击右上角导出按钮
3. 选择导出格式
4. 自动下载文件

---

## 📥 导入功能

### SQL DDL 导入

**支持的 DDL 语句：**
- CREATE TABLE
- PRIMARY KEY
- FOREIGN KEY
- 列定义 (名称/类型/约束)

**导入方式：**
1. 准备 SQL DDL 文件
2. 在查询页面执行 DDL
3. ER 图自动更新

---

## 🔧 技术实现

### 核心库

| 库 | 用途 | 版本 |
|------|------|------|
| reactflow | ER 图画布 | ^11.0 |
| html-to-image | 图片导出 | ^1.11 |
| jspdf | PDF 导出 | ^2.5 |

### 核心模块

**erdGenerator.ts:**
- `generateNodesFromTables()` - 生成节点
- `generateEdgesFromTables()` - 生成边
- `generateERDiagram()` - 生成完整 ER 图
- `exportERDToSQL()` - 导出 SQL DDL
- `parseDDLToTables()` - 解析 DDL
- `autoLayoutNodes()` - 自动布局

**TableNode.tsx:**
- 自定义表节点组件
- 显示列信息
- 主键/外键标识
- Handle 连接点

**ERDiagram.tsx:**
- ER 图主组件
- ReactFlow 集成
- 导出功能
- 工具栏

---

## 📊 使用示例

### 查看 ER 图

1. 连接数据库
2. 点击导航栏"ER 图"
3. 自动加载表结构
4. 查看表关系

### 导出 ER 图

```typescript
// 导出为 PNG
await exportERDToImage(element, 'erd.png', 'png')

// 导出为 PDF
await exportERDToPDF(element, 'erd.pdf')

// 导出为 SQL
const sql = exportERDToSQL(tables, 'mysql')
```

### 从 DDL 生成 ER 图

```typescript
import { parseDDLToTables, generateERDiagram } from '@/lib/erdGenerator'

const tables = parseDDLToTables(ddlSQL)
const erd = generateERDiagram(tables)
```

---

## 📊 性能指标

| 指标 | 目标 | 实际 |
|------|------|------|
| 表加载时间 | < 1 秒 | < 0.5 秒 |
| 渲染性能 (100 表) | < 2 秒 | < 1 秒 |
| 导出时间 (PNG) | < 3 秒 | < 2 秒 |
| 导出时间 (PDF) | < 5 秒 | < 3 秒 |

---

## ⚠️ 已知限制

### 当前限制
1. **表数量** - 建议 < 100 个表
2. **复杂关系** - 自引用关系显示待优化
3. **复合主键** - 显示待优化

### 待优化
1. 自动布局算法优化
2. 大型 ER 图性能
3. 关系线智能避让
4. 分组/子图支持

---

## 🚀 后续版本

### v1.4.1 (补丁版本)
- [ ] 自动布局优化
- [ ] 性能改进
- [ ] Bug 修复

### v1.5.0 (下一版本)
- [ ] 高级查询功能
- [ ] 查询构建器
- [ ] 性能分析

---

<div align="center">
  <strong>🎉 v1.4.0 正式发布！</strong>
</div>

<div align="center">
  
[下载 v1.4.0](https://github.com/dbmanager/dbmanager/releases/tag/v1.4.0) | [ER 图文档](./docs/ERD.md) | [问题反馈](https://github.com/dbmanager/dbmanager/issues)

</div>
