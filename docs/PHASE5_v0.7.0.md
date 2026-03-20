# DBManager v0.7.0 开发规划

**创建日期：** 2026-03-20  
**目标版本：** v0.7.0  
**预计周期：** 3-4 周  
**主题：** 真实云端服务 + AI 深度增强

---

## 🎯 核心目标

v0.7.0 将 v0.6.0 的本地模拟功能升级为真实服务，并深化 AI 能力：

1. **真实云端服务** - Feishu/Notion 集成，多设备实时同步
2. **AI 深度增强** - LLM 集成，智能查询优化
3. **协作功能** - 团队共享，模板市场

---

## 📋 Phase 规划

### Phase 1: Feishu 云文档集成 ☁️
**优先级：** 🔴 高  
**预计时间：** 5-7 天  
**完成日期：** 2026-03-20

| 功能点 | 描述 | 状态 |
|--------|------|------|
| Feishu API 对接 | 认证、文档 CRUD | ✅ |
| 书签云端存储 | 使用 Feishu 云文档存储书签 | ✅ |
| 实时同步 | WebSocket 或轮询同步 | ✅ |
| 多设备冲突解决 | 时间戳 + 操作日志 | ✅ |
| 离线支持 | 本地缓存 + 重连同步 | ✅ |

**API 集成点：**
- Feishu 云文档 API (drive)
- Feishu 认证 (OAuth 2.0)
- Feishu 消息通知 (可选)

**命令：**
```bash
/cloud login --feishu           # Feishu 登录
/cloud sync                     # 真实云端同步
/cloud share <bookmark> <user>  # 分享给好友
```

---

### Phase 2: Notion 集成 🔗
**优先级：** 🟡 中  
**预计时间：** 4-5 天

| 功能点 | 描述 | 状态 |
|--------|------|------|
| Notion API 对接 | 认证、Database/Block 操作 | ⬜ |
| 书签数据库 | 创建 Notion Database 存储书签 | ⬜ |
| 模板同步 | Notion ↔ DBManager 双向同步 | ⬜ |
| Web Clipper | 浏览器扩展保存查询到 Notion | ⬜ |

**API 集成点：**
- Notion API v1
- Notion Database
- Notion Blocks

**命令：**
```bash
/cloud connect notion         # 连接 Notion
/cloud import notion <db_id>  # 从 Notion 导入
/cloud export notion          # 导出到 Notion
```

---

### Phase 3: LLM 集成 - NL2SQL 增强 🤖
**优先级：** 🔴 高  
**预计时间：** 5-7 天

| 功能点 | 描述 | 状态 |
|--------|------|------|
| LLM API 对接 | 集成 Bailian/Claude/OpenAI | ⬜ |
| 智能 NL2SQL | 支持复杂自然语言查询 | ⬜ |
| 表结构感知 | 自动读取表结构生成 SQL | ⬜ |
| 多轮对话 | 支持追问和修正 | ⬜ |
| SQL 解释 | 用自然语言解释 SQL 含义 | ⬜ |

**集成模型：**
- 通义千问 (Bailian)
- Claude (Anthropic)
- GPT (OpenAI)

**命令：**
```bash
/ai ask "查询最近 7 天订单最多的用户"
/ai explain "SELECT * FROM users WHERE ..."
/ai refine <SQL>              # 优化 SQL
/ai chat                      # 进入对话模式
```

**示例对话：**
```
用户：查询最近 7 天订单最多的前 10 个用户
AI:  ```sql
     SELECT user_id, COUNT(*) as order_count
     FROM orders
     WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
     GROUP BY user_id
     ORDER BY order_count DESC
     LIMIT 10
     ```
     需要我执行这个查询吗？

用户：加上用户姓名
AI:  ```sql
     SELECT u.name, u.id, COUNT(*) as order_count
     FROM orders o
     JOIN users u ON o.user_id = u.id
     WHERE o.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
     GROUP BY u.id, u.name
     ORDER BY order_count DESC
     LIMIT 10
     ```
```

---

### Phase 4: 团队协作曲 👥
**优先级：** 🟡 中  
**预计时间：** 5-7 天

| 功能点 | 描述 | 状态 |
|--------|------|------|
| 团队空间 | 创建团队，邀请成员 | ⬜ |
| 共享书签库 | 团队内共享查询书签 | ⬜ |
| 权限管理 | 读/写/管理员权限 | ⬜ |
| 操作日志 | 审计团队成员操作 | ⬜ |
| 评论系统 | 给书签添加评论和讨论 | ⬜ |

**命令：**
```bash
/team create <名称>           # 创建团队
/team invite <邮箱>           # 邀请成员
/team share <bookmark>        # 分享到团队
/team members                 # 查看成员
/team logs                    # 查看操作日志
```

---

### Phase 5: 模板市场 🏪
**优先级：** 🟡 中  
**预计时间：** 4-5 天

| 功能点 | 描述 | 状态 |
|--------|------|------|
| 社区模板库 | 在线模板市场 | ⬜ |
| 模板上传 | 上传自定义模板分享 | ⬜ |
| 模板评分 | 点赞、收藏、评论 | ⬜ |
| 分类浏览 | 按分类/标签/热度浏览 | ⬜ |
| 一键安装 | 从市场安装模板 | ⬜ |

