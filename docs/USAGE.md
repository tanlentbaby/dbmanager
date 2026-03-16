# DBManager 使用指南

**版本：** v0.5.0  
**最后更新：** 2026-03-16

---

## 📖 目录

- [快速开始](#快速开始)
- [配置管理](#配置管理)
- [连接数据库](#连接数据库)
- [SQL 执行](#sql-执行)
- [智能查询助手](#智能查询助手)
- [书签管理](#书签管理)
- [输出格式](#输出格式)
- [快捷键](#快捷键)
- [常见问题](#常见问题)

---

## 快速开始

### 1. 安装和启动

```bash
# 安装依赖
npm install

# 构建
npm run build

# 启动
npm start
```

### 2. 添加数据库配置

```bash
# SQLite
/config add mydb sqlite /path/to/db.db - - -

# MySQL
/config add production mysql localhost 3306 root password mydb

# PostgreSQL
/config add dev postgres localhost 5432 user pass dbname
```

### 3. 连接数据库

```bash
/connect mydb
```

### 4. 执行 SQL

```sql
sql> SELECT * FROM users;
sql> INSERT INTO users (name, email) VALUES ('Alice', 'alice@example.com');
```

---

## 配置管理

### 添加配置

```bash
# 语法
/config add <名称> <类型> <主机> <端口> <用户> <密码> [数据库]

# SQLite 示例
/config add mydb sqlite /path/to/db.db - - -

# MySQL 示例
/config add production mysql localhost 3306 root password mydb

# PostgreSQL 示例
/config add dev postgres localhost 5432 user pass dbname
```

### 查看配置

```bash
# 列出所有配置
/config list

# 测试连接
/config test <实例名>

# 删除配置
/config remove <实例名>
```

### 配置存储

- **位置：** `~/.dbmanager/config.json`
- **加密：** 使用 keytar 加密敏感信息
- **备份：** 手动备份配置文件即可

---

## 连接数据库

### 基本操作

```bash
# 连接
/connect <实例名>

# 断开
/disconnect

# 查看状态
# 状态栏会显示当前连接的数据库
```

### 查看表结构

```bash
# 列出所有表
/list

# 查看表结构
/desc <表名>

# 示例
/desc users
```

### 切换数据库

```bash
# 先断开
/disconnect

# 再连接新数据库
/connect <新实例名>
```

---

## SQL 执行

### 基本语法

```sql
# 直接输入 SQL
sql> SELECT * FROM users;
sql> INSERT INTO users (name, email) VALUES ('Alice', 'alice@example.com');
sql> UPDATE users SET status = 1 WHERE id = 1;
sql> DELETE FROM users WHERE id = 1;
```

### 事务管理

```bash
# 开始事务
/begin

# 提交事务
/commit

# 回滚事务
/rollback
```

### 执行 SQL 文件

```bash
# 执行 SQL 文件
/run <文件路径>

# 批量执行（事务中）
/batch file <文件路径>
/batch run <SQL 语句>
```

### 查询计划

```bash
# 查看查询计划
/explain <SQL>

# 示例
/explain SELECT * FROM users WHERE email = 'test@example.com'
```

---

## 智能查询助手

### 🔍 错误诊断 - `/diagnose`

**自动诊断：** SQL 执行出错时自动显示诊断报告。

**手动诊断：**
```bash
# 诊断错误消息
/diagnose "table 'users' doesn't exist"

# 诊断错误代码
/diagnose 1064
/diagnose 1146
/diagnose 42P01
```

**输出内容：**
- 错误详情（代码、消息、SQL）
- 诊断建议（按置信度排序）
- 解决方案

---

### ⚡ 查询优化建议 - `/optimize`

**使用示例：**
```bash
/optimize SELECT * FROM users
/opt SELECT * FROM orders WHERE user_id IN (SELECT id FROM users)
```

**检测项：**
- SELECT * 使用
- UPDATE/DELETE 无 WHERE 条件
- LIKE 前缀通配符
- 子查询优化
- JOIN 条件
- OR 条件优化
- 函数包裹列
- NOT IN 优化

**输出内容：**
- 查询信息（类型、表、列）
- 优化建议（按严重程度排序）
- 置信度评分

---

### 🗣️ 自然语言生成 SQL - `/nl2sql`

**使用示例：**
```bash
# 简单查询
/nl2sql 查询所有用户

# 带条件
/nl 查找年龄大于 25 的用户

# 统计
/nl 统计订单数量

# 排序
/nl 显示前 10 个订单，按创建时间降序排序

# DELETE
/nl 删除 id 等于 1 的用户
```

**支持的操作：**
- 查询：查询、查找、搜索、显示、列出、查看
- 统计：统计、计数、多少个
- 条件：等于、大于、小于、包含
- 排序：升序、降序、按...排序
- 限制：前 N 条、限制 N 条

**输出内容：**
- 生成的 SQL
- 置信度评分
- 说明和警告

---

### 🔖 书签管理 - `/bookmark`

**添加书签：**
```bash
/bookmark add "用户列表" "SELECT * FROM users" mysql users
/bookmark add "订单统计" "SELECT user_id, COUNT(*) FROM orders GROUP BY user_id" mysql stats
```

**列出书签：**
```bash
/bookmark list
/bookmark list mysql          # 按标签过滤
```

**搜索书签：**
```bash
/bookmark search user
/bookmark search SELECT
```

**运行书签：**
```bash
/bookmark run "用户列表"
/bm run "订单统计"            # 快捷命令
```

**其他操作：**
```bash
/bookmark tags                # 查看所有标签
/bookmark export              # 导出书签
/bookmark import <文件>       # 导入书签
/bookmark stats               # 统计信息
```

---

## 输出格式

### 设置格式

```bash
/format table     # 表格格式（默认）
/format json      # JSON 格式
/format csv       # CSV 格式
/format markdown  # Markdown 格式
```

### 导出结果

```bash
/export csv output.csv
/export json output.json
/export markdown output.md
```

---

## 快捷键

| 快捷键 | 功能 |
|--------|------|
| `Ctrl+P` | 打开命令面板 |
| `Tab` | 自动补全 |
| `↑` / `↓` | 历史命令导航 |
| `Ctrl+L` | 清屏 |
| `Ctrl+D` | 退出 |
| `ESC` | 取消补全/关闭面板 |
| `Ctrl+C` | 取消当前操作 |

---

## 常见问题

### Q: 如何备份配置？

A: 备份 `~/.dbmanager/config.json` 文件即可。

### Q: 忘记密码怎么办？

A: 重新使用 `/config add` 添加配置即可。

### Q: 如何查看帮助？

A: 输入 `/help` 查看所有命令，`/help <关键词>` 搜索特定命令。

### Q: SQL 执行出错怎么办？

A: 系统会自动显示诊断报告，根据建议使用 `/diagnose` 查看详情。

### Q: 如何优化慢查询？

A: 使用 `/optimize <SQL>` 分析查询，根据建议使用索引或改写查询。

### Q: 书签存在哪里？

A: `~/.dbmanager/bookmarks.json`

### Q: 支持哪些数据库？

A: SQLite、MySQL、PostgreSQL。

---

## 最佳实践

### 1. 使用书签保存常用查询

```bash
/bookmark add "活跃用户" "SELECT * FROM users WHERE status = 1 AND last_login > NOW() - INTERVAL 30 DAY"
```

### 2. 执行前先用 EXPLAIN 分析

```bash
/explain SELECT * FROM orders WHERE user_id = 1
```

### 3. 使用事务保证数据安全

```bash
/begin
# 执行多个 SQL
/commit
```

### 4. 定期导出书签备份

```bash
/bookmark export > bookmarks_backup.json
```

### 5. 使用标签分类管理书签

```bash
/bookmark add "用户查询" "SELECT * FROM users" mysql users
/bookmark add "订单查询" "SELECT * FROM orders" mysql orders
/bookmark list mysql          # 按数据库分类
/bookmark list users          # 按主题分类
```

---

## 下一步

- **[命令参考](./SPEC.md)** - 完整的命令参考
- **[架构设计](./ARCHITECTURE.md)** - 系统架构说明
- **[发布说明](./RELEASE_v0.5.0.md)** - v0.5.0 新功能介绍

---

**最后更新：** 2026-03-16
