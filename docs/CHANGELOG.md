# DBManager 开发日志

## 2026-03-13 - 查询计划查看功能完成

### 新增功能

#### /explain - 查询计划分析
- `/explain <SQL 查询>` - 分析 SQL 查询的执行计划
- 支持 MySQL、PostgreSQL、SQLite 三种数据库
- 自动识别数据库类型并使用相应的 EXPLAIN 语法

#### 数据库特定实现
**MySQL:**
- 使用 `EXPLAIN` 语句
- 返回列：id, select_type, table, type, possible_keys, key, key_len, ref, rows, Extra
- 支持 `EXPLAIN ANALYZE` 格式

**PostgreSQL:**
- 使用 `EXPLAIN ANALYZE` 语句
- 返回详细的执行计划文本
- 包含实际执行时间和行数统计

**SQLite:**
- 使用 `EXPLAIN QUERY PLAN` 语句
- 返回列：id, parent, notused, detail
- 智能提示：检测全表扫描（SCAN）和索引使用（SEARCH/INDEX）

#### 输出示例 (SQLite)
```
>>> /explain SELECT * FROM users WHERE id = 1

查询计划:
--------------------------------------------------------------------------------
id     parent   notused    detail
--------------------------------------------------------------------------------
2      0        0          SEARCH users USING INTEGER PRIMARY KEY (rowid=?)
--------------------------------------------------------------------------------
```

#### 输出示例 (带索引提示)
```
>>> /explain SELECT * FROM users WHERE name = 'Alice'

查询计划:
--------------------------------------------------------------------------------
id     parent   notused    detail
--------------------------------------------------------------------------------
2      0        0          SEARCH users USING COVERING INDEX idx_name (name=?)
--------------------------------------------------------------------------------

提示:
  - 使用索引查找：SEARCH users USING COVERING INDEX idx_name (name=?)
```

**文件修改:**
- `src/database/connection.py` - 添加 ExplainResult 数据类
- `src/database/connection.py` - 添加 get_explain_plan 及各数据库实现
- `src/cli/commands.py` - 添加 handle_explain 命令
- `src/cli/commands.py` - 添加 _show_explain_mysql/postgresql/sqlite 显示方法
- `src/cli/commands.py` - 更新 /help 帮助文本

**测试覆盖:**
- `tests/test_explain.py` - 7 个查询计划测试
  - ✓ SQLite 基础查询计划
  - ✓ SQLite 索引使用检测
  - ✓ SQLite 全表扫描检测
  - ✓ 未连接时的错误
  - ✓ 无效 SQL 的错误处理
  - ✓ 命令处理器的 /explain 命令
  - ✓ /explain 帮助信息

**注意事项:**
- PostgreSQL 的 EXPLAIN ANALYZE 会实际执行查询（只读查询安全）
- MySQL 8.0+ 支持 EXPLAIN ANALYZE，旧版本只支持 EXPLAIN
- SQLite 的 EXPLAIN QUERY PLAN 不会实际执行查询

---

## 2026-03-12 - 批量执行功能完成

### 新增功能

#### 批量执行命令
- `/batch file <SQL 文件>` - 批量执行 SQL 文件（在事务中）
- `/batch run <SQL 语句>` - 批量执行 SQL 语句（在事务中）

#### 核心特性
- **原子性**: 所有语句在一个事务中执行
- **全部成功或全部失败**: 任一语句失败则自动回滚全部操作
- **静默模式**: 写操作静默执行，只显示 SELECT 查询结果
- **错误报告**: 失败时显示详细错误信息（前 5 个错误）

#### 使用场景
- 数据库迁移脚本
- 批量数据导入
- 多步骤数据更新

**文件修改:**
- `src/cli/commands.py` - 添加 handle_batch、_batch_file、_batch_run 方法
- `src/cli/commands.py` - 注册 /batch 命令
- `src/cli/commands.py` - 更新 /help 帮助文本

**输出示例 (成功):**
```
>>> /batch file migrate.sql
批量执行文件：migrate.sql
----------------------------------------
[事务已开启]
----------------------------------------
[事务已提交]
执行成功：共 4 条语句，成功 4 条，跳过 0 条
```

**输出示例 (失败):**
```
>>> /batch file invalid.sql
批量执行文件：invalid.sql
----------------------------------------
[事务已开启]
[3/4] 错误：UNIQUE constraint failed: users.id
----------------------------------------
[事务已回滚]
执行失败：共 4 条语句，成功 2 条，失败 1 条，跳过 0 条

错误详情:
  [3] INSERT INTO users VALUES (1, 'Bob')...
    -> UNIQUE constraint failed: users.id
```

