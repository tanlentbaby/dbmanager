"""
SQL 补全器 - 提供命令、关键字、表名、列名等自动补全
"""

import re
import time
from typing import TYPE_CHECKING, Iterator, Optional
from prompt_toolkit.completion import Completer, Completion

if TYPE_CHECKING:
    from ..database.connection import ConnectionManager
    from ..config.manager import ConfigManager


# SQL 关键字列表
SQL_KEYWORDS = [
    # 子句
    "SELECT", "FROM", "WHERE", "GROUP BY", "HAVING", "ORDER BY",
    "LIMIT", "OFFSET", "UNION", "UNION ALL", "INTERSECT", "EXCEPT",

    # JOIN 类型
    "JOIN", "INNER JOIN", "LEFT JOIN", "RIGHT JOIN", "FULL OUTER JOIN",
    "CROSS JOIN", "NATURAL JOIN", "LEFT OUTER JOIN", "RIGHT OUTER JOIN",

    # 数据操作
    "INSERT INTO", "VALUES", "UPDATE", "DELETE", "REPLACE", "MERGE",

    # 表操作
    "CREATE TABLE", "ALTER TABLE", "DROP TABLE", "TRUNCATE TABLE",
    "CREATE INDEX", "DROP INDEX", "CREATE VIEW", "DROP VIEW",
    "CREATE DATABASE", "DROP DATABASE",

    # 条件
    "AND", "OR", "NOT", "IN", "EXISTS", "BETWEEN", "LIKE", "ILIKE",
    "IS NULL", "IS NOT NULL", "REGEXP", "RLIKE", "SIMILAR TO",

    # 函数相关
    "AS", "DISTINCT", "ALL", "ANY", "SOME",
    "COUNT", "SUM", "AVG", "MAX", "MIN", "GROUP_CONCAT",
    "CAST", "CONVERT", "COALESCE", "NULLIF",

    # 其他
    "CASE", "WHEN", "THEN", "ELSE", "END",
    "NULL", "TRUE", "FALSE",
    "ASC", "DESC",
    "DEFAULT", "PRIMARY KEY", "FOREIGN KEY", "REFERENCES",
    "CONSTRAINT", "UNIQUE", "CHECK", "INDEX",

    # MySQL 特有
    "SHOW TABLES", "SHOW COLUMNS", "SHOW CREATE TABLE",
    "DESCRIBE", "EXPLAIN", "USE", "SET",
    "COMMIT", "ROLLBACK", "START TRANSACTION",
    "AUTO_INCREMENT", "ENGINE", "CHARSET",

    # PostgreSQL 特有
    "RETURNING", "ON CONFLICT", "DO NOTHING", "DO UPDATE",
    "SERIAL", "BIGSERIAL", "TIMESTAMPTZ", "JSONB",

    # SQLite 特有
    "AUTOINCREMENT", "BLOB", "WITHOUT ROWID", "VIRTUAL TABLE",
]

# 命令列表
COMMANDS = [
    ("config", "配置管理 (add/list/edit/remove/test)"),
    ("connect", "连接数据库实例"),
    ("co", "连接别名"),
    ("check-out", "切换实例"),
    ("disconnect", "断开连接"),
    ("list", "列出所有表"),
    ("ls", "列出表别名"),
    ("desc", "查看表结构"),
    ("describe", "查看表结构别名"),
    ("use", "切换数据库"),
    ("run", "执行 SQL 文件"),
    ("source", "执行文件别名"),
    ("history", "查看历史命令"),
    ("h", "历史别名"),
    ("export", "导出查询结果"),
    ("format", "设置输出格式"),
    ("help", "显示帮助"),
    ("quit", "退出程序"),
    ("exit", "退出别名"),
    ("q", "退出简写"),
]


class MetadataCache:
    """元数据缓存"""

    def __init__(self, ttl: int = 300):
        self.ttl = ttl  # 缓存有效期（秒）
        self.tables: dict[str, list[str]] = {}
        self.columns: dict[str, list[str]] = {}
        self.timestamp: float = 0

    def is_valid(self) -> bool:
        """检查缓存是否有效"""
        return time.time() - self.timestamp < self.ttl

    def invalidate(self):
        """使缓存失效"""
        self.tables.clear()
        self.columns.clear()
        self.timestamp = 0

    def update_tables(self, tables: list[str]):
        """更新表名缓存"""
        self.tables = {t.lower(): t for t in tables}
        self.timestamp = time.time()

    def update_columns(self, table_name: str, columns: list[str]):
        """更新列名缓存"""
        self.columns[table_name.lower()] = columns
        self.timestamp = time.time()

    def get_table(self, name: str) -> Optional[str]:
        """获取表名（大小写不敏感）"""
        return self.tables.get(name.lower())

    def get_columns(self, table_name: str) -> Optional[list[str]]:
        """获取列名（大小写不敏感）"""
        return self.columns.get(table_name.lower())


