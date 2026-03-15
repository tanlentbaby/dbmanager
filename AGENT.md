## 数据库管理工具 - DBManager

### 项目概述

一个类似 Claude Code CLI 的交互式终端数据库管理工具，支持多数据库类型、SQL 编写执行、配置管理等功能。

### 核心需求

#### 1. 类 Claude Code CLI 终端管理

- 交互式命令行界面
- 支持自动补全 (Tab)
- 历史记录导航 (↑/↓)
- 命令搜索 (Ctrl+R)
- 语法高亮显示

#### 2. 数据库配置管理

**配置文件位置：** `~/.dbmanager/config.json`

**支持操作：**
- `/config add` - 添加数据库配置（交互式问答）
- `/config list` - 列出所有配置
- `/config edit <name>` - 编辑配置
- `/config remove <name>` - 删除配置
- `/config test <name>` - 测试连接
- `/config export/import` - 配置导入导出

**支持的数据库类型：**
- MySQL
- PostgreSQL
- SQLite
- Oracle (可选)
- SQL Server (可选)

#### 3. SQL 编写及执行

**基础功能：**
- 直接输入 SQL 执行（分号结尾）
- 多行 SQL 支持
- 批量语句执行
- 参数化查询支持

**命令系统：**
- `/connect <name>` 或 `/co <name>` 或 `/check-out <name>` - 切换实例
- `/list` 或 `/ls` - 列出所有表
- `/desc <table>` 或 `/describe <table>` - 查看表结构
- `/run <file>` 或 `/source <file>` - 执行 SQL 文件
- `/history` 或 `/h` - 查看历史命令
- `/export <format>` - 设置导出格式 (table/json/csv/markdown)
- `/format <format>` - 切换输出格式
- `/help` - 帮助信息
- `/quit` 或 `/exit` 或 `/q` - 退出

**类 MySQL/SQLite 快捷命令：**
- `\c <database>` - 切换数据库
- `\q` - 退出
- `\l` - 列出表
- `\d <table>` - 查看表结构
- `\x` - 切换垂直输出

#### 4. 自动补全系统

**补全类型：**

| 类型 | 触发条件 | 补全内容 |
|------|----------|----------|
| 命令补全 | 输入 `/` 开头 | 系统命令列表 |
| 表名补全 | `FROM ` / `JOIN ` 后 | 当前数据库表名 |
| 列名补全 | `SELECT ` / `WHERE ` 后 | 表字段名 |
| 关键字补全 | SQL 关键字前缀 | SQL 保留字 |
| 配置名补全 | `/connect ` 后 | 已配置实例名 |
| 文件名补全 | `/run ` 后 | 本地 .sql 文件 |

**快捷键：**
- `Tab` - 显示补全/选择下一项
- `Shift+Tab` - 选择上一项
- `Enter` - 确认补全
- `Esc` - 取消补全

**智能特性：**
- 模糊匹配（`usr` → `users`）
- 常用优先（根据历史频率排序）
- 数据库类型感知（MySQL/PostgreSQL 关键字）
- 元数据缓存（避免重复查询）

#### 5. "/" 快捷键提示系统

```
输入 / 后显示：
  /config      配置管理
  /connect     连接数据库
  /list        列出表
  /desc        表结构
  /run         执行文件
  /history     历史记录
  /export      导出
  /help        帮助
  /quit        退出

输入 /c 后筛选显示：
  /config      配置管理
  /connect     连接数据库
```

### 输出格式

**表格格式（默认）：**
```
┏━━━━┳━━━━━━━━━━┳━━━━━━━━━━━━━━━━━┓
┃ id ┃ username ┃ email           ┃
┣━━━━╇━━━━━━━━━━╇━━━━━━━━━━━━━━━━━┫
┃ 1  ┃ admin    ┃ admin@test.com  ┃
┗━━━━┻━━━━━━━━━━┻━━━━━━━━━━━━━━━━━┛
```

**其他格式：**
- JSON（带语法高亮）
- CSV（可导出文件）
- Markdown 表格
- 垂直格式（适合宽表）

### 技术栈

| 组件 | 方案 |
|------|------|
| 语言 | Python 3.9+ |
| CLI 框架 | prompt_toolkit 3 |
| 输出美化 | rich |
| MySQL | pymysql |
| PostgreSQL | psycopg2-binary |
| SQLite | sqlite3 (内置) |
| 配置加密 | cryptography |

### 文件结构

```
dbmanager/
├── src/
│   ├── __init__.py           # 包信息
│   ├── main.py               # 程序入口
│   ├── cli/                  # CLI 相关
│   │   ├── __init__.py
│   │   ├── app.py            # 主应用类
│   │   ├── commands.py       # 命令处理器
│   │   └── completer.py      # 自动补全器
│   ├── config/               # 配置管理
│   │   ├── __init__.py
│   │   └── manager.py        # 配置管理器
│   ├── database/             # 数据库驱动
│   │   ├── __init__.py
│   │   ├── connection.py     # 连接管理器
│   │   └── drivers/          # 各数据库驱动
│   └── utils/                # 工具函数
├── docs/                     # 文档
│   ├── SPEC.md               # 详细规格说明
│   ├── UI_DESIGN.md          # 界面设计
│   └── AUTOCOMPLETE.md       # 自动补全设计
├── tests/                    # 测试
│   ├── test_config.py
│   └── test_completer.py
├── examples/                 # 示例
│   └── users.sql
├── AGENT.md                  # 本文件
├── README.md                 # 项目说明
├── QUICKSTART.md             # 快速开始
├── requirements.txt          # 依赖
├── pyproject.toml            # 项目配置
└── setup.py                  # 安装脚本
```

### 安全考虑

1. 密码加密存储（cryptography 库）
2. 配置文件权限 600（仅用户可读写）
3. 危险操作二次确认（DROP/TRUNCATE）
4. SQL 注入防护（参数化查询）
5. 连接超时设置

### 开发阶段

**Phase 1 - MVP (当前阶段):**
- [x] 项目脚手架
- [x] 基础 CLI 框架
- [x] MySQL 连接支持
- [x] 命令补全器
- [ ] /config add 交互实现
- [ ] 完整 SQL 执行

**Phase 2 - 完善:**
- [ ] PostgreSQL/SQLite 支持
- [ ] 历史记录
- [ ] 表名/列名补全
- [ ] 输出格式化

**Phase 3 - 增强:**
- [ ] 语法高亮
- [ ] 导出功能
- [ ] 表结构查看
- [ ] 批量执行

### 运行项目

```bash
# 安装依赖
pip install -e .

# 运行
dbmanager
# 或
python src/main.py
```

### 相关文档

- [详细规格说明](docs/SPEC.md) - 配置管理、SQL 执行、错误处理等详细设计
- [界面设计](docs/UI_DESIGN.md) - 11 个界面的 ASCII 原型
- [自动补全设计](docs/AUTOCOMPLETE.md) - 补全类型、触发逻辑、实现示例
- [快速开始](QUICKSTART.md) - 安装和使用指南
- [项目 README](README.md) - 项目说明和使用示例
