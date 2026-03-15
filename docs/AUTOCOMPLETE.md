# DBManager 自动补全设计

## 1. 补全类型概览

| 补全类型 | 触发条件 | 补全内容 |
|----------|----------|----------|
| 命令补全 | 输入 `/` 开头 | 系统命令列表 |
| 表名补全 | 输入 `FROM ` 后 | 当前数据库表名 |
| 列名补全 | 输入 `SELECT ` 或 `WHERE ` 后 | 表字段名 |
| 关键字补全 | 输入 SQL 关键字前缀 | SQL 保留字 |
| 配置名补全 | `/connect ` 后 | 已配置的实例名 |
| 文件名补全 | `/run ` 后 | 本地 SQL 文件 |
| 历史命令 | `!` 开头 | 历史 SQL |

---

## 2. 命令补全

### 2.1 基础命令补全

```
输入：/
补全列表:
  /config      - 配置管理
  /connect     - 连接数据库
  /co          - 连接别名
  /check-out   - 连接别名
  /list        - 列出表
  /ls          - 列出别名
  /desc        - 表结构
  /describe    - 表结构别名
  /run         - 执行文件
  /source      - 执行别名
  /history     - 历史记录
  /h           - 历史别名
  /export      - 导出
  /format      - 格式设置
  /use         - 切换数据库
  /help        - 帮助
  /quit        - 退出
  /exit        - 退出别名
  /q           - 退出别名
```

### 2.2 命令子命令补全

```
输入：/config
补全列表:
  add      - 添加配置
  list     - 列出配置
  edit     - 编辑配置
  remove   - 删除配置
  test     - 测试连接
  export   - 导出配置
  import   - 导入配置
```

### 2.3 命令参数补全

```
输入：/connect
补全内容：已配置的实例名
  > local_mysql
    prod_pg
    backup_mysql

输入：/connect l[TAB]
自动补全：/connect local_mysql
```

```
输入：/desc
补全内容：当前数据库的表名
  > users
    posts
    comments
```

```
输入：/run
补全内容：当前目录的 .sql 文件
  > ./
  ../
  migrate.sql
  seed.sql
  queries/
```

---

## 3. SQL 关键字补全

### 3.1 关键字列表

```python
SQL_KEYWORDS = [
    # 子句
    'SELECT', 'FROM', 'WHERE', 'GROUP BY', 'HAVING', 'ORDER BY',
    'LIMIT', 'OFFSET', 'UNION', 'UNION ALL',

    # JOIN 类型
    'JOIN', 'INNER JOIN', 'LEFT JOIN', 'RIGHT JOIN', 'FULL OUTER JOIN',
    'CROSS JOIN', 'NATURAL JOIN',

    # 数据操作
    'INSERT INTO', 'VALUES', 'UPDATE', 'DELETE', 'REPLACE',

    # 表操作
    'CREATE TABLE', 'ALTER TABLE', 'DROP TABLE', 'TRUNCATE TABLE',
    'CREATE INDEX', 'DROP INDEX', 'CREATE VIEW', 'DROP VIEW',

    # 条件
    'AND', 'OR', 'NOT', 'IN', 'EXISTS', 'BETWEEN', 'LIKE', 'IS NULL',
    'IS NOT NULL', 'REGEXP', 'RLIKE',

    # 函数相关
    'AS', 'DISTINCT', 'ALL', 'COUNT', 'SUM', 'AVG', 'MAX', 'MIN',
    'CAST', 'CONVERT',

    # 其他
    'CASE', 'WHEN', 'THEN', 'ELSE', 'END',
    'NULL', 'TRUE', 'FALSE',
    'ASC', 'DESC',
    'DEFAULT', 'PRIMARY KEY', 'FOREIGN KEY', 'REFERENCES',
    'CONSTRAINT', 'UNIQUE', 'CHECK',

    # MySQL 特有
    'SHOW TABLES', 'SHOW COLUMNS', 'DESCRIBE', 'EXPLAIN',
    'USE', 'SET', 'COMMIT', 'ROLLBACK', 'START TRANSACTION',

    # PostgreSQL 特有
    'RETURNING', 'ON CONFLICT', 'DO NOTHING', 'DO UPDATE',
]
```

### 3.2 关键字补全示例

```
输入：SEL[TAB]
补全：SELECT

输入：SELECT * FROM u[TAB]
补全：SELECT * FROM users  (表名补全)

输入：SELECT * FROM users WHERE cr[TAB]
补全：SELECT * FROM users WHERE created_at  (列名补全)

输入：SELECT * FROM users WHERE created_at > '2024-01-01' GRO[TAB]
补全：SELECT * FROM users WHERE created_at > '2024-01-01' GROUP BY
```

