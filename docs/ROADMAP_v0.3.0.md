# DBManager v0.3.0 开发规划

**目标版本：** v0.3.0  
**预计周期：** 2-3 周  
**优先级：** P0 (高) → P2 (低)

---

## 🎯 核心目标

1. **完善自动补全** - 表名、列名、关键字智能补全
2. **提升用户体验** - 更好的交互、更智能的提示
3. **增强功能** - Web UI、插件系统等

---

## 📋 功能清单

### Phase 1: 自动补全增强 (预计 5 天)

#### P0 - 核心补全

| 功能 | 描述 | 优先级 |
|------|------|--------|
| 命令补全 | `/` 开头显示命令列表 | ✅ 已完成 |
| 表名补全 | `FROM ` / `JOIN ` 后补全表名 | P0 |
| 列名补全 | `SELECT ` / `WHERE ` 后补全列名 | P0 |
| 关键字补全 | SQL 关键字智能提示 | P1 |

#### 实现方案

```typescript
// 补全触发逻辑
interface CompletionContext {
  input: string;           // 当前输入
  cursorPosition: number;  // 光标位置
  previousToken: string;   // 前一个 token
  currentToken: string;    // 当前 token
}

class CompletionEngine {
  // 根据上下文判断补全类型
  getCompletions(context: CompletionContext): CompletionItem[];
  
  // 缓存元数据
  cacheTableMetadata(dbName: string): Promise<void>;
  
  // 智能排序（常用优先）
  rankCompletions(items: CompletionItem[], history: string[]): CompletionItem[];
}
```

#### 交付物

- [ ] `src/ts/cli/completer.ts` - 补全引擎
- [ ] 元数据缓存机制
- [ ] 模糊匹配支持

---

### Phase 2: 用户体验优化 (预计 4 天)

#### P0 - 交互改进

| 功能 | 描述 | 优先级 |
|------|------|--------|
| 语法高亮 | 实时 SQL 语法高亮 | P0 |
| 命令历史搜索 | Ctrl+R 搜索历史命令 | P0 |
| 多行编辑 | 支持多行 SQL 编辑 | P1 |
| 智能提示 | 错误检测和建议 | P1 |

#### 实现方案

```typescript
// 实时高亮集成到 TextInput
interface SqlInputProps {
  value: string;
  onChange: (value: string) => void;
  highlighter: SqlHighlighter;
  completer: CompletionEngine;
}

// 错误检测
interface SqlValidator {
  validate(sql: string): ValidationError[];
  getSuggestions(error: ValidationError): string[];
}
```

#### 交付物

- [ ] 实时语法高亮
- [ ] 历史搜索功能
- [ ] 错误提示系统

---

### Phase 3: 高级功能 (预计 5 天)

#### P1 - 功能增强

| 功能 | 描述 | 优先级 |
|------|------|--------|
| 查询结果分页 | 大数据集分页显示 | P1 |
| 结果排序/过滤 | 对查询结果二次处理 | P1 |
| 查询收藏夹 | 保存常用查询 | P2 |
| 查询模板 | 预定义查询模板 | P2 |

#### 实现方案

```typescript
// 结果分页
interface PaginatedResult {
  data: unknown[][];
  totalRows: number;
  currentPage: number;
  pageSize: number;
  totalPages: number;
}

// 查询收藏
interface SavedQuery {
  id: string;
  name: string;
  sql: string;
  tags: string[];
  createdAt: Date;
  lastUsed?: Date;
}
```

#### 交付物

- [ ] 分页组件
- [ ] 收藏夹管理
- [ ] 模板系统

---

### Phase 4: Web UI (可选) (预计 7 天)

#### P2 - 图形界面

| 功能 | 描述 | 优先级 |
|------|------|--------|
| Web 服务器 | HTTP API + Web 界面 | P2 |
| 响应式设计 | 支持桌面和移动端 | P2 |
| 实时协作 | 多用户共享会话 | P3 |

#### 技术选型

```
方案 A: Electron
- 优点：跨平台、接近原生体验
- 缺点：包体积大、资源占用高

方案 B: Tauri
- 优点：轻量、安全、Rust 后端
- 缺点：生态较新

方案 C: Web + 本地 API
- 优点：灵活、易部署
- 缺点：需要额外配置
```

#### 交付物

- [ ] Web 服务器
- [ ] 基础 Web UI
- [ ] REST API

---

### Phase 5: 插件系统 (预计 5 天)

#### P2 - 扩展性

| 功能 | 描述 | 优先级 |
|------|------|--------|
| 插件 API | 定义插件接口 | P2 |
| 插件市场 | 插件发现和安装 | P3 |
| 自定义命令 | 用户自定义命令 | P2 |

#### 实现方案

```typescript
// 插件接口
interface DBManagerPlugin {
  name: string;
  version: string;
  
  // 生命周期
  onLoad?(app: AppContext): void;
  onUnload?(): void;
  
  // 扩展命令
  commands?: CommandDefinition[];
  
  // 扩展补全
  completions?: CompletionProvider[];
}

// 插件注册
class PluginManager {
  register(plugin: DBManagerPlugin): void;
  unregister(name: string): void;
  list(): DBManagerPlugin[];
}
```

#### 交付物

- [ ] 插件系统核心
- [ ] 示例插件
- [ ] 插件文档

---

## 📅 时间规划

| 阶段 | 内容 | 预计时间 | 完成日期 |
|------|------|----------|----------|
| Phase 1 | 自动补全增强 | 5 天 | 2026-03-22 |
| Phase 2 | 用户体验优化 | 4 天 | 2026-03-28 |
| Phase 3 | 高级功能 | 5 天 | 2026-04-04 |
| Phase 4 | Web UI (可选) | 7 天 | 2026-04-14 |
| Phase 5 | 插件系统 | 5 天 | 2026-04-21 |

**总计：** 26 天（不含周末约 5 周）

---

## 🎯 里程碑

### M1: 补全完成 (2026-03-22)
- [ ] 表名补全可用
- [ ] 列名补全可用
- [ ] 元数据缓存正常

### M2: 体验优化完成 (2026-03-28)
- [ ] 语法高亮实时工作
- [ ] 历史搜索可用
- [ ] 错误提示准确

### M3: v0.3.0 发布 (2026-04-04)
- [ ] 所有 P0 功能完成
- [ ] 测试覆盖率 >80%
- [ ] 文档完善

---

## 📊 成功指标

| 指标 | 目标 | 当前 |
|------|------|------|
| 测试覆盖率 | >80% | 70% |
| 补全响应时间 | <50ms | - |
| 用户满意度 | >4.5/5 | - |
| Bug 数量 | <10 | - |

---

## 🔗 相关链接

- [v0.2.0 发布说明](./RELEASE_v0.2.0.md)
- [架构设计](./ARCHITECTURE.md)
- [功能规格](./SPEC.md)

---

**最后更新：** 2026-03-15
