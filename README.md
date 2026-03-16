# DBManager v0.5.0

> 交互式数据库管理命令行工具 - 基于 Ink + React + TypeScript
> 
> **v0.5.0 新增：智能查询助手** - 错误诊断、性能优化、自然语言生成 SQL

[![Version](https://img.shields.io/badge/version-0.5.0-blue.svg)](https://github.com/dbmanager/dbmanager)
[![Node](https://img.shields.io/badge/node-%3E%3D20.0.0-green.svg)](https://nodejs.org)
[![License](https://img.shields.io/badge/license-MIT-yellow.svg)](LICENSE)

---

## 📖 目录

- [快速开始](#-快速开始)
- [功能特性](#-功能特性)
- [安装](#-安装)
- [使用](#-使用)
- [快捷键](#-快捷键)
- [命令参考](#-命令参考)
- [智能查询助手](#-智能查询助手)
- [文档](#-文档)

---

## 🚀 快速开始

```bash
# 安装依赖
npm install

# 构建
npm run build

# 启动
npm start
```

启动后：
1. `/config add` - 添加数据库配置
2. `/connect <实例名>` - 连接数据库
3. 直接输入 SQL 执行
4. `/diagnose` - 智能错误诊断
5. `/optimize` - 查询优化建议

---

## ✨ 功能特性

### 核心功能
- 🔌 **多数据库支持** - SQLite、MySQL、PostgreSQL
- 📝 **SQL 执行** - 交互式 SQL 编写和执行
- 🔀 **事务管理** - BEGIN/COMMIT/ROLLBACK
- 📊 **多格式输出** - Table/JSON/CSV/Markdown
- 🔧 **配置管理** - 安全的连接配置存储

### v0.5.0 新增 - 智能查询助手 ⭐

| 功能 | 命令 | 描述 |
|------|------|------|
| 🔍 **错误诊断** | `/diagnose` | 自动诊断 SQL 错误，提供解决方案 |
| ⚡ **优化建议** | `/optimize` | 分析查询性能问题，给出优化建议 |
| 🗣️ **NL2SQL** | `/nl2sql` | 中文自然语言转换为 SQL |
| 🌳 **查询计划** | `/explain` | 可视化执行计划 + 优化建议 |
| 🔖 **书签管理** | `/bookmark` | 保存和快速调用常用查询 |

### 增强功能
- ⌘ **命令面板** - Ctrl+P 唤起类 Spotlight 搜索
- 🎯 **智能补全** - 增强 Tab 补全，多选列表 UI
- 📖 **分类帮助** - /help 分类展示，支持关键词搜索
- 💡 **快捷键提示** - 状态栏轮播提示

---

## 📦 安装

### 系统要求
- Node.js >= 20.0.0
- npm 或 yarn

### 本地安装
```bash
git clone <repository>
cd dbmanager
npm install
npm run build
npm start
```

### 全局安装（可选）
```bash
npm install -g  # 或 npm link
dbmanager       # 或 dbm
```

---

## 💻 使用

### 配置管理
```bash
# 添加配置
/config add <名称> <类型> <主机> <端口> <用户> <密码> [数据库]

# 示例 - SQLite
/config add mydb sqlite /path/to/db.db - - -

# 示例 - MySQL
/config add production mysql localhost 3306 root password mydb

# 查看所有配置
/config list

# 测试连接
/config test <实例名>
```

### 连接数据库
```bash
# 连接
/connect <实例名>

# 断开
/disconnect

# 查看表
/list

# 查看表结构
/desc <表名>
```

### 执行 SQL
```sql
sql> SELECT * FROM users;
sql> INSERT INTO users (name, email) VALUES ('Alice', 'alice@example.com');
```

### 事务管理
```bash
/begin      # 开始事务
/commit     # 提交事务
/rollback   # 回滚事务
```

### 输出格式
```bash
/format table     # 表格格式（默认）
/format json      # JSON 格式
/format csv       # CSV 格式
/format markdown  # Markdown 格式
```

---

## ⌨️ 快捷键

| 快捷键 | 功能 |
|--------|------|
| `Ctrl+P` | 打开命令面板 |
| `Tab` | 自动补全 |
| `↑` / `↓` | 历史命令导航 |
| `Ctrl+L` | 清屏 |
| `Ctrl+D` | 退出 |
| `ESC` | 取消补全/关闭面板 |
| `/help` | 查看帮助 |

---

## 📋 命令参考

### 连接管理
| 命令 | 描述 |
|------|------|
| `/config` | 配置管理 (add/list/remove/test) |
| `/connect` | 连接数据库 |
| `/disconnect` | 断开连接 |
| `/list` | 列出所有表 |
| `/desc` | 查看表结构 |

### SQL 执行
| 命令 | 描述 |
|------|------|
| `SELECT...` | 直接输入 SQL |
| `/run` | 执行 SQL 文件 |
| `/explain` | 查看查询计划 |
| `/batch` | 批量执行 SQL 文件 |

### 事务管理
| 命令 | 描述 |
|------|------|
| `/begin` | 开始事务 |
| `/commit` | 提交事务 |
| `/rollback` | 回滚事务 |

### 系统命令
| 命令 | 描述 |
|------|------|
| `/help` | 帮助信息 |
| `/history` | 历史命令 |
| `/clear` | 清屏 |
| `/quit` | 退出 |
| `/format` | 设置输出格式 |

---

## 🤖 智能查询助手

### 🔍 错误诊断 - `/diagnose`

自动诊断 SQL 执行错误，提供详细的解决方案。

```bash
# 诊断错误消息
/diagnose "table 'users' doesn't exist"

# 诊断错误代码
/diagnose 1064
/diagnose 1146

# 自动诊断（SQL 执行出错时自动显示）
sql> SELEC * FROM users;
# 自动显示诊断报告
```

**支持的错误代码：**
- MySQL: 1045/1049/1054/1062/1064/1146/1205/2003/2006
- PostgreSQL: 28P01/3D000/42703/42P01/23505/23503/57014
- SQLite: SQLITE_ERROR/SQLITE_INTERNAL/SQLITE_PERM/SQLITE_BUSY/SQLITE_LOCKED/SQLITE_FULL

---

### ⚡ 查询优化建议 - `/optimize`

分析 SQL 查询，检测性能问题并提供优化建议。

```bash
# 分析查询
/optimize SELECT * FROM users

# 快捷命令
/opt SELECT * FROM orders WHERE user_id IN (SELECT id FROM users)
```

**检测项：**
- 🟡 SELECT * 使用
- 🔴 UPDATE/DELETE 无 WHERE 条件
- 🟡 LIKE 前缀通配符
- 🟢 子查询优化
- 🔴 JOIN 缺少 ON 条件
- 🟢 ORDER BY 无 LIMIT
- 🟢 OR 条件优化
- 🟡 函数包裹列
- 🟢 NOT IN 优化

---

### 🗣️ 自然语言生成 SQL - `/nl2sql`

将中文自然语言转换为 SQL 语句。

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

---

### 🌳 查询计划可视化 - `/explain`

查看 SQL 执行计划，提供优化建议。

```bash
/explain SELECT * FROM users WHERE email = 'test@example.com'
```

**输出内容：**
- 执行计划树形展示
- 成本估算和统计信息
- 自动优化建议（全表扫描、索引使用等）
- 严重程度分级（🔴 Critical / 🟡 Warning / 🟢 Info）

---

### 🔖 书签管理 - `/bookmark`

保存常用查询，支持标签分类和快速调用。

```bash
# 添加书签
/bookmark add "用户列表" "SELECT * FROM users" mysql users
/bookmark add "订单统计" "SELECT user_id, COUNT(*) FROM orders GROUP BY user_id" mysql stats

# 列出书签
/bookmark list
/bookmark list mysql          # 按标签过滤

# 搜索书签
/bookmark search user

# 运行书签
/bookmark run "用户列表"
/bm run "订单统计"            # 快捷命令

# 查看标签
/bookmark tags

# 导出/导入
/bookmark export
/bookmark import bookmarks.json

# 统计信息
/bookmark stats
```

**功能特性：**
- 🔖 添加/删除/更新书签
- 🏷️ 按标签分类管理
- 🔍 搜索书签（名称/SQL/描述/标签）
- ▶️ 快速运行书签查询
- 📤 导出/导入（JSON 格式）
- 📊 使用统计（次数/最后使用时间）
- 📦 内置书签（常用查询模板）

---

## 📚 文档

### 使用文档
- **[完整使用指南](docs/USAGE.md)** - 详细的功能说明和使用指南
- **[命令参考](docs/SPEC.md)** - 完整的命令参考
- **[架构设计](docs/ARCHITECTURE.md)** - 系统架构说明

### 开发文档
- **[v0.5.0 开发日志](docs/DEV_v0.5.0.md)** - v0.5.0 开发过程记录
- **[三期任务规划](docs/PHASE3_TASKS.md)** - v0.5.0-v0.7.0 规划
- **[验证报告](docs/VERIFICATION_v0.5.0.md)** - v0.5.0 完整验证报告

### 版本发布
- **[v0.5.0 发布说明](docs/RELEASE_v0.5.0.md)** - v0.5.0 新功能介绍
- **[v0.4.0 发布说明](docs/RELEASE_v0.4.0.md)** - Web UI + 插件系统
- **[更新日志](docs/CHANGELOG.md)** - 完整版本历史

---

## 🛠️ 开发

```bash
# 安装依赖
npm install

# 监听模式（开发）
npm run dev

# 构建
npm run build

# 清理
npm run clean

# 运行测试
npm test

# 测试覆盖
npm run test:coverage
```

### 运行验证测试

```bash
# v0.5.0 完整验证（30 个测试用例）
node test-v0.5.0-complete.js

# 单项功能测试
node test-diagnose.js        # 错误诊断
node test-optimizer.js       # 查询优化
node test-nl2sql.js          # NL2SQL
node test-explain.js         # 查询计划
node test-bookmarks.js       # 书签管理
```

---

## 🧪 测试覆盖

| 测试类型 | 用例数 | 通过率 |
|---------|--------|--------|
| 错误诊断 | 8 | 100% |
| 查询优化 | 12 | 100% |
| NL2SQL | 10 | 100% |
| 查询计划 | 3 | 100% |
| 书签管理 | 15 | 100% |
| **完整验证 (3 轮)** | **90** | **100%** |
| **总计** | **148** | **100%** |

---

## 📄 许可证

MIT License

---

## 🙏 贡献

欢迎提交 Issue 和 Pull Request！

### 贡献方式
1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

---

## 📈 版本历史

| 版本 | 日期 | 主要功能 |
|------|------|---------|
| v0.5.0 | 2026-03-16 | 智能查询助手（诊断/优化/NL2SQL/书签）⭐ |
| v0.4.0 | 2026-03-15 | Web UI + 插件系统 + 可视化增强 |
| v0.3.0 | 2026-03-15 | 命令面板 + 智能补全 |
| v0.2.0 | 2026-03-15 | TypeScript 重构 |
| v0.1.0 | 2026-03-12 | Python 初始版本 |

---

<div align="center">
  <strong>DBManager</strong> - 让数据库管理更简单、更智能
</div>
