# DBManager 使用文档

> 版本：v0.3.0
> 最后更新：2026-03-14

DBManager 是一个基于 Ink + React + TypeScript 构建的交互式数据库管理命令行工具，支持 MySQL、PostgreSQL 和 SQLite 数据库。

---

## 目录

1. [快速开始](#快速开始)
2. [安装](#安装)
3. [配置管理](#配置管理)
4. [连接数据库](#连接数据库)
5. [SQL 执行](#sql-执行)
6. [事务管理](#事务管理)
7. [输出格式](#输出格式)
8. [快捷键](#快捷键)
9. [增强功能](#增强功能)
10. [命令参考](#命令参考)

---

## 快速开始

```bash
# 启动 DBManager
npm start

# 或使用全局安装
dbmanager
# 或简写
dbm
```

启动后：
1. 输入 `/config add` 添加数据库配置
2. 输入 `/connect <实例名>` 连接数据库
3. 直接输入 SQL 语句执行
4. 输入 `/help` 查看完整命令帮助

---

## 安装

### 系统要求

- Node.js >= 20.0.0
- npm 或 yarn

### 安装步骤

```bash
# 1. 克隆或下载项目
cd dbmanager

# 2. 安装依赖
npm install

# 3. 构建 TypeScript
npm run build

# 4. 启动
npm start
```

### 全局安装（可选）

```bash
# 链接到全局
npm link

# 之后可直接使用
dbmanager
# 或
dbm
```

---

## 配置管理

### 添加数据库配置

```bash
# 交互式添加（推荐）
/config add

# 命令行添加
/config add <名称> <类型> <主机> <端口> <用户> <密码> [数据库]
```

**示例：**

```bash
# SQLite
/config add mydb sqlite /path/to/database.db - - -

# MySQL
/config add production mysql localhost 3306 root password mydb

# PostgreSQL
/config add pgdev pg localhost 5432 postgres password mydb
```

### 查看所有配置

```bash
/config list
# 或简写
/config ls
```

输出示例：
```
配置列表:
────────────────────────────────────────────────────────────
名称                 类型         主机             端口   数据库      状态
────────────────────────────────────────────────────────────
mydb               sqlite       /path/to/db.db   -      -         ○
production         mysql        localhost        3306   mydb      ●
────────────────────────────────────────────────────────────
图例：● 当前连接  ○ 未连接
```

### 删除配置

```bash
/config remove <实例名>
```

### 测试连接

```bash
/config test <实例名>
```

---

## 连接数据库

### 连接到配置

```bash
# 使用配置名连接
/connect <实例名>
# 或简写
/co <实例名>

# 不带参数显示可用配置列表
/connect
```

### 断开连接

```bash
/disconnect
```

### 查看当前连接状态

状态栏会显示当前连接信息：
```
 mysql @ localhost:3306 | mydb | 格式：table
```

---

## SQL 执行

### 直接执行 SQL

在提示符后直接输入 SQL 语句（以分号结尾）：

```sql
sql> SELECT * FROM users;
sql> INSERT INTO users (name, email) VALUES ('Alice', 'alice@example.com');
sql> UPDATE users SET name = 'Bob' WHERE id = 1;
sql> DELETE FROM users WHERE id = 1;
```

### 查看表列表

```bash
/list
# 或简写
/ls
```

### 查看表结构

```bash
/desc <表名>
# 或
/describe <表名>
```

输出示例：
```
表结构：users
================================================================================
字段                      类型                  空     默认值           额外
--------------------------------------------------------------------------------
id                        INTEGER               NO     -                PK,AUTO
name                      VARCHAR(100)          NO     -                -
email                     VARCHAR(255)          YES    NULL             -
created_at                DATETIME              YES    CURRENT_TIMESTAMP -
--------------------------------------------------------------------------------
主键：id
索引:
  - idx_email (email)
  - UNIQUE uk_email (email)
================================================================================
```

### 执行 SQL 文件

```bash
/run <文件路径>
```

### 查看查询计划

```bash
/explain SELECT * FROM users WHERE id = 1
```

---

## 事务管理

### 开始事务

```bash
/begin
```

### 提交事务

```bash
/commit
```

### 回滚事务

```bash
/rollback
```

**事务使用示例：**
```sql
sql> /begin
✓ 事务已开始

sql> INSERT INTO users (name) VALUES ('Test');
✓ 执行成功 - 影响 1 行

sql> /rollback
✓ 事务已回滚
```

---

## 输出格式

DBManager 支持 4 种输出格式：

### 切换格式

```bash
/format <格式>
```

支持的格式：
- `table` - 表格格式（默认）
- `json` - JSON 数组格式
- `csv` - CSV 格式
- `markdown` - Markdown 表格格式

### 格式示例

对于查询 `SELECT * FROM users LIMIT 2`：

**Table 格式：**
```
┌────┬─────────┬───────────────────┐
│ id │ name    │ email             │
├────┼─────────┼───────────────────┤
│ 1  │ Alice   │ alice@example.com │
│ 2  │ Bob     │ bob@example.com   │
└────┴─────────┴───────────────────┘
2 rows in 1.23ms
```

**JSON 格式：**
```json
[
  {
    "id": 1,
    "name": "Alice",
    "email": "alice@example.com"
  },
  {
    "id": 2,
    "name": "Bob",
    "email": "bob@example.com"
  }
]
```

**CSV 格式：**
```csv
id,name,email
1,Alice,alice@example.com
2,Bob,bob@example.com
```

**Markdown 格式：**
```markdown
| id | name  | email             |
|---|---|---|
| 1 | Alice | alice@example.com |
| 2 | Bob   | bob@example.com   |
```

---

## 快捷键

### 全局快捷键

| 快捷键 | 功能 |
|--------|------|
| `Ctrl+P` | 打开命令面板（类 Spotlight 搜索） |
| `Tab` | 自动补全（命令/关键字/表名） |
| `↑` / `↓` | 浏览历史命令 / 导航补全列表 |
| `Ctrl+L` | 清屏 |
| `Ctrl+D` | 退出程序 |
| `Ctrl+C` | 清空当前输入 |
| `ESC` | 取消补全/关闭面板 |
| `Enter` | 执行命令/选择补全项 |

### 命令面板快捷键

按 `Ctrl+P` 打开命令面板后：

| 快捷键 | 功能 |
|--------|------|
| `输入文字` | 搜索命令（支持模糊匹配） |
| `↑` / `↓` | 选择命令 |
| `Enter` | 执行选中的命令 |
| `ESC` | 关闭面板 |

### 补全功能快捷键

按 `Tab` 触发补全后：

| 快捷键 | 功能 |
|--------|------|
| `↑` / `↓` | 选择补全项 |
| `Enter` | 应用补全 |
| `Tab` | 应用补全 |
| `ESC` | 取消补全 |

---

## 增强功能

### 1. 命令面板 (Ctrl+P)

按 `Ctrl+P` 打开类 Spotlight 的命令搜索面板：

- 输入关键词搜索命令
- 支持模糊匹配（如输入 "conn" 可匹配 "connect"）
- 显示命令描述和快捷键
- 回车直接执行命令

**示例：**
```
按 Ctrl+P → 输入 "format" → 显示所有格式相关命令 → 回车执行
```

### 2. 增强的帮助系统

```bash
# 查看所有命令（分类展示）
/help

# 搜索特定命令
/help connect
/help select
```

帮助信息按分类展示：
- **连接管理** - connect, disconnect, list, desc, config
- **SQL 执行** - run, explain, batch
- **事务管理** - begin, commit, rollback
- **格式设置** - format
- **系统命令** - help, history, clear, quit
- **其他** - export, use

### 3. 改进的 Tab 补全

增强的补全弹窗提供：
- 多选列表 UI
- 键盘导航（↑/↓）
- 类型图标和颜色区分
  - ⌘ 命令（青色）
  - K 关键字（绿色）
  - ◫ 表名（黄色）
  - ƒ 函数（紫色）

**补全场景：**
1. 输入 `/` 开头 → 命令补全
2. 输入 SQL 关键字首字母 → 关键字补全
3. 输入表名 → 已连接数据库的表名补全

### 4. 状态栏提示轮播

状态栏右下角每 5 秒轮换显示快捷键提示：
```
Ctrl+P: 命令面板 | ↑/↓: 历史导航 | Tab: 自动补全 | Ctrl+L: 清屏 | Ctrl+D: 退出
```

### 5. 模式指示器

状态栏显示当前模式：
- 正常模式（无指示）
- ⌘ 命令面板（蓝色背景）
- Tab 补全（蓝色背景）
- 选择模式（黄色背景）

---

## 命令参考

### 连接管理命令

| 命令 | 别名 | 描述 | 用法 |
|------|------|------|------|
| `/config` | - | 配置管理 | `/config <子命令> [参数]` |
| `/connect` | `/co` | 连接数据库 | `/connect <实例名>` |
| `/disconnect` | - | 断开连接 | `/disconnect` |
| `/list` | `/ls` | 列出所有表 | `/list` |
| `/desc` | `/describe` | 查看表结构 | `/desc <表名>` |

### SQL 执行命令

| 命令 | 别名 | 描述 | 用法 |
|------|------|------|------|
| 直接输入 SQL | - | 执行 SQL 语句 | `SELECT * FROM table;` |
| `/run` | - | 执行 SQL 文件 | `/run <文件路径>` |
| `/explain` | - | 查看查询计划 | `/explain <SQL>` |
| `/batch` | - | 批量执行 SQL 文件 | `/batch file <文件路径>` |

### 事务管理命令

| 命令 | 别名 | 描述 | 用法 |
|------|------|------|------|
| `/begin` | - | 开始事务 | `/begin` |
| `/commit` | - | 提交事务 | `/commit` |
| `/rollback` | - | 回滚事务 | `/rollback` |

### 格式设置命令

| 命令 | 别名 | 描述 | 用法 |
|------|------|------|------|
| `/format` | - | 设置输出格式 | `/format <table/json/csv/markdown>` |

### 系统命令

| 命令 | 别名 | 描述 | 用法 |
|------|------|------|------|
| `/help` | `/h` | 显示帮助 | `/help [关键词]` |
| `/history` | `/h` | 查看历史命令 | `/history [数量]` |
| `/clear` | - | 清屏 | `/clear` |
| `/quit` | `/exit`, `/q` | 退出程序 | `/quit` |

---

## 配置文件位置

配置存储在以下位置：

- **macOS**: `~/Library/Application Support/dbmanager/config.json`
- **Linux**: `~/.config/dbmanager/config.json`
- **Windows**: `%APPDATA%\dbmanager\config.json`

---

## 故障排除

### 无法连接数据库

1. 检查配置是否正确：`/config list`
2. 测试连接：`/config test <实例名>`
3. 确认数据库服务正在运行
4. 检查防火墙设置

### TypeScript 编译错误

```bash
# 清理并重新构建
npm run clean
npm install
npm run build
```

### 密码存储问题

在某些系统上 keytar 可能无法使用（缺少密码服务），此时密码会以明文存储在配置文件中。

---

## 开发命令

```bash
# 监听模式开发
npm run dev

# 重新构建
npm run build

# 清理构建产物
npm run clean

# 运行验证测试
node verify1.js
node verify2.js
node verify3.js
```

---

## 许可证

MIT License

---

## 支持的功能状态

✅ 已实现：
- SQLite/MySQL/PostgreSQL 连接
- 交互式 SQL 执行
- 事务管理
- 多格式输出
- 命令面板 (Ctrl+P)
- 增强 Tab 补全
- 分类帮助系统
- 历史命令导航
- 表结构查看

🚧 开发中：
- SQL 文件执行
- 批量操作
- 查询计划分析
- 数据导出
