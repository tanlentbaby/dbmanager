# DBManager v0.4.0 开发规划

**目标版本：** v0.4.0  
**启动日期：** 2026-03-15  
**预计周期：** 3-4 周  
**优先级：** P0 (高) → P2 (低)

---

## 🎯 核心目标

1. **Web UI 增强** - 从基础查询到完整管理界面
2. **性能优化** - 补全引擎、查询执行、内存管理
3. **可视化增强** - 查询计划、数据图表
4. **插件生态** - 更多内置插件，完善插件 API

---

## 📋 功能清单

### Phase 1: Web UI 增强 (预计 6 天)

#### P0 - 核心功能完善

| 功能 | 描述 | 优先级 |
|------|------|--------|
| 多标签页 | 同时打开多个查询窗口 | P0 |
| 查询历史 | Web 界面查看执行历史 | P0 |
| 结果导出 | CSV/JSON/Excel 导出 | P0 |
| 配置管理 | Web 界面管理数据库配置 | P1 |

#### P1 - 高级功能

| 功能 | 描述 | 优先级 |
|------|------|--------|
| 查询收藏同步 | 与 CLI 共享收藏夹 | P1 |
| 快捷操作 | 常用操作一键执行 | P2 |
| 主题切换 | 深色/浅色主题 | P2 |

#### 实现方案

```typescript
// Web 前端架构
interface WebUI {
  // 多标签管理
  tabs: QueryTab[];
  activeTab: string;
  
  // 查询执行
  executeQuery(sql: string, configId: string): Promise<QueryResult>;
  
  // 结果处理
  exportResult(format: 'csv' | 'json' | 'excel'): void;
}

// REST API 扩展
interface WebAPI {
  // 标签管理
  GET  /api/tabs
  POST /api/tabs
  DELETE /api/tabs/:id
  
  // 导出
  POST /api/export
  GET  /api/export/:id/download
  
  // 历史
  GET /api/history
  GET /api/history/:id
}
```

#### 交付物

- [ ] `src/web/components/TabBar.tsx` - 标签栏组件
- [ ] `src/web/components/ResultExport.tsx` - 导出组件
- [ ] `src/web/routes/configs.tsx` - 配置管理页面
- [ ] `src/web/api/tabs.ts` - 标签 API
- [ ] `src/web/api/export.ts` - 导出 API

---

### Phase 2: 性能优化 (预计 5 天)

#### P0 - 补全引擎优化

| 功能 | 描述 | 优先级 |
|------|------|--------|
| 元数据预加载 | 连接时预加载表结构 | P0 |
| 增量补全 | 只补全变化部分 | P0 |
| 智能缓存 | LRU 缓存 + TTL | P0 |
| 异步补全 | 不阻塞主线程 | P1 |

#### P1 - 查询性能

| 功能 | 描述 | 优先级 |
|------|------|--------|
| 连接池优化 | 动态调整池大小 | P1 |
| 查询超时 | 可配置的超时时间 | P0 |
| 结果流式传输 | 大数据集流式返回 | P1 |

#### 实现方案

```typescript
// 智能缓存
interface MetadataCache {
  // LRU 缓存
  cache: LRUCache<string, TableMetadata>;
  
  // 预加载
  preload(database: string): Promise<void>;
  
  // 增量更新
  invalidate(table: string): void;
  refresh(table: string): Promise<void>;
}

// 异步补全
class AsyncCompletionEngine {
  // 后台预加载
  private worker: Worker;
  
  // 非阻塞补全
  async getCompletions(context: CompletionContext): Promise<CompletionItem[]>;
  
  // 取消机制
  cancel(): void;
}
```

#### 交付物

- [ ] `src/ts/utils/cache.ts` - LRU 缓存实现
- [ ] `src/ts/cli/completer.async.ts` - 异步补全引擎
- [ ] `src/ts/database/pool.optimized.ts` - 优化连接池
- [ ] 性能基准测试

---

### Phase 3: 可视化增强 (预计 6 天)

#### P0 - 查询计划可视化

| 功能 | 描述 | 优先级 |
|------|------|--------|
| EXPLAIN 解析 | 解析查询计划 | P0 |
| 树形展示 | 可视化执行计划树 | P0 |
| 成本估算 | 显示各节点成本 | P1 |
| 优化建议 | 基于计划的建议 | P1 |

#### P1 - 数据图表

| 功能 | 描述 | 优先级 |
|------|------|--------|
| 简单图表 | 柱状图/折线图/饼图 | P1 |
| 数据透视 | 交叉表分析 | P2 |
| 趋势分析 | 时间序列可视化 | P2 |

#### 实现方案

```typescript
// 查询计划解析
interface ExplainParser {
  // 解析 EXPLAIN 输出
  parse(explainResult: ExplainRow[]): ExecutionPlan;
  
  // 生成可视化树
  toTree(plan: ExecutionPlan): PlanNode;
  
  // 优化建议
  suggest(plan: ExecutionPlan): OptimizationSuggestion[];
}

// 图表组件
interface ChartComponent {
  type: 'bar' | 'line' | 'pie' | 'scatter';
  data: ChartData;
  options: ChartOptions;
  
  render(): void;
  export(format: 'png' | 'svg'): Buffer;
}
```

#### 交付物

- [ ] `src/ts/utils/explain.ts` - EXPLAIN 解析器
- [ ] `src/web/components/ExplainTree.tsx` - 执行计划树
- [ ] `src/web/components/Charts.tsx` - 图表组件
- [ ] `src/ts/utils/optimizer.ts` - 优化建议引擎

---

