# DBManager v0.2.0 架构设计文档

**版本：** v0.2.0  
**技术栈：** TypeScript + Ink + React + Node.js  
**更新日期：** 2026-03-15

---

## 1. 项目概述

DBManager 是一个交互式数据库管理命令行工具，支持 MySQL、PostgreSQL、SQLite 等多种数据库。

### 1.1 重构目标

从 Python (prompt_toolkit) 重构到 TypeScript (Ink + React)，实现：

- ✅ 更现代的 UI 组件化架构
- ✅ 更好的类型安全
- ✅ 更活跃的生态系统
- ✅ 解决 Python 版技术债务

### 1.2 核心功能清单 (基于 Python 版分析)

| 模块 | 功能 | 完成度 (Python) | TS 优先级 |
|------|------|-----------------|-----------|
| **配置管理** | /config add/list/remove/test | ✅ 100% | P0 |
| **连接管理** | /connect, /disconnect | ✅ 100% | P0 |
| **数据库操作** | /list, /desc | ✅ 100% | P0 |
| **SQL 执行** | 直接输入 SQL | ✅ 100% | P0 |
| **事务管理** | /begin, /commit, /rollback | ✅ 100% | P0 |
| **文件执行** | /run, /batch | ✅ 100% | P1 |
| **查询计划** | /explain | ✅ 100% | P1 |
| **历史记录** | /history, ↑/↓导航 | ✅ 100% | P1 |
| **输出格式** | table/json/csv/markdown | ✅ 100% | P1 |
| **自动补全** | Tab 补全命令/表/列 | ✅ 框架 | P1 |
| **语法高亮** | SQL 关键字高亮 | ✅ 100% | P2 |
| **导出功能** | /export | ✅ 100% | P2 |

---

## 2. 技术架构

### 2.1 技术选型

| 组件 | 技术 | 理由 |
|------|------|------|
| **运行时** | Node.js 20+ | 跨平台、性能好、生态活跃 |
| **语言** | TypeScript 5.x | 类型安全、更好的 IDE 支持 |
| **CLI 框架** | Ink + React | 组件化、声明式 UI、易于测试 |
| **MySQL** | mysql2 | 性能好、支持 Promise |
| **PostgreSQL** | pg | 官方驱动、成熟稳定 |
| **SQLite** | better-sqlite3 | 同步 API、性能优秀 |
| **配置存储** | conf | 跨平台配置管理 |
| **密码加密** | keytar | 系统级密钥链存储 |

### 2.2 目录结构

```
dbmanager/
├── src/
│   ├── main.tsx              # 程序入口
│   ├── app.tsx               # 主应用组件 (状态管理、输入处理)
│   ├── types.ts              # 类型定义
│   │
│   ├── cli/
│   │   ├── commands.ts       # 命令处理器
│   │   └── completer.ts      # 自动补全 (待实现)
│   │
│   ├── config/
│   │   └── manager.ts        # 配置管理器
│   │
│   ├── database/
│   │   ├── connection.ts     # 连接管理器
│   │   └── drivers/          # 数据库驱动 (待拆分)
│   │
│   ├── components/           # Ink UI 组件
│   │   ├── WelcomeBanner.tsx # 欢迎界面
│   │   ├── StatusBar.tsx     # 状态栏
│   │   ├── OutputDisplay.tsx # 输出显示
│   │   ├── CommandPalette.tsx # 命令面板
│   │   ├── CompletionPopup.tsx # 补全弹窗
│   │   └── EnhancedHelp.tsx  # 增强帮助
│   │
│   └── utils/
│       ├── formatter.ts      # 表格格式化
│       ├── highlighter.ts    # SQL 语法高亮
│       └── commandRegistry.ts # 命令注册表
│
├── tests/                    # 测试目录 (待创建)
│   ├── unit/
│   └── integration/
│
├── docs/                     # 文档
│   ├── ARCHITECTURE.md       # 本文档
│   ├── SPEC.md               # 功能规格
│   └── USAGE.md              # 使用指南
│
├── package.json
├── tsconfig.json
└── README.md
```

