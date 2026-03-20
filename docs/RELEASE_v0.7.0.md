# DBManager v0.7.0 发布说明

**发布日期：** 2026-03-20  
**版本：** v0.7.0  
**主题：** 真实云端服务 + AI 深度增强 + 团队协作

---

## 🎉 重大更新

v0.7.0 是 DBManager 迄今为止最重大的更新，引入了：

1. **真实云端服务** - Feishu/Notion 集成，多设备实时同步
2. **AI 深度增强** - LLM 集成，智能 NL2SQL
3. **团队协作** - 团队空间、共享书签库、模板市场

---

## 📦 新增功能

### Phase 1: Feishu 云文档集成 ☁️

**新增模块：** `FeishuCloudManager`

- ✅ Feishu OAuth 2.0 认证
- ✅ 云文档书签存储
- ✅ 实时同步和冲突解决
- ✅ 书签分享功能

**新命令：**
```bash
/cloud login --feishu                    # Feishu 登录
/cloud login --feishu --code=XXX         # 授权码登录
```

**配置：**
```json
{
  "feishu": {
    "appId": "cli_xxx",
    "appSecret": "xxx",
    "redirectUri": "http://localhost:3000/callback"
  }
}
```

---

### Phase 2: Notion 集成 🔗

**新增模块：** `NotionCloudManager`

- ✅ Notion API 对接
- ✅ Database 书签存储
- ✅ 双向同步

**配置：**
```json
{
  "notion": {
    "apiKey": "secret_xxx",
    "databaseId": "xxx"
  }
}
```

---

### Phase 3: LLM 集成 🤖

**新增模块：** `LLMManager`

支持三大 LLM 提供商：

| 提供商 | 模型 | 功能 |
|--------|------|------|
| Bailian | qwen-plus, qwen-max | NL2SQL, 解释，优化 |
| Claude | claude-3-sonnet, claude-3-opus | NL2SQL, 解释，优化 |
| OpenAI | gpt-4-turbo, gpt-3.5-turbo | NL2SQL, 解释，优化 |

**新命令：**
```bash
/ai ask "查询最近 7 天订单最多的用户"     # 自然语言转 SQL
/ai explain "SELECT * FROM users..."    # 解释 SQL
/ai optimize "SELECT * FROM orders..."  # 优化 SQL
/ai chat "如何优化慢查询？"             # AI 对话
```

**配置：**
```json
{
  "llm": {
    "provider": "bailian",
    "apiKey": "your-api-key",
    "model": "qwen-plus"
  }
}
```

**示例对话：**
```
用户：/ai ask 查询最近 7 天订单最多的前 10 个用户
AI:  ✅ 生成的 SQL:
     
     ```sql
     SELECT user_id, COUNT(*) as order_count
     FROM orders
     WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
     GROUP BY user_id
     ORDER BY order_count DESC
     LIMIT 10
     ```
     
     💡 说明：SQL 已生成，基于查询："查询最近 7 天订单最多的前 10 个用户"
     涉及表：orders
```

---

### Phase 4: 团队协作 👥

**新增模块：** `TeamManager`

- ✅ 团队空间管理
- ✅ 成员邀请和权限
- ✅ 共享书签库
- ✅ 活动日志审计
- ✅ 评论系统

**新命令：**
```bash
/team create <名称>                    # 创建团队
/team list                             # 查看团队
/team invite <团队 ID> <邮箱>          # 邀请成员
/team share <团队 ID> <书签 ID>        # 分享书签
/team logs <团队 ID> [数量]            # 活动日志
```

**权限级别：**
- `owner` - 团队所有者
- `admin` - 管理员
- `member` - 普通成员
- `viewer` - 只读访客

---

### Phase 5: 模板市场 🏪

**新增模块：** `TemplateMarketManager`

- ✅ 社区模板库 (内置 5 个模板)
- ✅ 浏览和搜索
- ✅ 一键安装
- ✅ 评分和收藏
- ✅ 分类和标签
- ✅ 导入导出

**新命令：**
```bash
/market browse [分类]                  # 浏览模板
/market search <关键词>                # 搜索模板
/market install <模板 ID>              # 安装模板
/market rate <模板 ID> <评分>          # 评分
/market categories                     # 查看分类
```