### Phase 4: 插件生态 (预计 5 天)

#### P0 - 内置插件

| 插件 | 功能 | 优先级 |
|------|------|--------|
| schema-plugin | 数据库 schema 浏览 | P0 |
| backup-plugin | 备份/恢复 | P0 |
| migrate-plugin | 简单迁移管理 | P1 |
| monitor-plugin | 连接/查询监控 | P1 |

#### P1 - 插件 API 增强

| 功能 | 描述 | 优先级 |
|------|------|--------|
| UI 扩展点 | 插件可添加 UI 组件 | P1 |
| 事件钩子 | 查询前后钩子 | P1 |
| 配置 UI | 插件配置界面 | P2 |

#### 实现方案

```typescript
// 内置插件示例
export const schemaPlugin: DBManagerPlugin = {
  name: 'schema',
  version: '1.0.0',
  
  commands: [
    {
      name: '/schema',
      description: '查看数据库 schema',
      handler: async (args, context) => {
        const tables = await context.db.getTables();
        return renderSchemaTree(tables);
      }
    },
    {
      name: '/schema:table <name>',
      description: '查看表详细结构',
      handler: async (args, context) => {
        const columns = await context.db.getColumns(args[0]);
        return renderTableSchema(columns);
      }
    }
  ],
  
  completions: [
    {
      trigger: '/schema:',
      provider: async (input) => {
        const tables = await context.db.getTables();
        return tables.map(t => t.name);
      }
    }
  ]
};

// 事件钩子
interface PluginHooks {
  onBeforeQuery?(sql: string): Promise<void>;
  onAfterQuery?(result: QueryResult): Promise<void>;
  onConnect?(config: DatabaseConfig): Promise<void>;
  onDisconnect?(): Promise<void>;
}
```

#### 交付物

- [ ] `src/plugins/schema/index.ts` - Schema 插件
- [ ] `src/plugins/backup/index.ts` - 备份插件
- [ ] `src/plugins/migrate/index.ts` - 迁移插件
- [ ] `src/plugins/monitor/index.ts` - 监控插件
- [ ] 插件开发文档更新

---

### Phase 5: 其他改进 (预计 3 天)

#### P1 - 用户体验

| 功能 | 描述 | 优先级 |
|------|------|--------|
| 命令别名 | 自定义命令快捷方式 | P1 |
| 启动配置 | 启动时自动连接 | P1 |
| 日志系统 | 结构化日志 | P1 |

#### P2 - 开发者体验

| 功能 | 描述 | 优先级 |
|------|------|--------|
| Debug 模式 | 详细调试输出 | P2 |
| 性能分析 | 内置性能分析工具 | P2 |

---

## 📅 时间规划

| 阶段 | 内容 | 预计时间 | 完成日期 |
|------|------|----------|----------|
| Phase 1 | Web UI 增强 | 6 天 | 2026-03-21 |
| Phase 2 | 性能优化 | 5 天 | 2026-03-26 |
| Phase 3 | 可视化增强 | 6 天 | 2026-04-01 |
| Phase 4 | 插件生态 | 5 天 | 2026-04-06 |
| Phase 5 | 其他改进 | 3 天 | 2026-04-09 |

**总计：** 25 天（约 5 周）

---

## 🎯 里程碑

### M1: Web UI 完成 (2026-03-21)
- [ ] 多标签页可用
- [ ] 导出功能正常
- [ ] 配置管理页面完成

### M2: 性能达标 (2026-03-26)
- [ ] 补全响应 <50ms
- [ ] 元数据缓存命中率 >90%
- [ ] 大数据集流式传输正常

### M3: 可视化完成 (2026-04-01)
- [ ] EXPLAIN 可视化可用
- [ ] 基础图表组件完成
- [ ] 优化建议准确

### M4: v0.4.0 发布 (2026-04-09)
- [ ] 所有 P0 功能完成
- [ ] 测试覆盖率 >75%
- [ ] 文档完善
- [ ] 4 个内置插件可用

---

## 📊 成功指标

| 指标 | 当前 (v0.3.0) | 目标 (v0.4.0) |
|------|---------------|---------------|
| 测试覆盖率 | ~72% | >75% |
| 补全响应时间 | ~100ms | <50ms |
| Web UI 功能 | 基础查询 | 完整管理 |
| 内置插件 | 1 个示例 | 4 个实用插件 |
| 支持数据库 | MySQL/PG/SQLite | + Oracle/SQLServer |

---

## 🔧 技术债务

| 问题 | 影响 | 解决方案 |
|------|------|----------|
| Web UI 功能有限 | 用户体验不完整 | Phase 1 解决 |
| 补全性能待优化 | 大表补全慢 | Phase 2 解决 |
| 插件文档不足 | 开发者难以上手 | Phase 4 解决 |
| 缺少可视化 | 查询计划难理解 | Phase 3 解决 |

---

## 🚀 发布计划

### v0.4.0-alpha (2026-03-28)
- Phase 1 + Phase 2 完成
- 内部测试

### v0.4.0-beta (2026-04-05)
- Phase 3 + Phase 4 完成
- 公开测试

### v0.4.0-rc (2026-04-08)
- 修复关键 Bug
- 文档完善

### v0.4.0 (2026-04-09)
- 正式发布

---

## 🔗 相关链接

- [v0.3.0 发布说明](./RELEASE_v0.3.0.md)
- [v0.3.0 开发规划](./ROADMAP_v0.3.0.md)
- [架构设计](./ARCHITECTURE.md)
- [插件开发指南](./PLUGIN_DEV.md) - 待创建

---

**最后更新：** 2026-03-15
