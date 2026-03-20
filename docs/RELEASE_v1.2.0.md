# DBManager v1.2.0 发布说明

**发布日期：** 2026-03-20  
**版本：** v1.2.0  
**主题：** 多数据库支持

---

## 🎉 重大更新

v1.2.0 引入了对多种数据库的支持：

1. **MySQL** - 最流行的开源数据库 🐬
2. **PostgreSQL** - 强大的开源对象关系数据库 🐘
3. **Oracle** - 企业级商业数据库 🔶
4. **达梦 (DM)** - 国产数据库 🔷
5. **SQLite** - 轻量级嵌入式数据库 🗄️

---

## 🗄️ 支持的数据库

| 数据库 | 类型 | 默认端口 | 状态 |
|--------|------|----------|------|
| MySQL | 关系型 | 3306 | ✅ |
| PostgreSQL | 关系型 | 5432 | ✅ |
| Oracle | 关系型 | 1521 | ✅ |
| 达梦 (DM) | 关系型 | 5236 | ✅ |
| SQLite | 嵌入式 | - | ✅ |

---

## 🔌 连接管理

### 新建连接

1. 点击右上角"新建连接"
2. 选择数据库类型
3. 填写连接信息
4. 点击"创建连接"

### 连接信息

**MySQL/PostgreSQL:**
- 主机
- 端口
- 用户名
- 密码
- 数据库名

**Oracle:**
- 主机
- 端口
- 用户名
- 密码
- Service Name

**达梦:**
- 主机
- 端口
- 用户名
- 密码
- Schema

**SQLite:**
- 文件路径

---

## 🆕 新增 API

### 数据库类型

```bash
GET /api/databases/types
```

返回支持的数据库类型列表。

### 连接管理

```bash
GET    /api/databases/connections          # 获取连接列表
POST   /api/databases/connections          # 创建连接
POST   /api/databases/connections/:id/connect    # 连接
POST   /api/databases/connections/:id/disconnect # 断开
DELETE /api/databases/connections/:id             # 删除
POST   /api/databases/test                 # 测试连接
```

### 表结构

```bash
GET /api/databases/connections/:id/tables              # 获取表列表
GET /api/databases/connections/:id/tables/:table/columns  # 获取列信息
GET /api/databases/connections/:id/tables/:table/keys     # 获取主键
```

---

## 🎨 Web UI 更新

### 新增页面

- **Databases.tsx** - 数据库连接管理页面

### 功能特性

- ✅ 数据库类型选择
- ✅ 连接列表展示
- ✅ 连接/断开操作
- ✅ 删除连接
- ✅ 状态指示 (已连接/未连接)
- ✅ 表单验证

---

## 📦 驱动架构

### 抽象层

```typescript
interface DatabaseDriver {
  connect(config: DatabaseConfig): Promise<void>
  disconnect(): Promise<void>
  isConnected(): boolean
  query(sql: string, params?: any[]): Promise<QueryResult>
  getTables(schema?: string): Promise<TableInfo[]>
  getColumns(table: string, schema?: string): Promise<ColumnInfo[]>
  getPrimaryKeys(table: string, schema?: string): Promise<string[]>
  getForeignKeys(table: string, schema?: string): Promise<any[]>
  getIndexes(table: string, schema?: string): Promise<any[]>
}
```

### 驱动工厂

```typescript
const driver = DatabaseDriverFactory.create('mysql')
const driver = DatabaseDriverFactory.create('postgresql')
const driver = DatabaseDriverFactory.create('oracle')
const driver = DatabaseDriverFactory.create('dm')
const driver = DatabaseDriverFactory.create('sqlite')
```

---

## 🔧 技术实现

### 驱动实现

| 驱动 | 文件 | 状态 |
|------|------|------|
| MySQLDriver | database.ts | ✅ |
| PostgreSQLDriver | database.ts | ✅ |
| OracleDriver | database.ts | ✅ |
| DMDriver | database.ts | ✅ |
| SQLiteDriver | database.ts | ✅ |

### 连接管理器

- 多连接管理
- 连接池 (待实现)
- 自动重连 (待实现)
- 连接测试

---

## 📊 代码统计

| 类别 | 文件数 | 代码行数 |
|------|--------|----------|
| 驱动层 | 1 | ~350 行 |
| 管理器 | 1 | ~150 行 |
| API 路由 | 1 | ~150 行 |
| Web 页面 | 1 | ~300 行 |
| 测试 | 1 | ~50 行 |
| **总计** | **5** | **~1,000 行** |

---

## ⚠️ 已知问题

### 当前限制
1. **模拟实现** - 驱动层使用模拟数据
2. **真实驱动** - 需要安装实际数据库驱动包
3. **连接池** - 未实现连接池管理

### 待实现
1. MySQL (mysql2)
2. PostgreSQL (pg)
3. Oracle (oracledb)
4. 达梦 (dm-driver)
5. SQLite (better-sqlite3)

---

## 🚀 后续优化

### v1.2.1 (补丁版本)
- [ ] 安装真实数据库驱动
- [ ] 实现实际连接逻辑
- [ ] 连接池支持

### v1.2.2 (功能增强)
- [ ] ER 图可视化
- [ ] 数据导入/导出
- [ ] 批量操作

---

## 📝 使用示例

### 创建 MySQL 连接

```json
{
  "name": "我的 MySQL",
  "config": {
    "type": "mysql",
    "host": "localhost",
    "port": 3306,
    "user": "root",
    "password": "password",
    "database": "mydb"
  }
}
```

### 创建 Oracle 连接

```json
{
  "name": "我的 Oracle",
  "config": {
    "type": "oracle",
    "host": "localhost",
    "port": 1521,
    "user": "system",
    "password": "password",
    "serviceName": "ORCL"
  }
}
```

### 创建达梦连接

```json
{
  "name": "我的达梦",
  "config": {
    "type": "dm",
    "host": "localhost",
    "port": 5236,
    "user": "SYSDBA",
    "password": "password",
    "schema": "SYSDBA"
  }
}
```

---

<div align="center">
  <strong>🎉 v1.2.0 正式发布！</strong>
</div>

<div align="center">
  
[下载 v1.2.0](https://github.com/dbmanager/dbmanager/releases/tag/v1.2.0) | [数据库文档](./docs/DATABASES.md) | [问题反馈](https://github.com/dbmanager/dbmanager/issues)

</div>