class SQLCompleter(Completer):
    """SQL 自动补全器"""

    def __init__(
        self,
        connection_manager: "ConnectionManager",
        config_manager: "ConfigManager",
    ):
        self.connection_manager = connection_manager
        self.config_manager = config_manager
        self.cache = MetadataCache(ttl=300)  # 5 分钟缓存

    def get_completions(
        self,
        document,
        complete_event
    ) -> Iterator[Completion]:
        """获取补全建议"""
        text = document.text
        cursor_position = document.cursor_position

        # 判断补全类型
        if self._is_command_context(text, cursor_position):
            yield from self._get_command_completions(text, cursor_position)
        else:
            # SQL 补全
            yield from self._get_keyword_completions(text, cursor_position)
            yield from self._get_table_completions(text, cursor_position)
            yield from self._get_column_completions(text, cursor_position)

    def invalidate_cache(self):
        """使元数据缓存失效"""
        self.cache.invalidate()

    def _is_command_context(self, text: str, cursor_position: int) -> bool:
        """判断是否为命令补全上下文"""
        # 查找当前行的开始
        line_start = text.rfind("\n", 0, cursor_position) + 1
        prefix = text[line_start:cursor_position].strip()
        # 只要行首是 / 就认为是命令上下文（支持 /command arg 的补全）
        line_raw = text[line_start:cursor_position]
        return line_raw.strip().startswith("/")

    def _fuzzy_match(self, word: str, prefix: str) -> tuple[bool, int]:
        """
        模糊匹配
        返回 (是否匹配，匹配得分)
        得分越高表示匹配度越好
        """
        if not prefix:
            return False, 0

        word_lower = word.lower()
        prefix_lower = prefix.lower()

        # 完全匹配（大小写不敏感）- 最高分
        if word_lower == prefix_lower:
            return True, 100

        # 前缀匹配 - 高分
        if word_lower.startswith(prefix_lower):
            return True, 50

        # 包含匹配 - 中等分数
        if prefix_lower in word_lower:
            return True, 20

        # 模糊匹配：检查 prefix 的字符是否按顺序出现在 word 中
        word_idx = 0
        match_count = 0
        for char in prefix_lower:
            while word_idx < len(word_lower) and word_lower[word_idx] != char:
                word_idx += 1
            if word_idx < len(word_lower):
                match_count += 1
                word_idx += 1

        if match_count >= len(prefix_lower) * 0.8:  # 80% 字符匹配
            return True, 10

        return False, 0

    def _get_command_completions(
        self,
        text: str,
        cursor_position: int
    ) -> Iterator[Completion]:
        """获取命令补全"""
        # 获取当前输入的前缀
        line_start = text.rfind("\n", 0, cursor_position) + 1
        line_prefix = text[line_start:cursor_position].strip()

        # 去掉 / 前缀
        if line_prefix.startswith("/"):
            prefix = line_prefix[1:]
        else:
            prefix = line_prefix

        # 检查是否是子命令上下文（如 /config |）
        parts = line_prefix.split()
        if len(parts) > 1 and parts[0] in ["config"]:
            # 子命令补全
            subcmd_prefix = parts[1] if len(parts) > 1 else ""
            for subcmd in ["add", "list", "edit", "remove", "test"]:
                matched, score = self._fuzzy_match(subcmd, subcmd_prefix)
                if matched:
                    yield Completion(
                        text=subcmd,
                        start_position=-len(subcmd_prefix),
                        display=subcmd,
                        display_meta=f"{parts[0]} 子命令",
                    )
            return

        # 命令补全 - 也包含子命令作为顶级命令（方便输入）
        for cmd, description in COMMANDS:
            matched, score = self._fuzzy_match(cmd, prefix)
            if matched:
                yield Completion(
                    text=cmd,
                    start_position=-len(prefix),
                    display=cmd,
                    display_meta=description,
                )

        # 如果输入类似 /config a，也提供子命令补全
        if " " in prefix:
            main_cmd = prefix.split()[0]
            if main_cmd in ["config"]:
                subcmd_prefix = prefix.split()[1] if len(prefix.split()) > 1 else ""
                for subcmd in ["add", "list", "edit", "remove", "test"]:
                    matched, score = self._fuzzy_match(subcmd, subcmd_prefix)
                    if matched:
                        yield Completion(
                            text=subcmd,
                            start_position=-len(subcmd_prefix),
                            display=subcmd,
                            display_meta=f"{main_cmd} 子命令",
                        )

    def _get_keyword_completions(
        self,
        text: str,
        cursor_position: int
    ) -> Iterator[Completion]:
        """获取 SQL 关键字补全"""
        word = self._get_word_before_cursor(text, cursor_position)

        for keyword in SQL_KEYWORDS:
            if keyword.lower().startswith(word.lower()):
                yield Completion(
                    text=keyword,
                    start_position=-len(word),
                    display=keyword,
                    display_meta="Keyword",
                )

    def _get_table_completions(
        self,
        text: str,
        cursor_position: int
    ) -> Iterator[Completion]:
        """获取表名补全"""
        if not self.connection_manager.is_connected:
            return

        word = self._get_word_before_cursor(text, cursor_position)
        prefix_upper = text[:cursor_position].upper()

        # 检查是否在 FROM/JOIN/INTO/UPDATE/TABLE 之后
        table_keywords = ["FROM ", "JOIN ", "INTO ", "UPDATE ", "TABLE ", "DESCRIBE ", "DESC "]
        is_table_context = any(kw in prefix_upper for kw in table_keywords)

        if not is_table_context:
            return

        # 尝试从缓存获取表名
        if not self.cache.is_valid() or not self.cache.tables:
            try:
                tables = self.connection_manager.get_tables()
                self.cache.update_tables(tables)
            except Exception:
                return
        else:
            tables = list(self.cache.tables.values())

        # 使用模糊匹配提供补全
        completions = []
        for table in tables:
            # 如果是空词，显示所有表
            if not word:
                completions.append((table, 10))
            else:
                matched, score = self._fuzzy_match(table, word)
                if matched:
                    completions.append((table, score))

        # 按得分排序，优先显示匹配度高的
        completions.sort(key=lambda x: -x[1])

        for table, score in completions:
            yield Completion(
                text=table,
                start_position=-len(word),
                display=table,
                display_meta="Table",
            )

    def _get_column_completions(
        self,
        text: str,
        cursor_position: int
    ) -> Iterator[Completion]:
        """获取列名补全"""
        if not self.connection_manager.is_connected:
            return

        word = self._get_word_before_cursor(text, cursor_position)

        prefix_upper = text[:cursor_position].upper()

        # 检查是否在 SELECT/WHERE/AND/OR/ON/SET 之后
        column_keywords = ["SELECT ", "WHERE ", "AND ", "OR ", "ON ", "SET ", "GROUP BY ", "ORDER BY "]
        is_column_context = any(kw in prefix_upper for kw in column_keywords)

        if not is_column_context:
            return

        # 解析当前上下文中的表名
        table_names = self._parse_tables(text, cursor_position)

        if not table_names:
            return

        # 收集所有列名
        all_columns = []
        seen = set()

        for table_name in table_names:
            # 检查缓存
            columns = self.cache.get_columns(table_name)
            if columns is None:
                try:
                    columns = self.connection_manager.get_columns(table_name)
                    self.cache.update_columns(table_name, columns)
                except Exception:
                    continue

            for col in columns:
                if col.lower() not in seen:
                    seen.add(col.lower())
                    all_columns.append((col, table_name))

        # 使用模糊匹配提供补全
        completions = []
        for column, table in all_columns:
            # 如果是空词，显示所有列
            if not word:
                completions.append((column, table, 10))
            else:
                matched, score = self._fuzzy_match(column, word)
                if matched:
                    completions.append((column, table, score))

        # 按得分排序
        completions.sort(key=lambda x: -x[2])

        for column, table, score in completions:
            yield Completion(
                text=column,
                start_position=-len(word),
                display=column,
                display_meta=f"Column of {table}",
            )

    def _get_word_before_cursor(
        self,
        text: str,
        cursor_position: int
    ) -> str:
        """获取光标前的单词"""
        text_before = text[:cursor_position]
        # 按空白和标点分割
        words = re.split(r"[\s,()=<>!+\-*/]", text_before)
        return words[-1] if words else ""

    def _parse_tables(self, text: str, cursor_position: int) -> list[str]:
        """解析当前上下文中的表名（支持多表）"""
        tables = []

        # 查找 FROM 后的表名（支持多个）
        from_matches = re.findall(r"\bFROM\s+([a-zA-Z_][a-zA-Z0-9_]*(?:\s*,\s*[a-zA-Z_][a-zA-Z0-9_]*)*)",
                                   text, re.IGNORECASE)
        for match in from_matches:
            for t in match.split(","):
                t = t.strip().split()[0]  # 处理别名
                if t and not t.upper() in ["SELECT", "WHERE", "JOIN", "ON"]:
                    tables.append(t)

        # 查找 JOIN 后的表名
        join_matches = re.findall(r"\bJOIN\s+([a-zA-Z_][a-zA-Z0-9_]*)", text, re.IGNORECASE)
        for t in join_matches:
            tables.append(t)

        # 查找 UPDATE 后的表名
        update_matches = re.findall(r"\bUPDATE\s+([a-zA-Z_][a-zA-Z0-9_]*)", text, re.IGNORECASE)
        for t in update_matches:
            tables.append(t)

        # 查找 INSERT INTO 后的表名
        insert_matches = re.findall(r"\bINSERT\s+INTO\s+([a-zA-Z_][a-zA-Z0-9_]*)", text, re.IGNORECASE)
        for t in insert_matches:
            tables.append(t)

        # 返回去重后的表名
        return list(dict.fromkeys(tables))

    def _parse_current_table(self, text: str, cursor_position: int) -> Optional[str]:
        """解析当前上下文的主表（向后兼容）"""
        tables = self._parse_tables(text, cursor_position)
        return tables[0] if tables else None