---

## 4. 表名和列名补全

### 4.1 表名补全逻辑

```python
def get_table_completions(connection, prefix: str) -> list[str]:
    """获取表名补全列表"""
    if connection is None:
        return []

    # 获取当前数据库所有表
    tables = connection.get_tables()

    # 过滤匹配前缀的表名
    if prefix:
        tables = [t for t in tables if t.lower().startswith(prefix.lower())]

    # 按字母排序
    return sorted(tables)

# 示例
# 当前表：['users', 'posts', 'comments', 'user_profiles']
# 输入：FROM u[TAB]
# 补全：['users', 'user_profiles']
```

### 4.2 列名补全逻辑

```python
def get_column_completions(connection, context: ParseContext) -> list[str]:
    """获取列名补全列表"""
    if connection is None or context.current_table is None:
        return []

    # 获取当前表的列
    columns = connection.get_columns(context.current_table)

    # 过滤匹配前缀的列名
    if context.prefix:
        columns = [c for c in columns if c.lower().startswith(context.prefix.lower())]

    return sorted(columns)

# 示例
# 当前表：users (列：id, username, email, created_at, updated_at)
# 输入：SELECT u[TAB] FROM users
# 补全：['updated_at', 'username']

# 输入：SELECT * FROM users WHERE ema[TAB]
# 补全：['email']
```

### 4.3 上下文感知的列名补全

```python
class ParseContext:
    """SQL 解析上下文"""
    current_table: str | None      # 当前主表
    alias_map: dict[str, str]      # 表别名映射
    current_clause: str | None     # 当前子句 (SELECT/WHERE/ORDER BY 等)
    prefix: str                    # 当前输入前缀
    tables_in_query: list[str]     # 查询中涉及的所有表

# 示例：多表 JOIN 场景
# SELECT u.id, u.na[TAB], p.ti[TAB]
# FROM users u JOIN posts p ON u.id = p.user_id
#
# 补全逻辑：
# - u.na[TAB] -> users 表的 name 列
# - p.ti[TAB] -> posts 表的 title 列
```

---

## 5. 智能补全功能

### 5.1 模糊匹配

```python
def fuzzy_match(pattern: str, text: str) -> bool:
    """模糊匹配：pat 匹配 pattern, ptt 也匹配 pattern"""
    pattern = pattern.lower()
    text = text.lower()

    text_idx = 0
    for char in pattern:
        while text_idx < len(text) and text[text_idx] != char:
            text_idx += 1
        if text_idx >= len(text):
            return False
        text_idx += 1
    return True

# 示例
# 输入：usr[TAB] -> users
# 输入：cr_at[TAB] -> created_at
# 输入：upda[TAB] -> updated_at, update
```

### 5.2 常用优先排序

```python
def rank_completions(completions: list[str], history: list[str]) -> list[str]:
    """根据使用频率排序补全结果"""
    # 统计历史使用频率
    frequency = {}
    for item in completions:
        frequency[item] = sum(1 for h in history if item in h)

    # 按频率排序
    return sorted(completions, key=lambda x: frequency.get(x, 0), reverse=True)

# 示例
# 如果用户经常查询 users 表
# 输入：FROM [TAB]
# 补全顺序：users > posts > comments > ...
```

### 5.3 数据库类型感知

```python
def get_keywords_for_db(db_type: str) -> list[str]:
    """根据数据库类型返回适用的关键字"""
    base_keywords = SQL_KEYWORDS.copy()

    if db_type == 'mysql':
        base_keywords.extend([
            'SHOW TABLES', 'SHOW CREATE TABLE', 'ENGINE=InnoDB',
            'AUTO_INCREMENT', 'DATETIME', 'TINYINT(1)'
        ])
    elif db_type == 'postgresql':
        base_keywords.extend([
            'RETURNING', 'SERIAL', 'TIMESTAMPTZ', 'JSONB',
            'ON CONFLICT DO NOTHING', 'ON CONFLICT DO UPDATE'
        ])
    elif db_type == 'sqlite':
        base_keywords.extend([
            'AUTOINCREMENT', 'BLOB', 'WITHOUT ROWID'
        ])

    return base_keywords
```

---

## 6. 补全 UI 设计

### 6.1 补全菜单样式

