# 快速开始指南

## 安装

### 开发安装

```bash
# 克隆项目
cd dbmanager

# 创建虚拟环境 (推荐)
python3 -m venv venv
source venv/bin/activate  # macOS/Linux
# 或
venv\Scripts\activate     # Windows

# 安装依赖
pip install -e .

# 或安装开发依赖
pip install -e ".[dev]"
```

### 直接运行

```bash
# 不使用安装，直接运行
python3 src/main.py
```

## 使用

### 启动程序

安装后，可以使用以下命令启动：

```bash
dbmanager
# 或
dbm
```

开发中可以直接运行：

```bash
python3 src/main.py
# 或
python3 -m src.main
```

### 启动参数

```bash
# 显示帮助
dbmanager --help
# 或
python3 src/main.py --help

# 显示版本
dbmanager --version
# 或
python3 src/main.py --version
```

### 基本流程

1. **添加数据库配置**

```
sql> /config add

? 实例名称：local_mysql
? 数据库类型：mysql
? 主机地址：localhost
? 端口：3306
? 用户名：root
? 密码：******
? 默认数据库：test
```

2. **连接到数据库**

```
sql> /connect local_mysql
✓ 已连接到 local_mysql
```

3. **执行 SQL**

```
sql> SELECT * FROM users LIMIT 10;

┏━━━━┳━━━━━━━━━━┳━━━━━━━━━━━━━━━━━┓
┃ id ┃ username ┃ email           ┃
┣━━━━╇━━━━━━━━━━╇━━━━━━━━━━━━━━━━━┫
┃ 1  ┃ admin    ┃ admin@test.com  ┃
┃ ...                              ┃
┗━━━━┻━━━━━━━━━━┻━━━━━━━━━━━━━━━━━┛
```

4. **查看表结构**

```
sql> /desc users
```

5. **列出所有表**

```
sql> /ls
```

## 快捷键

| 快捷键 | 功能 |
|--------|------|
| `Tab` | 自动补全 |
| `Ctrl+C` | 取消 |
| `Ctrl+D` | 退出 |
| `Ctrl+L` | 清屏 |
| `↑/↓` | 历史命令 |
| `Ctrl+R` | 搜索历史 |

## 命令速查

```
/config add          添加配置
/config list         列出配置
/connect <name>      连接数据库
/list, /ls           列出所有表
/desc <table>        查看表结构
/help                帮助
/quit                退出
```

## 运行测试

```bash
pytest tests/ -v
```

## 项目结构

```
dbmanager/
├── src/
│   ├── main.py           # 程序入口
│   ├── cli/
│   │   ├── app.py        # 主应用
│   │   ├── commands.py   # 命令处理
│   │   └── completer.py  # 自动补全
│   ├── config/
│   │   └── manager.py    # 配置管理
│   └── database/
│       └── connection.py # 连接管理
├── tests/
├── docs/
└── examples/
```
