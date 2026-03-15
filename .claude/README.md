# Claude Code 配置说明

## 当前配置结构

### 1. 项目配置 (`.claude/settings.json`)
本项目 (`dbmanager`) 的专属配置

### 2. 本地配置 (`.claude/settings.local.json`)
本地开发环境配置（包含 MCP 服务器等）

---

## 权限模式说明

| 模式 | 说明 | 推荐场景 |
|------|------|----------|
| `default` | 读取操作自动批准，修改操作需确认 | **日常开发（推荐）** |
| `plan` | 先规划再执行，重大操作需批准 | 大型重构 |
| `ask` | 几乎每个操作都需要确认 | 审查代码时 |

---

## 自动批准的操作

- `Read` - 读取文件
- `Glob` - 文件搜索
- `Grep` - 内容搜索
- `TaskList` - 任务列表
- `TaskGet` - 获取任务详情

## 需要确认的操作

- `Edit` - 编辑文件
- `Write` - 写入文件
- `Bash` - 执行 shell 命令
- `TaskCreate` - 创建任务
- `TaskUpdate` - 更新任务

---

## 安全设置

### 禁止访问的模式
以下文件类型将被阻止访问：
- `.env` 环境变量文件
- `credentials.*` 凭证文件
- `secrets.*` 密钥文件
- `*.key` 私钥文件
- `*.pem` 证书文件

### 允许的路径
仅限于 `/Users/cq/Documents/git/dbmanager` 目录

---

## 自定义配置

### 添加自动批准的命令
```json
{
  "permissions": {
    "auto_approve": [
      "Bash(python3 --version)"
    ]
  }
}
```

### 添加 MCP 服务器
```json
{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem"]
    }
  }
}
```

---

## 最佳实践

1. **不要删除 `require_approval` 中的 `Bash`** - 防止意外执行危险命令
2. **定期审查配置** - 检查是否有不必要的自动批准
3. **敏感信息隔离** - 确保凭证文件不在允许路径内
4. **使用项目配置** - 不同项目可以有不同安全级别