**内置模板分类：**
- `basic` - 基础查询
- `analytics` - 数据分析
- `advanced` - 高级查询
- `optimization` - 性能优化
- `maintenance` - 维护管理

**示例模板：**
1. 查询所有表
2. 表结构查询
3. 最近 N 条记录
4. 分组统计
5. JOIN 查询

---

## 🔧 技术改进

### CloudSyncManager 增强

- 云提供商抽象 (`CloudProvider = 'local' | 'feishu' | 'notion'`)
- 异步同步方法 (`uploadBookmarksAsync`, `downloadBookmarksAsync`, `syncAsync`)
- 向后兼容的本地模拟模式

### 新增依赖

```json
{
  "@lark-base-open/js-sdk": "^1.0.0",
  "@notionhq/client": "^2.2.0",
  "axios": "^1.6.0"
}
```

---

## 📊 测试覆盖

**测试文件：** `test-v0.7.0-complete.js`

| 测试类别 | 用例数 | 通过率 |
|---------|--------|--------|
| Phase 1: Feishu | 4 | 100% |
| Phase 2: Notion | 3 | 100% |
| Phase 3: LLM | 5 | 100% |
| Phase 4: 团队 | 7 | 100% |
| Phase 5: 模板 | 10 | 100% |
| CloudSync | 5 | 100% |
| **总计** | **34** | **100%** |

---

## 📝 升级指南

### 从 v0.6.0 升级

```bash
# 1. 备份配置
cp ~/.dbmanager/config.json ~/.dbmanager/config.json.bak

# 2. 更新依赖
cd /path/to/dbmanager
npm install

# 3. 重新编译
npm run build

# 4. 验证安装
node dist/main.js --version
```

### 配置文件更新

v0.7.0 支持以下新配置项：

```json
{
  "feishu": {
    "appId": "cli_xxx",
    "appSecret": "xxx",
    "redirectUri": "http://localhost:3000/callback"
  },
  "notion": {
    "apiKey": "secret_xxx",
    "databaseId": "xxx"
  },
  "llm": {
    "provider": "bailian",
    "apiKey": "your-api-key",
    "model": "qwen-plus"
  }
}
```

---

## ⚠️ 已知问题

### 当前限制

1. **Token 持久化** - Feishu/Notion Token 重启后需要重新登录
2. **LLM 成本** - API 调用可能产生费用，建议设置使用限额
3. **团队权限** - 当前为简化实现，完整权限系统将在 v0.8.0 实现

### 待优化

- WebSocket 实时同步 (当前为轮询)
- Token 加密存储
- 离线模式自动同步
- 复杂冲突解决策略

---

## 🚀 后续计划

### v0.7.1 (补丁版本)
- [ ] Token 加密存储
- [ ] 自动同步优化
- [ ] Bug 修复

### v0.8.0 (下一版本)
- [ ] 性能优化 (Phase 6)
- [ ] 完整的权限管理系统
- [ ] 浏览器扩展 (Web Clipper)
- [ ] 移动端支持

---

## 📈 版本对比

| 维度 | v0.6.0 | v0.7.0 |
|------|--------|--------|
| 云端存储 | 本地模拟 | Feishu/Notion 真实服务 |
| AI 能力 | 规则引擎 | LLM 驱动 (3 提供商) |
| 协作 | 单机 | 团队共享 |
| 模板 | 内置 14 个 | 社区市场 + 内置 |
| 同步 | 本地文件 | 实时云端 |
| 命令数 | 20+ | 35+ |
| 代码行数 | ~8000 | ~15000 |

---

## 🙏 致谢

感谢所有参与测试和提供反馈的用户！

---

## 📄 完整变更日志

```
feat(v0.7.0): Phase 1 完成 - Feishu 云文档集成 ✅
feat(v0.7.0): Phase 2-5 完成 - 完整功能实现 ✅
docs: v0.7.0 开发规划 ✅
```

---

<div align="center">
  <strong>🎉 v0.7.0 正式发布！</strong>
</div>

<div align="center">
  
[下载 v0.7.0](https://github.com/dbmanager/dbmanager/releases/tag/v0.7.0) | [完整文档](./USAGE.md) | [问题反馈](https://github.com/dbmanager/dbmanager/issues)

</div>
