# v0.4.0 开发日志

**启动日期：** 2026-03-15  
**当前阶段：** Phase 1 (Web UI 增强)

---

## 开发进度

### Phase 1: Web UI 增强 (2026-03-15 ~ 2026-03-21)

#### 任务清单

- [ ] 多标签页支持
  - [ ] TabBar 组件
  - [ ] 标签切换逻辑
  - [ ] 标签关闭/新建
- [ ] 结果导出功能
  - [ ] CSV 导出
  - [ ] JSON 导出
  - [ ] Excel 导出
- [ ] 配置管理页面
  - [ ] 配置列表展示
  - [ ] 添加/编辑配置
  - [ ] 测试连接
- [ ] API 扩展
  - [ ] `/api/tabs` 端点
  - [ ] `/api/export` 端点
  - [ ] `/api/configs` CRUD

#### 技术设计

**多标签页架构：**
```typescript
interface TabManager {
  tabs: Map<string, QueryTab>;
  activeTabId: string | null;
  
  createTab(configId: string): string;
  closeTab(tabId: string): void;
  switchTab(tabId: string): void;
  executeInTab(tabId: string, sql: string): Promise<QueryResult>;
}

interface QueryTab {
  id: string;
  title: string;
  configId: string;
  history: QueryHistory[];
  currentSql: string;
  lastResult?: QueryResult;
}
```

**导出功能设计：**
```typescript
interface ExportManager {
  export(result: QueryResult, format: ExportFormat): Buffer;
  download(fileId: string): Promise<Buffer>;
}

type ExportFormat = 'csv' | 'json' | 'excel' | 'markdown';
```

---

## 提交记录

| 日期 | 提交 | 说明 |
|------|------|------|
| 2026-03-15 | - | 启动 v0.4.0 开发 |

---

## 遇到的问题

_开发过程中记录_

---

## 下一步计划

1. 创建 Web UI 基础组件结构
2. 实现 TabBar 组件
3. 添加标签管理 API

---

**最后更新：** 2026-03-15