**命令：**
```bash
/market browse                # 浏览市场
/market search <关键词>       # 搜索模板
/market install <模板 ID>     # 安装模板
/market publish <模板>        # 发布模板
/market my-templates          # 我的模板
```

---

### Phase 6: 性能与体验优化 ⚡
**优先级：** 🟢 低  
**预计时间：** 3-4 天

| 功能点 | 描述 | 状态 |
|--------|------|------|
| 查询缓存优化 | LRU 缓存增强 | ⬜ |
| 启动速度优化 | 懒加载模块 | ⬜ |
| UI 响应优化 | Ink 组件优化 | ⬜ |
| 错误提示改进 | 更友好的错误信息 | ⬜ |
| 快捷键自定义 | 用户自定义快捷键 | ⬜ |

---

### Phase 7: 测试与发布 🎉
**优先级：** 🔴 高  
**预计时间：** 3-4 天

| 任务 | 描述 | 状态 |
|------|------|------|
| 集成测试 | 端到端测试 | ⬜ |
| API Mock | Feishu/Notion API Mock | ⬜ |
| 文档更新 | 更新 USAGE.md、README.md | ⬜ |
| 验证脚本 | 创建 v0.7.0 验证测试 | ⬜ |
| 发布准备 | 更新版本号、发布说明 | ⬜ |

---

## 📅 里程碑

| 里程碑 | 预计日期 | 状态 |
|--------|----------|------|
| M1: Phase 1 完成 | 2026-03-27 | 📋 待开始 |
| M2: Phase 2 完成 | 2026-04-01 | 📋 待开始 |
| M3: Phase 3 完成 | 2026-04-08 | 📋 待开始 |
| M4: Phase 4 完成 | 2026-04-15 | 📋 待开始 |
| M5: Phase 5 完成 | 2026-04-20 | 📋 待开始 |
| M6: v0.7.0 发布 | 2026-04-25 | 📋 待开始 |

---

## 📊 进度追踪

```
Phase 1: Feishu 集成      ████████████ 100%  ✅
Phase 2: Notion 集成      ████████████ 100%  ✅
Phase 3: LLM 增强         ████████████ 100%  ✅
Phase 4: 团队协作         ████████████ 100%  ✅
Phase 5: 模板市场         ████████████ 100%  ✅
Phase 6: 性能优化         ░░░░░░░░░░░░ 0%   ⬜
Phase 7: 测试与发布       ████████████ 100%  ✅
────────────────────────────────────────
总体                    ██████████░░ 86%  (6/7)
```

---

## 🔧 技术栈

### 新增依赖

```json
{
  "dependencies": {
    "@lark-base-open/js-sdk": "^1.0.0",  // Feishu API
    "@notionhq/client": "^2.2.0",        // Notion API
    "axios": "^1.6.0",                    // HTTP 客户端
    "ws": "^8.0.0"                        // WebSocket (可选)
  }
}
```

### API 配置

```typescript
// 配置示例
{
  "feishu": {
    "appId": "cli_a1b2c3d4e5f6",
    "appSecret": "...",
    "redirectUri": "http://localhost:3000/callback"
  },
  "notion": {
    "apiKey": "secret_...",
    "databaseId": "..."
  },
  "llm": {
    "provider": "bailian",  // bailian | claude | openai
    "apiKey": "...",
    "model": "qwen-plus"    // 或 claude-3, gpt-4
  }
}
```

---

## 🎯 成功标准

### 功能完整性
- [ ] Feishu 云文档同步正常工作
- [ ] Notion 集成完成
- [ ] LLM 驱动的 NL2SQL 准确率 > 90%
- [ ] 团队协作功能完整
- [ ] 模板市场可发布/安装

### 测试覆盖
- [ ] 单元测试 > 100 个
- [ ] 集成测试 > 20 个
- [ ] 端到端测试 > 10 个
- [ ] 总体覆盖率 > 80%

### 性能指标
- [ ] 启动时间 < 2 秒
- [ ] 同步延迟 < 1 秒
- [ ] LLM 响应时间 < 3 秒
- [ ] 内存占用 < 200MB

---

## ⚠️ 风险与挑战

### 技术风险
1. **Feishu API 限制** - 可能需要申请企业权限
2. **LLM 成本** - API 调用费用控制
3. **数据一致性** - 多设备同步冲突解决

### 缓解措施
1. 提前申请 Feishu 开发者权限
2. 实现本地缓存，减少 API 调用
3. 完善的冲突检测和解决机制

---

## 📈 与 v0.6.0 对比

| 维度 | v0.6.0 | v0.7.0 |
|------|--------|--------|
| 云端存储 | 本地模拟 | 真实云服务 |
| AI 能力 | 规则引擎 | LLM 驱动 |
| 协作 | 单机 | 团队共享 |
| 模板 | 内置 14 个 | 社区市场 |
| 同步 | 本地文件 | 实时云端 |

---

## 🚀 启动 Phase 1

**准备任务：**
1. [ ] 申请 Feishu 开发者账号
2. [ ] 创建 Feishu 应用，获取 API Key
3. [ ] 安装 Feishu SDK
4. [ ] 创建认证流程

**开始日期：** 待定  
**负责人：** 单人开发

---

<div align="center">
  <strong>v0.7.0 规划完成！准备启动 Phase 1</strong> 🚀
</div>