### 2.3 模块依赖图

```
┌─────────────────────────────────────────────────────────────┐
│                        main.tsx                             │
│                     (程序入口)                               │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                        app.tsx                              │
│                   (主应用组件)                               │
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────────┐    │
│  │   State     │  │   Input      │  │   Output        │    │
│  │  Management │  │  Handling    │  │  Rendering      │    │
│  └─────────────┘  └──────────────┘  └─────────────────┘    │
└─────────────────────────────────────────────────────────────┘
         │                    │                    │
         ▼                    ▼                    ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│  CommandHandler │  │  ConfigManager  │  │  Components     │
│                 │  │                 │  │                 │
│ - /config       │  │ - addConfig     │  │ - WelcomeBanner │
│ - /connect      │  │ - listConfigs   │  │ - StatusBar     │
│ - /list, /desc  │  │ - removeConfig  │  │ - OutputDisplay │
│ - /begin/commit │  │ - testConnection│  │ - CommandPalette│
│ - /run, /batch  │  │                 │  │ - Completion    │
└─────────────────┘  └─────────────────┘  └─────────────────┘
         │                    │
         ▼                    ▼
┌─────────────────────────────────────────────────────────────┐
│                    ConnectionManager                        │
│                     (连接管理器)                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │    MySQL     │  │  PostgreSQL  │  │    SQLite    │      │
│  │   (mysql2)   │  │     (pg)     │  │(better-sqlite)│     │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. 核心模块设计

### 3.1 ConfigManager (配置管理器)

**职责：** 管理数据库配置，支持增删改查和加密存储

**接口定义：**
```typescript
interface DatabaseConfig {
  type: 'mysql' | 'postgresql' | 'sqlite';
  host: string;
  port: number;
  username: string;
  password: string;  // 加密存储
  database: string;
}

class ConfigManager {
  // 配置 CRUD
  addConfig(name: string, config: DatabaseConfig): Promise<void>
  getConfig(name: string): DatabaseConfig | undefined
  listConfigs(): Record<string, DatabaseConfig>
  removeConfig(name: string): Promise<void>
  
  // 连接测试
  testConnection(name: string): Promise<ConnectionTestResult>
  
  // 设置管理
  getSettings(): AppSettings
  updateSettings(settings: Partial<AppSettings>): void
}
```

**文件位置：** `src/config/manager.ts` (已有基础实现)

---

### 3.2 ConnectionManager (连接管理器)

**职责：** 管理数据库连接，支持多实例切换、事务管理

**接口定义：**
```typescript
interface QueryResult {
  columns: string[];
  rows: any[][];
  affectedRows?: number;
}

class ConnectionManager {
  // 连接状态
  get isConnected(): boolean
  get currentInstanceName(): string | null
  get inTransaction(): boolean
  
  // 连接管理
  connect(instanceName: string): Promise<void>
  disconnect(): void
  testConnection(instanceName: string): Promise<ConnectionTestResult>
  
  // SQL 执行
  execute(sql: string): Promise<QueryResult>
  getTables(): Promise<string[]>
  getTableSchema(tableName: string): Promise<TableSchema>
  
  // 事务管理
  beginTransaction(): Promise<void>
  commitTransaction(): Promise<void>
  rollbackTransaction(): Promise<void>
}
```

**文件位置：** `src/database/connection.ts` (已有基础实现)

**待优化：**
- [ ] 连接池实现
- [ ] 查询超时控制
- [ ] 错误重试机制

---

### 3.3 CommandHandler (命令处理器)

**职责：** 解析和执行用户输入的命令

**命令列表：**
```typescript
const COMMANDS = {
  // 配置管理
  'config': ['add', 'list', 'remove', 'test'],
  
  // 连接管理
  'connect': ['<name>'],  // 别名：co, check-out
  'disconnect': [],
  
  // 数据库操作
  'list': [],             // 别名：ls
  'desc': ['<table>'],    // 别名：describe
  
  // SQL 执行
  'run': ['<file>'],
  'batch': ['file', 'run'],
  'explain': ['<sql>'],
  
  // 事务管理
  'begin': [],
  'commit': [],
  'rollback': [],
  
  // 其他
  'history': ['[limit]'],
  'format': ['<type>'],
  'export': ['<format>', '[file]'],
  'help': [],
  'quit': [],             // 别名：exit, q
};
```

**文件位置：** `src/cli/commands.ts` (已有基础实现)

---

### 3.4 App (主应用组件)

**职责：** 状态管理、输入处理、UI 渲染

**核心状态：**
```typescript
interface AppState {
  // 输出
  outputLines: OutputLine[];
  