**注意事项:**
- SQLite 的 DDL 语句（CREATE/DROP/ALTER）会隐式提交，无法回滚
- MySQL/PostgreSQL 的 DDL 可以在事务中回滚
- 已有活动事务时不能执行批量操作

**测试覆盖:**
- `tests/test_batch.py` - 7 个批量执行测试
  - ✓ 批量执行 SQL 文件（成功）
  - ✓ 批量执行 SQL 文件（失败回滚）
  - ✓ 批量执行 SQL 语句（成功）
  - ✓ 批量执行 SQL 语句（失败回滚）
  - ✓ 未连接时批量执行
  - ✓ 在已有事务时批量执行
  - ✓ 批量执行帮助

---

## 2026-03-12 - 事务管理功能完成

### 新增功能

#### 事务控制命令
- `/begin` - 开始事务
- `/commit` - 提交事务
- `/rollback` - 回滚事务

#### 事务状态管理
- 添加 `in_transaction` 状态标记
- 添加 `transaction_queries` 记录事务中的查询
- 修改 `execute()` 方法，事务期间禁用自动提交
- 异常时自动回滚（非事务模式下）

#### 数据库兼容性
- **SQLite**: 自动开始事务，BEGIN 语句跳过
- **MySQL**: 执行 BEGIN 语句显式开启事务
- **PostgreSQL**: 执行 BEGIN 语句显式开启事务

**文件修改:**
- `src/database/connection.py` - 添加事务状态管理方法
- `src/cli/commands.py` - 实现 /begin, /commit, /rollback 命令
- `src/cli/commands.py` - 更新 /help 帮助文本

**使用示例:**
```sql
>>> /begin
✓ 事务已开始
提示：使用 /commit 提交事务，或使用 /rollback 回滚事务

>>> INSERT INTO users VALUES (1, 'Alice');
>>> UPDATE users SET name='Bob' WHERE id=1;

>>> /rollback
✓ 事务已回滚
```

**实现细节:**
- 事务模式下 `execute()` 不自动 commit
- COMMIT/ROLLBACK 时检查 `in_transaction` 状态
- SQLite 自动管理事务，BEGIN 仅用于 MySQL/PostgreSQL

---

## 2026-03-12 - SQL 语法高亮功能完成

### 新增功能

#### SQL 语法高亮器
- 创建 `src/cli/highlighter.py` 模块
- 实现 `SimpleSQLLexer` 词法分析器
- 支持 prompt_toolkit 集成（通过 `Window` 的 `lexer` 参数）

#### 关键字分类高亮
- **蓝色**：子句关键字（SELECT, FROM, WHERE, JOIN 等）
- **紫色**：条件关键字（AND, OR, NOT, IN, BETWEEN 等）
- **青色**：函数和聚合（COUNT, SUM, AVG, MAX, MIN 等）
- **白色**：其他关键字（AS, CASE, WHEN, THEN 等）

#### 其他 token 高亮
- **黄色**：字符串（单引号和双引号）
- **绿色**：数字（整数和小数）
- **灰色**：注释（-- 开头的单行注释）
- **默认色**：标识符和普通文本

#### 特性
- 不区分大小写匹配关键字
- 支持多行 SQL 语句
- 高性能：使用正则表达式分割
- 优先级处理：字符串 > 关键字 > 数字

**文件修改:**
- `src/cli/highlighter.py` - 新建语法高亮器模块
- `src/cli/app.py` - 在 Window 中集成 SimpleSQLLexer
- `src/cli/app.py` - 添加高亮配色到 DARK_STYLE

**输出效果:**
```
sql> SELECT u.id, u.name FROM users WHERE age > 18
     ^蓝色^           ^蓝色^  ^蓝色^   ^紫色^    ^绿色^
```

### 测试覆盖

**新增测试:**
- `tests/test_highlighter.py` - 语法高亮器测试

**测试结果:**
```
测试 1: 简单 SQL 词法分析器  ✓
测试 2: 关键字分类          ✓
测试 3: 注释高亮            ✓
测试 4: 应用集成            ✓
测试 5: 复杂 SQL 语句       ✓
```

---

## 2026-03-12 - 表名/列名补全功能完善