```
sql> SELECT * FROM u
     ┌────────────────────────────────┐
     │ 表名 (输入 TAB 选择，ESC 取消)    │
     ├────────────────────────────────┤
     │ > users                        │
     │   user_profiles                │
     │   user_sessions                │
     └────────────────────────────────┘
     1/3
```

### 6.2 内联补全

```
sql> SELECT * FROM users  (灰色显示剩余部分)
                        ^-- WHERE created_at > '2024-01-01'
```

### 6.3 多列补全菜单（带信息）

```
输入：/connect [TAB]

┌─────────────────────────────────────────────┐
│ 数据库实例                                   │
├─────────────────────────────────────────────┤
│ > local_mysql     MySQL      localhost:3306 │
│   prod_pg      → PostgreSQL prod.db.com:5432│
│   backup_mysql  MySQL      backup.local:3306│
└─────────────────────────────────────────────┘

说明：→ 表示上次使用的实例
```

### 6.4 带类型的补全提示

```
sql> SEL┌──────────────────────────────────┐
      │关键字  SELECT                     │
      │函数   SELECT_INTO()              │
      │表     sellers                    │
      └──────────────────────────────────┘
```

---

## 7. 补全触发机制

### 7.1 触发条件判断

```python
class Completer:
    def get_completions(self, document, complete_event):
        text = document.text
        cursor_pos = document.cursor_position

        # 判断当前上下文
        if self.is_command_context(text, cursor_pos):
            yield from self.get_command_completions(text, cursor_pos)
        elif self.is_keyword_context(text, cursor_pos):
            yield from self.get_keyword_completions(text, cursor_pos)
        elif self.is_table_context(text, cursor_pos):
            yield from self.get_table_completions(text, cursor_pos)
        elif self.is_column_context(text, cursor_pos):
            yield from self.get_column_completions(text, cursor_pos)
        elif self.is_file_context(text, cursor_pos):
            yield from self.get_file_completions(text, cursor_pos)

def is_command_context(text: str, cursor_pos: int) -> bool:
    """判断是否为命令补全上下文"""
    # 行首或空白后跟 /
    line_start = text.rfind('\n', 0, cursor_pos) + 1
    prefix = text[line_start:cursor_pos].strip()
    return prefix.startswith('/')

def is_table_context(text: str, cursor_pos: int) -> bool:
    """判断是否为表名补全上下文"""
    prefix = text[:cursor_pos].upper()
    return ('FROM ' in prefix or 'JOIN ' in prefix or
            'INTO ' in prefix or 'UPDATE ' in prefix)

def is_column_context(text: str, cursor_pos: int) -> bool:
    """判断是否为列名补全上下文"""
    # 在 SELECT 之后、FROM 之前，或 WHERE/AND/OR 之后
    prefix = text[:cursor_pos].upper()
    return any(kw in prefix for kw in ['SELECT', 'WHERE', 'AND ', 'OR ', 'ON '])
```

### 7.2 延迟加载优化

```python
class AsyncCompleter:
    """异步补全器，避免阻塞 UI"""

    def __init__(self, cache_size: int = 1000):
        self.cache = LRUCache(cache_size)
        self.pending_requests = {}

    async def get_completions(self, context: CompletionContext) -> list[str]:
        cache_key = self._make_cache_key(context)

        # 检查缓存
        if cache_key in self.cache:
            return self.cache[cache_key]

        # 检查是否有待处理的相同请求
        if cache_key in self.pending_requests:
            return await self.pending_requests[cache_key]

        # 发起异步请求
        future = asyncio.Future()
        self.pending_requests[cache_key] = future

        # 后台获取补全
        completions = await self._fetch_completions(context)

        # 缓存结果
        self.cache[cache_key] = completions
        future.set_result(completions)

        del self.pending_requests[cache_key]
        return completions
```

---

## 8. 缓存策略

### 8.1 元数据缓存

```python
class MetadataCache:
    """数据库元数据缓存"""

    def __init__(self, ttl_seconds: int = 300):
        self.tables = {}  # {db_name: [(table_name, columns), ...]}
        self.cache_time = {}
        self.ttl = ttl_seconds

    def get_tables(self, connection) -> list[str]:
        key = id(connection)
        if self._is_valid(key):
            return self.tables[key]

        tables = connection.get_tables()
        self.tables[key] = tables
        self.cache_time[key] = time.time()
        return tables

    def get_columns(self, connection, table: str) -> list[str]:
        key = (id(connection), table)
        if self._is_valid(key):
            return self.tables[key]

        columns = connection.get_columns(table)
        self.tables[key] = columns
        self.cache_time[key] = time.time()
        return columns

    def invalidate(self, connection):
        """连接变更时清除缓存"""
        key = id(connection)
        self.tables.pop(key, None)
        self.cache_time.pop(key, None)
```

