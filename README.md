# DBManager v0.3.0

> 交互式数据库管理命令行工具 - 基于 Ink + React + TypeScript

[![Version](https://img.shields.io/badge/version-0.3.0-blue.svg)](https://github.com/dbmanager/dbmanager)
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

---

## ✨ 功能特性

### 核心功能
- 🔌 **多数据库支持** - SQLite、MySQL、PostgreSQL
- 📝 **SQL 执行** - 交互式 SQL 编写和执行
- 🔀 **事务管理** - BEGIN/COMMIT/ROLLBACK
- 📊 **多格式输出** - Table/JSON/CSV/Markdown

### 增强功能（v0.3.0 新增）
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
| `/config` | 配置管理 |
| `/connect` | 连接数据库 |
| `/disconnect` | 断开连接 |
| `/list` | 列出表 |
| `/desc` | 查看表结构 |

### SQL 执行
| 命令 | 描述 |
|------|------|
| `SELECT...` | 直接输入 SQL |
| `/run` | 执行 SQL 文件 |
| `/explain` | 查询计划 |

### 事务管理
| 命令 | 描述 |
|------|------|
| `/begin` | 开始事务 |
| `/commit` | 提交事务 |
| `/rollback` | 回滚事务 |

### 系统命令
| 命令 | 描述 |
|------|------|
| `/help` | 帮助 |
| `/history` | 历史命令 |
| `/clear` | 清屏 |
| `/quit` | 退出 |

---

## 📚 文档

- **[完整使用文档](docs/USAGE.md)** - 详细的功能说明和使用指南
- [更新日志](docs/CHANGELOG.md) - 版本更新记录
- [UI 设计文档](docs/UI_DESIGN.md) - 界面设计说明
- [自动补全文档](docs/AUTOCOMPLETE.md) - 补全功能说明

---

## 🛠️ 开发

```bash
# 监听模式
npm run dev

# 构建
npm run build

# 清理
npm run clean

# 运行测试
node verify1.js
node verify2.js
node verify3.js
```

---

## 📄 许可证

MIT License

---

## 🙏 贡献

欢迎提交 Issue 和 Pull Request！

---

<div align="center">
  <strong>DBManager</strong> - 让数据库管理更简单
</div>