### 新增功能

#### 元数据缓存
- 添加 `MetadataCache` 类缓存表名和列名
- 缓存有效期 5 分钟（TTL）
- 连接时自动刷新缓存
- 减少数据库查询次数，提高补全响应速度

#### 模糊匹配
- 实现 `_fuzzy_match()` 方法
- 支持三种匹配类型：
  - 完全匹配（100 分）
  - 前缀匹配（50 分）
  - 包含匹配（20 分）
  - 模糊字符匹配（10 分）
- 按匹配得分排序，优先显示最相关的建议

#### 表名补全增强
- 支持多表解析（FROM 逗号分隔、JOIN、UPDATE、INSERT INTO）
- 空词时显示所有表
- 有前缀时过滤显示
- 支持 DESCRIBE/DESC 命令的表名补全

#### 列名补全增强
- 支持多表列名收集
- 空词时显示所有列
- 有前缀时过滤显示
- 修复上下文检测逻辑错误

**文件修改:**
- `src/cli/completer.py` - 添加 MetadataCache 类，完善补全逻辑
- `src/cli/app.py` - 添加 completer 属性
- `src/cli/commands.py` - 连接时刷新缓存

### 测试覆盖

**新增测试:**
- `tests/test_completer_advanced.py` - 高级补全功能测试

**测试结果:**
```
测试 1: 元数据缓存       ✓
测试 2: 模糊匹配         ✓
测试 3: 表名解析         ✓
测试 4: 表名补全         ✓
测试 5: 列名补全         ✓
测试 6: 关键字补全       ✓
测试 7: 命令补全         ✓
```

---

## 2026-03-12 - /history 命令功能完成

### 新增功能

#### /history - 查看命令历史
- 显示最近执行的命令和 SQL 语句
- 支持限制显示数量：`/history [数量]`
- 默认显示最近 20 条
- 自动记录所有执行的命令

**用法:**
```
/history          - 显示最近 20 条命令
/history 10       - 显示最近 10 条命令
```

**输出示例:**
```
>>> /history

最近 5 条命令:
----------------------------------------
  1.  SELECT * FROM users
  2.  INSERT INTO users VALUES (3, 'Charlie')
  3.  UPDATE users SET name='David' WHERE id=1
  4.  DELETE FROM users WHERE id=2
  5.  SELECT COUNT(*) FROM users
----------------------------------------
共 5 条历史记录
提示：使用 ↑/↓ 键快速导航历史命令
```

#### ↑/↓ 键 - 历史命令导航
- ↑ 键：上一条历史命令
- ↓ 键：下一条历史命令
- 自动记录所有输入的命令和 SQL

**文件修改:**
- `src/cli/app.py` - 添加 command_history、history_index 属性
- `src/cli/app.py` - 添加 up/down 键绑定
- `src/cli/app.py` - _handle_input 自动记录命令历史
- `src/cli/commands.py` - 实现 handle_history 命令

### 测试覆盖

**新增测试:**
- `tests/test_history_feature.py` - /history 命令功能测试

**测试结果:**
```
测试 1: 空历史             ✓
测试 2: 添加命令到历史      ✓
测试 3: 显示历史记录        ✓
测试 4: 限制显示数量        ✓
测试 5: 历史导航           ✓
测试 6: SQL 执行后自动添加  ✓
```

---

## 2026-03-12 - /export 和 /format 命令功能完成

### 新增功能

#### /export - 导出查询结果
- 支持多种导出格式：CSV、JSON、Markdown、Table
- 可直接在命令行查看导出结果
- 使用标准库 csv 和 json 模块

**用法:**
```
/export <格式> <SQL 查询>

支持的格式：csv, json, markdown, table

示例:
/export csv SELECT * FROM users;
/export json SELECT id, name FROM products;
/export markdown SELECT * FROM orders LIMIT 10;
```

**输出示例 (JSON):**
```json
[
  {
    "id": 1,
    "name": "Apple",
    "price": 1.5
  },
  {
    "id": 2,
    "name": "Banana",
    "price": 0.75
  }
]
```

**输出示例 (Markdown):**
```markdown
| id | name   | price |
|---|---|---|
| 1 | Apple  | 1.5   |
| 2 | Banana | 0.75  |
```

**文件修改:**
- `src/cli/commands.py` - 实现 handle_export、_export_csv、_export_json、_export_markdown