### 8.2 缓存失效事件

```python
# 以下操作后清除缓存：
CACHE_INVALIDATION_EVENTS = [
    'CREATE TABLE',
    'DROP TABLE',
    'ALTER TABLE',
    'TRUNCATE TABLE',
    'CREATE INDEX',
    'DROP INDEX',
    'USE',  # 切换数据库
    'CONNECT',  # 切换连接
]

def check_and_invalidate_cache(sql: str, cache: MetadataCache):
    """检查是否需要清除缓存"""
    sql_upper = sql.upper().strip()

    for event in CACHE_INVALIDATION_EVENTS:
        if sql_upper.startswith(event):
            cache.invalidate_all()
            return True
    return False
```

---

## 9. 实现示例 (prompt_toolkit)

### 9.1 SQL 补全器

```python
from prompt_toolkit.completion import Completer, Completion
from prompt_toolkit.document import Document

class SQLCompleter(Completer):
    def __init__(self, connection_manager, config_manager):
        self.connection_manager = connection_manager
        self.config_manager = config_manager
        self.metadata_cache = MetadataCache()

    def get_completions(self, document: Document, complete_event):
        text = document.text
        cursor_pos = document.cursor_position

        # 命令补全
        if text.strip().startswith('/'):
            yield from self._get_command_completions(text, cursor_pos)
            return

        # SQL 关键字补全
        yield from self._get_keyword_completions(text, cursor_pos)

        # 表名补全
        yield from self._get_table_completions(text, cursor_pos)

        # 列名补全
        yield from self._get_column_completions(text, cursor_pos)

    def _get_command_completions(self, text: str, cursor_pos: int):
        """命令补全"""
        commands = [
            ('config', '配置管理'),
            ('connect', '连接数据库'),
            ('co', '连接别名'),
            ('check-out', '切换实例'),
            ('list', '列出表'),
            ('ls', '列出别名'),
            ('desc', '查看表结构'),
            ('describe', '查看表结构'),
            ('run', '执行 SQL 文件'),
            ('source', '执行 SQL 文件'),
            ('history', '历史记录'),
            ('h', '历史别名'),
            ('export', '导出结果'),
            ('format', '设置格式'),
            ('use', '切换数据库'),
            ('help', '帮助'),
            ('quit', '退出'),
            ('exit', '退出'),
            ('q', '退出别名'),
        ]

        prefix = text.strip()[1:cursor_pos]

        for cmd, desc in commands:
            if cmd.startswith(prefix):
                yield Completion(
                    text=cmd,
                    start_position=-len(prefix),
                    display=f'/{cmd}',
                    display_meta=desc
                )

    def _get_keyword_completions(self, text: str, cursor_pos: int):
        """SQL 关键字补全"""
        # 获取当前单词
        word_before_cursor = self._get_word_before_cursor(text, cursor_pos)

        for keyword in SQL_KEYWORDS:
            if keyword.lower().startswith(word_before_cursor.lower()):
                yield Completion(
                    text=keyword,
                    start_position=-len(word_before_cursor),
                    display=keyword,
                    display_meta='Keyword'
                )

    def _get_table_completions(self, text: str, cursor_pos: int):
        """表名补全"""
        connection = self.connection_manager.current_connection
        if connection is None:
            return

        # 检测 FROM/JOIN 后的表名
        word_before_cursor = self._get_word_before_cursor(text, cursor_pos)
        prefix = text[:cursor_pos].upper()

        if any(f'{kw} ' in prefix for kw in ['FROM', 'JOIN', 'INTO', 'UPDATE']):
            tables = self.metadata_cache.get_tables(connection)

            for table in tables:
                if table.lower().startswith(word_before_cursor.lower()):
                    yield Completion(
                        text=table,
                        start_position=-len(word_before_cursor),
                        display=table,
                        display_meta='Table'
                    )

    def _get_column_completions(self, text: str, cursor_pos: int):
        """列名补全"""
        connection = self.connection_manager.current_connection
        if connection is None:
            return

        word_before_cursor = self._get_word_before_cursor(text, cursor_pos)

        # 解析上下文获取当前表
        current_table = self._parse_current_table(text, cursor_pos)
        if current_table:
            columns = self.metadata_cache.get_columns(connection, current_table)

            for column in columns:
                if column.lower().startswith(word_before_cursor.lower()):
                    yield Completion(
                        text=column,
                        start_position=-len(word_before_cursor),
                        display=column,
                        display_meta=f'Column of {current_table}'
                    )

    def _get_word_before_cursor(self, text: str, cursor_pos: int) -> str:
        """获取光标前的单词"""
        text_before_cursor = text[:cursor_pos]
        words = re.split(r'[\s,()=]', text_before_cursor)
        return words[-1] if words else ''

    def _parse_current_table(self, text: str, cursor_pos: int) -> str | None:
        """解析当前上下文的主表"""
        # 简化实现：查找 FROM 后的第一个表名
        prefix = text[:cursor_pos].upper()
        from_match = re.search(r'FROM\s+(\w+)', prefix, re.IGNORECASE)
        if from_match:
            return from_match.group(1)
        return None
```

