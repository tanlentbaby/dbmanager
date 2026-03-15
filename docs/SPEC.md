# DBManager 详细需求规格说明书

## 目录

1. [配置管理模块](#1-配置管理模块)
2. [SQL 执行模块](#2-sql 执行模块)
3. [输出格式化模块](#3-输出格式化模块)
4. [错误处理机制](#4-错误处理机制)
5. [扩展性设计](#5-扩展性设计)

---

## 1. 配置管理模块

### 1.1 `/config add` - 添加数据库配置

**交互模式流程：**

```
sql> /config add

? 实例名称 (必填，唯一标识): local_mysql
? 数据库类型 (使用方向键选择):
  > MySQL
    PostgreSQL
    SQLite
    Oracle
    SQL Server

[选择 MySQL 后]
? 主机地址 (Host): localhost
? 端口 (Port): [3306]  # 方括号内为默认值，直接回车使用默认
? 用户名：root
? 密码：******        # 隐藏输入
? 确认密码：******
? 默认数据库：test
? 字符集：[utf8mb4]
? 连接超时 (秒): [10]

高级选项？(y/N): n

[可选] 测试此连接？(Y/n): y
正在测试连接...
✓ 连接成功！MySQL 8.0.32

✓ 配置已保存：local_mysql
```

**命令行快速模式：**

```bash
dbmanager config add --name local_mysql --type mysql \
  --host localhost --port 3306 \
  --user root --password secret \
  --database test
```

**参数验证：**

| 参数 | 验证规则 | 错误提示 |
|------|----------|----------|
| 实例名 | 1-32 字符，字母数字下划线，不能与现有重复 | "实例名已存在，请使用其他名称" |
| 类型 | 必须是支持的类型之一 | "不支持的数据库类型" |
| 主机 | 非空 | "主机地址不能为空" |
| 端口 | 1-65535 | "端口号必须在 1-65535 之间" |
| 密码 | 两次输入一致 | "两次输入的密码不一致" |

---

### 1.2 `/config list` - 列出所有配置

**输出格式：**

```
sql> /config list

数据库配置列表 (共 3 个):

  实例名称           类型          主机              端口   数据库      状态
  ─────────────────────────────────────────────────────────────────────────
  local_mysql     MySQL         localhost         3306   test        ✓ 可连接
  prod_pg      → PostgreSQL    prod.db.com       5432   production  ✗ 未测试
  backup_mysql    MySQL         backup.local      3306   backup      ⏳ 超时

图例：✓ 可连接  ✗ 连接失败  ⏳ 超时/未知  → 当前选中
```

**选项：**

```
sql> /config list --verbose

显示额外字段：字符集、SSL 状态、创建时间、最后连接时间
```

---

### 1.3 `/config edit <name>` - 编辑配置

**交互流程：**

```
sql> /config edit local_mysql

编辑配置：local_mysql
(直接回车保持原值，输入新值修改)

? 主机地址 [localhost]:
? 端口 [3306]:
? 用户名 [root]: admin
? 密码：******
? 确认密码：******
? 默认数据库 [test]:

✓ 配置已更新：local_mysql
```

**保护规则：**
- 不能编辑当前正在连接的配置（需要先断开）
- 修改关键参数（主机/端口）后提示重新测试连接

---

### 1.4 `/config remove <name>` - 删除配置

**交互流程：**

```
sql> /config remove backup_mysql

⚠️  警告：即将删除数据库配置 "backup_mysql"

  主机：backup.local
  类型：MySQL

此操作不可恢复，但不会影响实际数据库。

确认删除？(输入 "yes" 确认): yes
✓ 配置已删除：backup_mysql
```

**保护规则：**
- 当前连接的配置不能删除
- 需要二次确认

---

### 1.5 `/config test <name>` - 测试连接

**输出：**

```
sql> /config test prod_pg

测试连接：prod_pg
  类型：PostgreSQL
  主机：prod.db.com:5432
  数据库：production

正在连接...

✓ 连接成功！

服务器信息:
  版本：PostgreSQL 15.2
  运行时间：45 天 3 小时
  字符集：UTF8
  延迟：23ms
```

**失败情况：**

```
✗ 连接失败

错误信息：FATAL:  password authentication failed for user "admin"
错误代码：28P01

可能的原因:
  1. 密码错误或已过期
  2. 用户被锁定
  3. pg_hba.conf 限制

建议：使用 /config edit 更新密码后重试
```

---

### 1.6 `/config export/import` - 配置迁移

**导出：**

```
sql> /config export --output backup.json --instances local_mysql,prod_pg

✓ 已导出 2 个配置到：backup.json
⚠️  密码已加密，请妥善保管此文件
```

**导入：**

```
sql> /config import --file backup.json

发现以下配置:
  - local_mysql (已存在，跳过)
  - prod_pg (已存在，跳过)
  - new_instance (新增)

导入完成：新增 1 个配置，跳过 2 个
```

---

## 2. SQL 执行模块

### 2.1 多行 SQL 处理

**模式 1: 分号终止 (默认)**

```
sql> SELECT u.id, u.name, COUNT(o.id) as order_count
   -> FROM users u
   -> LEFT JOIN orders o ON u.id = o.user_id
   -> WHERE u.created_at > '2024-01-01'
   -> GROUP BY u.id, u.name
   -> ORDER BY order_count DESC
   -> LIMIT 10;

[执行并显示结果]
```

**模式 2: 无分号模式**

```
sql> /set no_semicolon on
已启用无分号模式 (每次输入直接执行)

sql> SELECT * FROM users LIMIT 5
[直接执行，无需分号]

sql> /set no_semicolon off
已禁用无分号模式
```

**模式 3: 批量执行**

```
sql> source batch.sql
-- 文件内容:
-- SELECT * FROM users;
-- SELECT * FROM posts;
-- SELECT * FROM comments;

执行 3 条语句...
[依次显示每个结果]
```

---

### 2.2 结果处理规则

**SELECT 查询：**

| 行数 | 处理方式 |
|------|----------|
| 0 | 显示 "0 rows" |
| 1-100 | 完整表格显示 |
| 101-1000 | 显示前 100 行 + "显示 100 行，共 XXX 行" |
| 1000+ | 分页显示，每页 100 行 |

**大数据集处理：**

```
sql> SELECT * FROM large_table;

显示前 100 行 (共 15234 行)
[表格数据]

---
结果过大，使用以下方式处理:
  LIMIT 子句限制行数
  /export csv --file output.csv 导出全部
  按空格查看下一页 (配置启用)
```

**影响行数显示：**

```
sql> UPDATE users SET status = 'active' WHERE last_login > '2024-01-01';

✓ 执行成功
影响行数：1,234 行
执行时间：45ms
```

---

### 2.3 特殊命令 (类 MySQL/SQLite)

```
\c <database>     切换数据库 (同 /use)
\q                退出 (同 /quit)
\. <file>         执行 SQL 文件 (同 /run)
\l                列出数据库 (同 /list)
\d <table>        描述表结构 (同 /desc)
\h                显示帮助

\o <file>         输出重定向到文件
\w                取消输出重定向

\x                切换垂直/表格输出格式
\s                显示当前连接状态
```

---

## 3. 输出格式化模块

### 3.1 表格格式 (默认)

```
sql> SELECT id, name, email FROM users LIMIT 3;

+----+----------+---------------------+
| id | name     | email               |
+----+----------+---------------------+
| 1  | Alice    | alice@example.com   |
| 2  | Bob      | bob@example.com     |
| 3  | Charlie  | charlie@example.com |
+----+----------+---------------------+
3 rows in 12ms
```

**列宽处理：**
- 默认最大列宽：终端宽度的 20%
- 超出截断：显示 `...`
- 长文本：显示前 50 字符 + `...`

---

### 3.2 JSON 格式

```
sql> /format json
已设置输出格式：json

sql> SELECT id, name FROM users LIMIT 2;

[
  {
    "id": 1,
    "name": "Alice"
  },
  {
    "id": 2,
    "name": "Bob"
  }
]

2 rows in 8ms
```

---

### 3.3 垂直格式 (适合宽表)

```
sql> \x
垂直输出模式：ON

sql> SELECT * FROM users WHERE id = 1;

*************************** 1. row ***************************
         id: 1
     username: admin
      email: admin@example.com
 created_at: 2024-01-01 00:00:00
 updated_at: 2024-01-15 12:30:45
 last_login: 2024-01-15 12:30:45
     status: active
       role: super_admin
1 row in 5ms
```

---

### 3.4 CSV 格式

```
sql> /format csv
已设置输出格式：csv

sql> SELECT id, name, email FROM users LIMIT 3;

id,name,email
1,Alice,alice@example.com
2,Bob,bob@example.com
3,Charlie,charlie@example.com

3 rows in 6ms
```

**导出到文件：**

```
sql> /export csv --file users.csv SELECT * FROM users;
✓ 已导出 1,234 行到 users.csv
```

---

## 4. 错误处理机制

### 4.1 错误分类和响应

| 错误类型 | 错误代码 | 用户提示 | 建议操作 |
|----------|----------|----------|----------|
| 连接超时 | E001 | "连接超时，请检查网络" | 重试或调整超时设置 |
| 认证失败 | E002 | "认证失败：用户名或密码错误" | /config edit 更新密码 |
| 主机不可达 | E003 | "无法连接到主机" | 检查主机地址和网络 |
| 数据库不存在 | E004 | "数据库不存在：xxx" | 确认数据库名或使用 /list |
| 表不存在 | E005 | "表不存在：xxx" | 使用 /ls 查看可用表 |
| 权限不足 | E006 | "权限不足：需要 xxx 权限" | 联系 DBA 授权 |
| SQL 语法错误 | E007 | 显示错误位置和详情 | 修正 SQL 语法 |
| 约束冲突 | E008 | "违反约束：xxx" | 检查数据是否符合约束 |
| 死锁 | E009 | "检测到死锁，事务已回滚" | 重试操作 |
| 查询超时 | E010 | "查询超时 (xx 秒)" | 优化 SQL 或增加超时 |

---

### 4.2 错误显示格式

```
sql> SELECT * FROM non_existent_table;

✗ SQL 执行失败

错误：表 'test.non_existent_table' 不存在
代码：1146 (ER_TABLE_NOT_EXIST)
SQL: SELECT * FROM non_existent_table;
             ^^^^^^^^^^^^^^^^^^
             错误位置提示

可能的原因:
  1. 表名拼写错误
  2. 表已被删除
  3. 当前用户无权限查看

建议:
  /ls 查看当前数据库的所有表
  SHOW TABLES;

帮助：https://docs.example.com/errors/E005
```

---

### 4.3 连接断开处理

```
sql> SELECT * FROM large_table WHERE ...;

⚠️  连接已断开

服务器已关闭连接，可能原因:
  1. 连接超时 (空闲时间过长)
  2. 服务器重启
  3. 网络问题

当前连接：prod_pg (已断开)

操作选项:
  /reconnect      重新连接
  /connect other  切换到其他实例
  /quit           退出
```

---

## 5. 扩展性设计

### 5.1 数据库驱动接口

```python
# 伪代码示意
class DatabaseDriver(Protocol):
    """所有数据库驱动必须实现的接口"""

    def connect(self, config: dict) -> Connection:
        """建立连接"""
        ...

    def execute(self, sql: str, params: tuple = None) -> Result:
        """执行 SQL"""
        ...

    def get_tables(self) -> list[str]:
        """获取表列表"""
        ...

    def describe_table(self, table: str) -> TableSchema:
        """获取表结构"""
        ...

    def close(self):
        """关闭连接"""
        ...
```

---

### 5.2 命令注册机制

```python
# 伪代码示意 - 第三方扩展示例

@register_command("explain")
def explain_command(sql: str):
    """自定义命令：分析 SQL 执行计划"""
    result = db.execute(f"EXPLAIN {sql}")
    show_query_plan(result)

# 使用时:
# sql> /explain SELECT * FROM users WHERE id = 1
```

---

### 5.3 钩子系统

```python
# 配置文件中的钩子
{
  "hooks": {
    "on_connect": "echo '连接到 {instance}'",
    "on_disconnect": "log '断开连接'",
    "before_query": "validate_sql {sql}",
    "after_query": "log_query {sql} {duration}"
  }
}
```

---

### 5.4 主题系统

```json
// ~/.dbmanager/themes/dark.json
{
  "name": "Dark",
  "colors": {
    "keyword": "#569cd6",
    "string": "#ce9178",
    "number": "#b5cea8",
    "error": "#f48771",
    "success": "#89d185",
    "table_border": "#666666"
  }
}
```

---

## 附录 A: 配置文件完整示例

```json
{
  "version": "1.0",
  "default_instance": "local_mysql",
  "instances": {
    "local_mysql": {
      "type": "mysql",
      "host": "localhost",
      "port": 3306,
      "username": "root",
      "password": "enc:AES256:xxx",
      "database": "development",
      "charset": "utf8mb4",
      "connect_timeout": 10,
      "ssl": false
    }
  },
  "settings": {
    "theme": "dark",
    "output_format": "table",
    "max_display_rows": 100,
    "show_execution_time": true,
    "syntax_highlight": true,
    "history_size": 1000,
    "no_semicolon": false,
    "confirm_dangerous": true,
    "log_level": "info"
  },
  "hooks": {
    "on_connect": null,
    "before_query": null
  }
}
```

---

## 附录 B: 快捷键参考

| 快捷键 | 功能 |
|--------|------|
| `Ctrl+C` | 取消当前输入/中断查询 |
| `Ctrl+D` | 退出程序 |
| `Ctrl+L` | 清屏 |
| `↑/↓` | 历史命令导航 |
| `Tab` | 自动补全 |
| `Ctrl+R` | 搜索历史 |
| `Ctrl+A/Home` | 光标到行首 |
| `Ctrl+E/End` | 光标到行末 |
| `Ctrl+K` | 删除到行尾 |
| `Ctrl+U` | 删除到行首 |