#### /format - 设置输出格式
- 设置 SQL 查询结果的默认输出格式
- 支持格式：table（默认）、json、csv、markdown
- 设置后所有查询将使用指定格式输出

**用法:**
```
/format <格式>

示例:
/format json      - 设置输出为 JSON 格式
/format table     - 设置输出为表格格式
/format           - 显示当前格式
```

**输出示例:**
```
>>> /format json
✓ 输出格式已设置为：json

>>> SELECT * FROM products LIMIT 2;
[
  {
    "id": 1,
    "name": "Apple",
    "price": 1.5
  },
  {
    "id": 2,
    "name": "Banana",
    "price": 0.75
  }
]
```

**文件修改:**
- `src/cli/app.py` - 添加 output_format 属性，set_output_format/get_output_format 方法
- `src/cli/app.py` - 新增 _format_result_table/json/csv/markdown 方法
- `src/cli/commands.py` - 实现 handle_format 命令

### 测试覆盖

**新增测试:**
- `tests/test_format_feature.py` - /format 命令功能测试

**测试结果:**
```
测试 1: 默认格式 (table)     ✓
测试 2: JSON 格式           ✓
测试 3: CSV 格式            ✓
测试 4: Markdown 格式       ✓
测试 5: 无效格式            ✓
测试 6: 无参数情况          ✓
```

---

## 2026-03-12 - /run 命令功能完成

### 新增功能

#### /run - 执行 SQL 文件
- 读取并执行 SQL 文件
- 支持多语句执行
- 自动分割 SQL 语句（按分号）
- 处理注释（`--` 和 `/* */`）
- 显示执行进度和结果汇总
- 错误处理（文件不存在、未连接等）

**用法:**
```
/run <SQL 文件>

示例:
/run migrate.sql
/run /path/to/seed.sql
```

**输出示例:**
```
>>> /run test.sql

执行文件：test.sql
----------------------------------------
[1/4] OK
[2/4] OK - 影响 1 行
[3/4] OK - 影响 1 行
┌────┬────────┬───────┐
│ id │ name   │ price │
├────┼────────┼───────┤
│ 1  │ Apple  │ 1.5   │
│ 2  │ Banana │ 0.75  │
└────┴────────┴───────┘
2 rows in 0.07ms
----------------------------------------
执行完成：共 4 条语句，成功 4 条，失败 0 条
```

**文件修改:**
- `src/cli/commands.py` - 实现 handle_run 和 _split_sql_statements

### 测试覆盖

**新增测试:**
- `tests/test_run_feature.py` - /run 命令功能测试
- `tests/test_run_simple.py` - /run 命令简单演示

**测试结果:**
```
测试 1: 执行 SQL 文件       ✓
测试 2: 执行不存在的文件    ✓
测试 3: 未连接时执行        ✓
测试 4: 无参数情况          ✓
```

---

## 2026-03-12 - 配置管理功能完成

### 新增功能

#### 1. /config test - 测试数据库连接
- 实现 `test_connection()` 方法
- 支持 MySQL/PostgreSQL/SQLite
- 显示数据库版本和连接延迟

**输出示例:**
```
>>> /config test test1
✓ 连接成功：test1
  类型：sqlite
  版本：SQLite 3.43.2
  延迟：0.21ms
```

**文件修改:**
- `src/database/connection.py` - 添加 ConnectionTestResult 和测试方法
- `src/cli/commands.py` - 实现 _config_test 命令

#### 2. /config remove - 删除配置
- 删除指定配置
- 保护机制：不能删除当前连接的配置
- 错误处理：配置不存在时提示

**输出示例:**
```
>>> /config remove old_db
✓ 配置已删除：old_db

>>> /config remove current
错误：不能删除当前连接的配置
```

**文件修改:**
- `src/cli/commands.py` - 实现 _config_remove 命令

#### 3. /config edit - 编辑配置
- 显示当前配置信息
- 提示使用配置文件直接编辑（完整编辑功能待实现）

**输出示例:**
```
>>> /config edit test1
编辑配置：test1
----------------------------------------
类型：sqlite
主机：localhost
端口：0
用户：
数据库：/path/to/db.sqlite

提示：/config edit 功能开发中，请使用配置文件直接编辑
```

### 测试覆盖

**新增测试:**
- `tests/test_config_features.py` - 配置管理功能测试

**测试结果:**
```
测试 1: /config test 命令    ✓
测试 2: /config remove 命令   ✓
测试 3: /config edit 命令     ✓
测试 4: /config list 命令     ✓
```