  // 输入
  inputValue: string;
  commandHistory: string[];
  historyIndex: number;
  
  // UI 状态
  isProcessing: boolean;
  showCommandPalette: boolean;
  showCompletionPopup: boolean;
  appMode: 'normal' | 'commandPalette' | 'completion' | 'select';
  
  // 数据缓存
  tables: string[];
}
```

**文件位置：** `src/app.tsx` (已有基础实现)

---

## 4. UI 组件设计

### 4.1 组件列表

| 组件 | 职责 | 状态 |
|------|------|------|
| WelcomeBanner | 欢迎界面 | ✅ 已实现 |
| StatusBar | 状态栏 (连接状态、模式) | ✅ 已实现 |
| OutputDisplay | 输出显示 (支持样式) | ✅ 已实现 |
| CommandPalette | 命令面板 (/ 触发) | ✅ 已实现 |
| CompletionPopup | 补全弹窗 (Tab 触发) | ✅ 已实现 |
| EnhancedHelp | 增强帮助 | ✅ 已实现 |

### 4.2 界面布局

```
┌────────────────────────────────────────────────────────────┐
│  WelcomeBanner (仅启动时显示)                               │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  OutputDisplay (滚动区域)                                  │
│  ┌──────────────────────────────────────────────────────┐ │
│  │ sql> SELECT * FROM users;                            │ │
│  │ ┏━━━━┳━━━━━━━━━━┳━━━━━━━━━━━━━━━━━┓                 │ │
│  │ ┃ id ┃ username ┃ email           ┃                 │ │
│  │ ┣━━━━╇━━━━━━━━━━╇━━━━━━━━━━━━━━━━━┫                 │ │
│  │ ┃ 1  ┃ admin    ┃ admin@test.com  ┃                 │ │
│  │ ┗━━━━┻━━━━━━━━━━┻━━━━━━━━━━━━━━━━━┛                 │ │
│  │                                                      │ │
│  └──────────────────────────────────────────────────────┘ │
│                                                            │
├────────────────────────────────────────────────────────────┤
│  CommandPalette (可选，/ 触发)                             │
│  ┌──────────────────────────────────────────────────────┐ │
│  │ /config    配置管理                                   │ │
│  │ /connect   连接数据库                                 │ │
│  │ /list      列出表                                    │ │
│  └──────────────────────────────────────────────────────┘ │
├────────────────────────────────────────────────────────────┤
│  StatusBar                                                 │
│  ┌──────────────────────────────────────────────────────┐ │
│  │ ● mysql-prod  │  Format: table  │  Tx: off  │  v0.2.0│ │
│  └──────────────────────────────────────────────────────┘ │
├────────────────────────────────────────────────────────────┤
│  Input: sql> SELECT * FROM users;_                        │
└────────────────────────────────────────────────────────────┘
```

---

## 5. 数据流

### 5.1 命令执行流程

```
用户输入
    │
    ▼
┌─────────────┐
│  app.tsx    │  ← 状态管理
│ handleSubmit│
└─────────────┘
    │
    ▼
┌─────────────┐
│ Command     │  ← 命令解析
│ Handler     │
└─────────────┘
    │
    ├──────────────┬──────────────┐
    ▼              ▼              ▼
┌─────────┐  ┌──────────┐  ┌──────────┐
│ Config  │  │Connection│  │   SQL    │
│ Manager │  │ Manager  │  │  Execute │
└─────────┘  └──────────┘  └──────────┘
    │              │              │
    └──────────────┴──────────────┘
           │
           ▼
