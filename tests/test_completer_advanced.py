#!/usr/bin/env python3
"""
DBManager 补全器功能测试
"""

import sys
import os

TEST_DB = "/tmp/test_completer_feature.sqlite"


def cleanup():
    """清理测试文件"""
    if os.path.exists(TEST_DB):
        os.remove(TEST_DB)


def setup():
    """创建测试数据库"""
    cleanup()
    import sqlite3
    conn = sqlite3.connect(TEST_DB)
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE users (
            id INTEGER PRIMARY KEY,
            name TEXT NOT NULL,
            email TEXT,
            created_at TIMESTAMP
        )
    """)
    cursor.execute("""
        CREATE TABLE products (
            id INTEGER PRIMARY KEY,
            title TEXT NOT NULL,
            price REAL,
            stock INTEGER
        )
    """)
    cursor.execute("INSERT INTO users VALUES (1, 'Alice', 'alice@test.com', datetime('now'))")
    cursor.execute("INSERT INTO users VALUES (2, 'Bob', 'bob@test.com', datetime('now'))")
    cursor.execute("INSERT INTO products VALUES (1, 'Apple', 1.50, 100)")
    conn.commit()
    conn.close()


def test_metadata_cache():
    """测试元数据缓存"""
    print("测试 1: 元数据缓存")
    from src.cli.completer import MetadataCache

    cache = MetadataCache(ttl=300)

    # 初始状态
    assert not cache.is_valid(), "初始缓存应该无效"
    assert cache.tables == {}, "初始表名缓存应该为空"

    # 更新表名
    cache.update_tables(["users", "products", "orders"])
    assert cache.is_valid(), "更新后缓存应该有效"
    assert cache.get_table("users") == "users", "应该能获取表名"
    assert cache.get_table("USERS") == "users", "表名应该大小写不敏感"
    assert cache.get_table("nonexistent") is None, "不存在的表应该返回 None"

    # 更新列名
    cache.update_columns("users", ["id", "name", "email"])
    cols = cache.get_columns("users")
    assert cols == ["id", "name", "email"], "应该能获取列名"
    assert cache.get_columns("USERS") == ["id", "name", "email"], "列名应该大小写不敏感"

    # 使缓存失效
    cache.invalidate()
    assert not cache.is_valid(), "失效后缓存应该无效"
    assert cache.get_table("users") is None, "失效后应该获取不到表名"

    print("    ✓ 元数据缓存功能正确")

    return True


def test_fuzzy_match():
    """测试模糊匹配"""
    print("测试 2: 模糊匹配")
    from src.cli.completer import SQLCompleter
    from src.database.connection import ConnectionManager
    from src.config.manager import ConfigManager

    # 创建一个伪连接管理器用于初始化
    class MockConfigManager:
        def list_configs(self): return {}

    class MockConnectionManager:
        is_connected = False
        current_connection = None

    completer = SQLCompleter(MockConnectionManager(), MockConfigManager())

    # 完全匹配
    matched, score = completer._fuzzy_match("SELECT", "select")
    assert matched and score == 100, f"完全匹配应该得 100 分，得到 {score}"

    # 前缀匹配
    matched, score = completer._fuzzy_match("SELECT", "sel")
    assert matched and score == 50, f"前缀匹配应该得 50 分，得到 {score}"

    # 包含匹配
    matched, score = completer._fuzzy_match("SELECT", "lec")
    assert matched and score == 20, f"包含匹配应该得 20 分，得到 {score}"

    # 不匹配
    matched, score = completer._fuzzy_match("SELECT", "xyz")
    assert not matched, "不应该匹配"

    # 模糊匹配
    matched, score = completer._fuzzy_match("users", "ues")
    assert matched, "应该模糊匹配成功"

    print("    ✓ 模糊匹配功能正确")

    return True


def test_parse_tables():
    """测试表名解析"""
    print("测试 3: 表名解析")
    from src.cli.completer import SQLCompleter

    class MockConfigManager:
        def list_configs(self): return {}

    class MockConnectionManager:
        is_connected = False
        current_connection = None

    completer = SQLCompleter(MockConnectionManager(), MockConfigManager())

    # FROM 子句
    tables = completer._parse_tables("SELECT * FROM users WHERE id = 1", 40)
    assert "users" in tables, f"应该解析出 users 表，得到 {tables}"

    # 多个 FROM 表（逗号分隔）
    tables = completer._parse_tables("SELECT * FROM users, products", 35)
    assert "users" in tables, f"应该解析出 users 表，得到 {tables}"
    assert "products" in tables, f"应该解析出 products 表，得到 {tables}"

    # JOIN 子句
    tables = completer._parse_tables("SELECT * FROM users JOIN orders ON users.id = orders.user_id", 60)
    assert "users" in tables, f"应该解析出 users 表，得到 {tables}"
    assert "orders" in tables, f"应该解析出 orders 表，得到 {tables}"

    # UPDATE 子句
    tables = completer._parse_tables("UPDATE products SET price = 2.0 WHERE id = 1", 45)
    assert "products" in tables, f"应该解析出 products 表，得到 {tables}"

    # INSERT INTO 子句
    tables = completer._parse_tables("INSERT INTO users (name) VALUES ('test')", 40)
    assert "users" in tables, f"应该解析出 users 表，得到 {tables}"

    print("    ✓ 表名解析功能正确")

    return True


def test_table_completion():
    """测试表名补全"""
    print("测试 4: 表名补全")
    from src.cli.app import DBManagerApp
    from prompt_toolkit.document import Document
    from prompt_toolkit.formatted_text import FormattedText

    app = DBManagerApp()

    # 连接数据库（使用内存数据库确保有表）
    app.command_handler.handle_config(["add", "completer_test", "sqlite", "localhost", "0", "", "", ":memory:"])
    app.command_handler.handle_connect(["completer_test"])

    # 创建测试表
    app._execute_sql("CREATE TABLE users (id INTEGER, name TEXT);")
    app._execute_sql("CREATE TABLE products (id INTEGER, title TEXT);")

    # 强制刷新缓存
    app.completer.cache.invalidate()

    # 测试 1: 使用特定前缀过滤 - 应该只返回 users
    doc = Document(text="SELECT * FROM use", cursor_position=17)
    completions = list(app.completer.get_completions(doc, None))

    def get_meta_text(c):
        meta = c.display_meta
        if isinstance(meta, FormattedText):
            return meta[0][1] if meta else ""
        return str(meta) if meta else ""

    table_completions = [c for c in completions if get_meta_text(c) == "Table"]
    table_names = [c.text for c in table_completions]

    assert "users" in table_names, f"应该补全 users 表，得到 {table_names}"
    print("    ✓ 表名补全功能正确（前缀过滤）")

    # 测试 2: 无特定前缀时显示所有表
    doc = Document(text="SELECT * FROM ", cursor_position=14)
    completions = list(app.completer.get_completions(doc, None))
    table_completions = [c for c in completions if get_meta_text(c) == "Table"]
    table_names = [c.text for c in table_completions]

    assert "users" in table_names, f"应该显示 users 表，得到 {table_names}"
    assert "products" in table_names, f"应该显示 products 表，得到 {table_names}"
    print("    ✓ 表名补全功能正确（显示所有）")

    # 清理
    if "completer_test" in app.config_manager.list_configs():
        app.config_manager.remove_config("completer_test")

    return True


def test_column_completion():
    """测试列名补全"""
    print("测试 5: 列名补全")
    from src.cli.app import DBManagerApp
    from prompt_toolkit.document import Document
    from prompt_toolkit.formatted_text import FormattedText

    app = DBManagerApp()

    # 连接数据库（使用内存数据库）
    app.command_handler.handle_config(["add", "completer_test2", "sqlite", "localhost", "0", "", "", ":memory:"])
    app.command_handler.handle_connect(["completer_test2"])

    # 创建测试表
    app._execute_sql("CREATE TABLE users (id INTEGER, name TEXT, email TEXT);")

    # 强制刷新缓存
    app.completer.cache.invalidate()

    def get_meta_text(c):
        meta = c.display_meta
        if isinstance(meta, FormattedText):
            return meta[0][1] if meta else ""
        return str(meta) if meta else ""

    # 测试 1: 有前缀时过滤列名
    doc = Document(text="SELECT * FROM users WHERE na", cursor_position=28)
    completions = list(app.completer.get_completions(doc, None))
    column_completions = [c for c in completions if get_meta_text(c).startswith("Column of")]
    column_names = [c.text for c in column_completions]

    assert "name" in column_names, f"应该补全 name 列，得到 {column_names}"
    print("    ✓ 列名补全功能正确（前缀过滤）")

    # 测试 2: 无特定前缀时显示所有列
    doc = Document(text="SELECT * FROM users WHERE ", cursor_position=26)
    completions = list(app.completer.get_completions(doc, None))
    column_completions = [c for c in completions if get_meta_text(c).startswith("Column of")]
    column_names = [c.text for c in column_completions]

    assert "id" in column_names, f"应该显示 id 列，得到 {column_names}"
    assert "name" in column_names, f"应该显示 name 列，得到 {column_names}"
    assert "email" in column_names, f"应该显示 email 列，得到 {column_names}"
    print("    ✓ 列名补全功能正确（显示所有）")

    # 清理
    if "completer_test2" in app.config_manager.list_configs():
        app.config_manager.remove_config("completer_test2")

    return True


def test_keyword_completion():
    """测试关键字补全"""
    print("测试 6: 关键字补全")
    from src.cli.app import DBManagerApp
    from prompt_toolkit.document import Document

    app = DBManagerApp()

    # 测试 SQL 关键字补全
    doc = Document(text="SELECT * FROM users WHE", cursor_position=23)
    completions = list(app.completer.get_completions(doc, None))

    keywords = [c.text for c in completions]
    assert "WHERE" in keywords, f"应该补全 WHERE，得到 {keywords}"

    print("    ✓ 关键字补全功能正确")

    return True


def test_command_completion():
    """测试命令补全"""
    print("测试 7: 命令补全")
    from src.cli.app import DBManagerApp
    from prompt_toolkit.document import Document

    app = DBManagerApp()

    # 测试命令补全
    doc = Document(text="/con", cursor_position=4)
    completions = list(app.completer.get_completions(doc, None))

    commands = [c.text for c in completions]
    assert "connect" in commands, f"应该补全 connect 命令，得到 {commands}"

    # 测试子命令补全
    doc = Document(text="/config a", cursor_position=9)
    completions = list(app.completer.get_completions(doc, None))
    subcommands = [c.text for c in completions]
    assert "add" in subcommands, f"应该补全 add 子命令，得到 {subcommands}"

    print("    ✓ 命令补全功能正确")

    return True


def main():
    """运行所有测试"""
    print("=" * 50)
    print("DBManager 补全器功能测试")
    print("=" * 50)
    print()

    setup()

    tests = [
        test_metadata_cache,
        test_fuzzy_match,
        test_parse_tables,
        test_table_completion,
        test_column_completion,
        test_keyword_completion,
        test_command_completion,
    ]

    passed = 0
    failed = 0

    for test in tests:
        try:
            if test():
                passed += 1
        except Exception as e:
            print(f"  ✗ 测试失败：{e}")
            import traceback
            traceback.print_exc()
            failed += 1

    print()
    print("=" * 50)
    print(f"测试结果：{passed} 通过，{failed} 失败")
    print("=" * 50)

    cleanup()
    return 0 if failed == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