### 完整功能列表

**配置管理 (已完成):**
- [x] /config add - 添加配置
- [x] /config list - 列出配置
- [x] /config edit - 编辑配置 (查看)
- [x] /config remove - 删除配置
- [x] /config test - 测试连接

**连接管理 (已完成):**
- [x] /connect - 连接数据库
- [x] /disconnect - 断开连接

**数据库操作 (已完成):**
- [x] /list - 列出所有表
- [x] /desc - 查看表结构
- [x] SELECT/INSERT/UPDATE/DELETE - SQL 执行

---

## 2026-03-12 - 完成核心功能开发

### 完成的功能

#### 1. 输出显示功能修复
- 实现 `_refresh_output()` 方法
- 实现 `_add_to_history()` 方法
- 修复只读缓冲区问题
- 完善 SQL 结果表格格式化

**文件修改:**
- `src/cli/app.py` - 重写输出显示逻辑

**测试结果:**
```
测试 1: 导入模块...        ✓
测试 2: 创建应用...        ✓
测试 3: 命令处理...        ✓
测试 4: 配置管理器...      ✓
测试 5: 输出格式化...      ✓
```

#### 2. /desc 表结构查看功能
- 添加 `ColumnInfo` 和 `TableSchema` 数据类
- 实现 `get_table_schema()` 方法（支持 MySQL/PostgreSQL/SQLite）
- 实现 `_show_table_schema()` 显示逻辑

**文件修改:**
- `src/database/connection.py` - 添加表结构查询
- `src/cli/commands.py` - 实现 /desc 命令

**输出示例:**
```
表结构：products
================================================================================
字段                      类型                 空    默认值          额外
--------------------------------------------------------------------------------
id                        INTEGER              NO    -               PK,AUTO
name                      TEXT                 NO    -               -
price                     REAL                 YES   0.0             -
created_at                TIMESTAMP            YES   CURRENT_TIMESTAMP -
--------------------------------------------------------------------------------
主键：id
索引:
  - idx_name (name)
================================================================================
```

#### 3. /config add 配置添加功能
- 支持命令行参数方式添加配置
- 格式：`/config add <名称> <类型> <主机> [端口] <用户> <密码> [数据库]`
- 支持 MySQL/PostgreSQL/SQLite

**文件修改:**
- `src/cli/commands.py` - 实现 _config_add 和 _save_config

**使用示例:**
```
/config add local mysql localhost 3306 root password testdb
/config add prod postgresql prod.db.com 5432 admin secret mydb
/config add mydb sqlite :memory: - - /path/to/db.sqlite
```

#### 4. 综合测试脚本
- 创建 `tests/test_integration.py`
- 测试配置添加、连接、列表、表结构、SQL 执行

**测试结果:**
```
测试 1: /config add 命令    ✓
测试 2: /connect 命令       ✓
测试 3: /list 命令          ✓
测试 4: /desc 命令          ✓
测试 5: SQL 执行            ✓
```

### 项目状态

**已完成:**
- [x] 输出显示
- [x] SQL 执行和结果展示
- [x] /config add 配置添加
- [x] /config list 配置列表
- [x] /connect 连接数据库
- [x] /list 列出所有表
- [x] /desc 查看表结构
- [x] /help 帮助信息
- [x] 自动补全（命令/关键字）

**待完成:**
- [ ] /config edit 编辑配置
- [ ] /config remove 删除配置
- [ ] /config test 测试连接
- [ ] /run 执行 SQL 文件
- [ ] 历史记录功能
- [ ] 输出格式切换（JSON/CSV）

### 技术指标

**代码行数:**
- src/cli/app.py: ~290 行
- src/cli/commands.py: ~340 行
- src/cli/completer.py: ~200 行
- src/config/manager.py: ~170 行
- src/database/connection.py: ~400 行

**测试覆盖:**
- tests/test_config.py: 4 个测试
- tests/test_completer.py: 6 个测试
- tests/test_output.py: 5 个测试
- tests/test_integration.py: 5 个测试

**依赖:**
- prompt_toolkit 3.0.52
- rich 14.3.3
- cryptography 46.0.5
- pymysql 1.1.2
- psycopg2-binary 2.9.11
- pyyaml 6.0.3

---

## 下一步计划

1. **历史记录** - 实现命令历史导航
2. **高级功能** - 事务管理、批量执行、查询计划查看