┌─────────────┐
│  addOutput  │  ← 更新 UI
└─────────────┘
```

### 5.2 自动补全流程

```
用户输入 + Tab
    │
    ▼
┌─────────────┐
│  判断上下文  │  ← 命令？表名？列名？
└─────────────┘
    │
    ├────────────┬────────────┐
    ▼            ▼            ▼
┌─────────┐  ┌──────────┐  ┌──────────┐
│ 命令补全 │  │ 表名补全 │  │ 列名补全 │
└─────────┘  └──────────┘  └──────────┘
    │            │            │
    └────────────┴────────────┘
           │
           ▼
┌─────────────┐
│Completion   │  ← 显示弹窗
│Popup        │
└─────────────┘
```

---

## 6. 测试策略

### 6.1 测试框架

**选择：** Jest + ts-jest

**理由：**
- TypeScript 原生支持
- 丰富的断言库
- 快照测试支持
- 覆盖率报告

### 6.2 测试分层

```
┌─────────────────────────────────────────┐
│           E2E 测试 (5%)                 │
│     完整用户流程测试                     │
└─────────────────────────────────────────┘
              ▲
┌─────────────────────────────────────────┐
│          集成测试 (25%)                 │
│   模块间交互测试                         │
│   - 命令 + 连接管理器                    │
│   - 配置 + 数据库驱动                    │
└─────────────────────────────────────────┘
              ▲
┌─────────────────────────────────────────┐
│          单元测试 (70%)                 │
│   单个函数/类测试                        │
│   - ConfigManager                       │
│   - ConnectionManager                   │
│   - CommandHandler                      │
│   - 各数据库驱动                         │
└─────────────────────────────────────────┘
```

### 6.3 质量门禁

| 指标 | 目标 | 检查方式 |
|------|------|----------|
| 测试覆盖率 | >80% | Jest --coverage |
| TypeScript 严格模式 | 启用 | tsconfig.json |
| ESLint | 无错误 | npm run lint |
| 构建 | 无警告 | npm run build |

---

## 7. 开发计划

### Phase 1: 架构设计 (当前)
- [x] 分析 Python 版功能
- [x] 设计 TypeScript 架构
- [x] 编写本文档

### Phase 2: 核心模块 (预计 3 天)
- [ ] 完善 ConfigManager
- [ ] 完善 ConnectionManager
- [ ] 完善 CommandHandler
- [ ] 完善 app.tsx 状态管理

### Phase 3: UI 组件 (预计 2 天)
- [ ] 优化 OutputDisplay
- [ ] 完善 CompletionPopup
- [ ] 实现语法高亮集成

### Phase 4: 数据库驱动 (预计 3 天)
- [ ] MySQL 驱动完善
- [ ] PostgreSQL 驱动完善
- [ ] SQLite 驱动完善

### Phase 5: 高级功能 (预计 3 天)
- [ ] /run 文件执行
- [ ] /batch 批量执行
- [ ] /explain 查询计划
- [ ] /export 导出功能
- [ ] 历史记录持久化

### Phase 6: 测试与质量 (预计 3 天)
- [ ] 配置 Jest
- [ ] 编写单元测试
- [ ] 编写集成测试
- [ ] 配置 CI 检查

### Phase 7: 清理与发布 (预计 1 天)
- [ ] 删除 Python 代码
- [ ] 更新文档
- [ ] 发布 v0.2.0

**总计预计：** 15 天

---

## 8. 风险与缓解

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| Ink 组件学习曲线 | 中 | 参考官方示例，先实现 MVP |
| 数据库驱动兼容性 | 中 | 优先实现 MySQL，再扩展 |
| 测试覆盖率不达标 | 低 | 早期配置覆盖率检查 |
| 性能问题 | 低 | 使用 better-sqlite3 同步 API |

---

## 9. 相关链接

- [Ink 文档](https://github.com/vadimdemedes/ink)
- [React 文档](https://react.dev)
- [TypeScript 文档](https://www.typescriptlang.org)
- [Jest 文档](https://jestjs.io)

---

**文档维护：** 随开发进度更新此文档，记录重大架构决策。
