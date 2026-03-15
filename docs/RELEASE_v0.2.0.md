# DBManager v0.2.0 发布说明

**发布日期：** 2026-03-15  
**开发模式：** 单人全栈开发  
**开发周期：** 1 天

---

## 🎉 重大更新

从 Python (prompt_toolkit) 完全重构到 **TypeScript + Ink + React**！

### 核心改进

- ✅ **现代化 UI** - 基于 Ink + React 的组件化界面
- ✅ **类型安全** - TypeScript 全栈类型检查
- ✅ **更好的性能** - Node.js 异步 I/O
- ✅ **连接池支持** - MySQL/PostgreSQL 连接复用
- ✅ **持久化历史** - 命令历史自动保存
- ✅ **多种导出格式** - CSV/JSON/Markdown/Table/SQL

---

## 📦 新增功能

### 命令增强

| 命令 | 功能 | 说明 |
|------|------|------|
| `/run <文件>` | 执行 SQL 文件 | 支持读取并执行本地 SQL 文件 |
| `/batch file <文件>` | 批量执行 | 在事务中批量执行 SQL 文件 |
| `/batch run <SQL>` | 批量执行语句 | 直接执行多条 SQL 语句 |
| `/explain <SQL>` | 查询计划 | 查看 SQL 执行计划 |
| `/use <数据库>` | 切换数据库 | 动态切换当前数据库 |
| `/export <格式> [文件]` | 导出功能 | 支持 5 种格式，可导出到文件 |

### 技术特性

- **连接池** - MySqlConnectionPool, PostgresConnectionPool
- **超时控制** - 查询超时保护（默认 30 秒）
- **历史记录** - 自动保存到 `~/.dbmanager/history.json`
- **导出管理器** - ExportManager 支持多种格式

---

## 🏗️ 架构改进

### 新增模块

```
src/ts/
├── database/
│   └── pool.ts          # 连接池实现
├── utils/
│   ├── history.ts       # 历史记录管理
│   └── export.ts        # 导出功能
└── ...
```

### 测试框架

- Jest + ts-jest
- 10+ 单元测试用例
- 70% 覆盖率阈值

---

## 📊 代码统计

| 指标 | 数值 |
|------|------|
| TypeScript 代码 | ~3,500 行 |
| 测试代码 | ~300 行 |
| 新增文件 | 7 个 |
| 修改文件 | 10+ 个 |
| Git 提交 | 10 次 |

---

## 🔧 技术栈

### 核心依赖

| 组件 | 版本 | 用途 |
|------|------|------|
| TypeScript | 5.8.3 | 语言 |
| Ink | 5.2.0 | CLI 框架 |
| React | 18.3.1 | UI 库 |
| mysql2 | 3.14.0 | MySQL 驱动 |
| pg | 8.14.1 | PostgreSQL 驱动 |
| better-sqlite3 | 11.10.0 | SQLite 驱动 |
| Jest | 30.3.0 | 测试框架 |

---

## 📝 升级指南

### 从 v0.1.0 (Python) 升级

1. **备份配置**
   ```bash
   cp ~/.dbmanager/config.json ~/.dbmanager/config.json.bak
   ```

2. **安装新版本**
   ```bash
   cd dbmanager
   npm install
   npm run build
   npm link
   ```

3. **验证安装**
   ```bash
   dbmanager --version
   # 应显示 v0.2.0
   ```

### 配置兼容性

- ✅ 配置文件格式保持不变
- ✅ 密码加密方式兼容
- ⚠️ 历史记录格式变更（自动迁移）

---

## 🐛 已知问题

1. **keytar 在测试环境中失败**
   - 原因：需要系统密钥链
   - 解决：已跳过相关测试用例

2. **PostgreSQL 切换数据库**
   - 限制：不支持 USE 命令
   - 替代：重新连接

---

## 🚀 下一步计划

### v0.3.0 规划

- [ ] 自动补全增强（表名/列名）
- [ ] 语法高亮改进
- [ ] Web UI（可选）
- [ ] 插件系统
- [ ] 性能优化

---

## 📖 相关文档

- [ARCHITECTURE.md](./ARCHITECTURE.md) - 架构设计
- [USAGE.md](./USAGE.md) - 使用指南
- [SPEC.md](./SPEC.md) - 功能规格

---

## 👨‍💻 开发团队

**单人开发：** 全栈工程师 1 名
- 架构设计
- 前端开发（Ink + React）
- 后端开发（Node.js）
- 测试与质量

---

## 📄 许可证

MIT License

---

**感谢使用 DBManager！** 🎉