### 9.2 集成到应用

```python
from prompt_toolkit import Application
from prompt_toolkit.key_binding import KeyBindings
from prompt_toolkit.layout import Layout
from prompt_toolkit.layout.containers import HSplit, Window
from prompt_toolkit.layout.controls import BufferControl
from prompt_toolkit.buffer import Buffer

def create_app():
    # 创建补全器
    completer = SQLCompleter(connection_manager, config_manager)

    # 创建缓冲区
    input_buffer = Buffer(
        completer=completer,
        complete_while_typing=True,
    )

    # 创建键绑定
    kb = KeyBindings()

    @kb.add('tab')
    def _(event):
        """TAB 键选择补全"""
        b = event.current_buffer
        if b.complete_state:
            b.complete_next()
        else:
            b.start_completion()

    @kb.add('escape')
    def _(event):
        """ESC 取消补全"""
        b = event.current_buffer
        if b.complete_state:
            b.cancel_completion()

    # 创建布局
    root_container = HSplit([
        Window(content=BufferControl(buffer=input_buffer)),
    ])

    layout = Layout(root_container)

    # 创建应用
    app = Application(
        layout=layout,
        buffer=input_buffer,
        key_bindings=kb,
        full_screen=False,
    )

    return app
```

---

## 10. 性能优化

### 10.1 补全性能指标

| 操作 | 目标延迟 | 说明 |
|------|----------|------|
| 命令补全 | <10ms | 本地静态列表 |
| 关键字补全 | <5ms | 本地静态列表 |
| 表名补全 | <50ms | 缓存命中/<100ms 查询 |
| 列名补全 | <100ms | 需要解析上下文 |
| 文件补全 | <30ms | 文件系统扫描 |

### 10.2 优化策略

```python
class OptimizedCompleter:
    """优化的补全器"""

    # 1. 预加载静态补全
    COMMANDS = [...]  # 启动时加载
    KEYWORDS = [...]  # 启动时加载

    # 2. 懒加载动态补全
    _table_cache = None

    # 3. 限制补全数量
    MAX_COMPLETIONS = 100

    # 4. 渐进式加载
    def get_completions(self, context):
        # 首先返回静态补全
        yield from self.static_completions

        # 后台加载动态补全
        asyncio.create_task(self.load_dynamic_completions(context))
```

---

## 11. 测试用例

```python
class TestCompleter:
    """补全功能测试"""

    def test_command_completion(self):
        completer = SQLCompleter()
        doc = Document(text='/con', cursor_position=4)
        completions = list(completer.get_completions(doc, None))

        assert any(c.text == 'connect' for c in completions)
        assert any(c.text == 'config' for c in completions)

    def test_table_completion(self):
        mock_conn = MockConnection(tables=['users', 'posts'])
        completer = SQLCompleter(mock_conn)
        doc = Document(text='SELECT * FROM u', cursor_position=17)

        completions = list(completer.get_completions(doc, None))
        assert any(c.text == 'users' for c in completions)

    def test_column_completion(self):
        mock_conn = MockConnection(columns=['id', 'username', 'email'])
        completer = SQLCompleter(mock_conn)
        doc = Document(text='SELECT em FROM users', cursor_position=10)

        completions = list(completer.get_completions(doc, None))
        assert any(c.text == 'email' for c in completions)

    def test_keyword_completion(self):
        completer = SQLCompleter()
        doc = Document(text='SEL', cursor_position=3)

        completions = list(completer.get_completions(doc, None))
        assert any(c.text == 'SELECT' for c in completions)
```
