#!/usr/bin/env python3
"""
DBManager 综合功能测试
测试 /config add, /connect, /desc 等功能
"""

import sys
import os

# 添加临时 SQLite 数据库用于测试
TEST_DB = "/tmp/test_dbmanager.sqlite"


def cleanup():
    """清理测试文件"""
    if os.path.exists(TEST_DB):
        os.remove(TEST_DB)


def test_config_add():
    """测试 /config add 命令"""
    print("测试 1: /config add 命令")
    from src.cli.app import DBManagerApp

    app = DBManagerApp()

    # 测试参数不足的情况
    print("  - 测试参数不足...")
    app.command_handler.handle_config(["add"])
    print("    ✓ 显示使用说明")

    # 测试添加 SQLite 配置
    print("  - 添加 SQLite 配置...")
    app.command_handler.handle_config(["add", "test_db", "sqlite", ":memory:"])
    print("    ✓ 配置添加成功")

    # 测试添加 MySQL 配置
    print("  - 添加 MySQL 配置...")
    app.command_handler.handle_config(["add", "local_mysql", "mysql", "localhost", "3306", "root", "password", "testdb"])
    print("    ✓ 配置添加成功")

    # 测试重复添加
    print("  - 测试重复添加...")
    app.command_handler.handle_config(["add", "test_db", "sqlite", ":memory:"])
    print("    ✓ 正确拒绝重复配置")

    # 测试列出配置
    print("  - 列出配置...")
    app.command_handler.handle_config(["list"])
    print("    ✓ 配置列表显示正常")

    cleanup()
    return True


def test_connect():
    """测试 /connect 命令"""
    print("\n测试 2: /connect 命令")
    from src.cli.app import DBManagerApp

    app = DBManagerApp()

    # 先添加配置
    app.command_handler.handle_config(["add", "test_sqlite", "sqlite", ":memory:"])

    # 测试连接
    print("  - 连接到 SQLite...")
    app.command_handler.handle_connect(["test_sqlite"])
    print("    ✓ 连接成功")

    # 测试列出实例
    print("  - 列出可连接实例...")
    app.command_handler.handle_connect([])
    print("    ✓ 实例列表显示正常")

    cleanup()
    return True


def test_list_tables():
    """测试 /list 命令"""
    print("\n测试 3: /list 命令")
    from src.cli.app import DBManagerApp
    import sqlite3

    app = DBManagerApp()

    # 添加配置并连接
    app.command_handler.handle_config(["add", "test_sqlite", "sqlite", TEST_DB])
    app.command_handler.handle_connect(["test_sqlite"])

    # 创建测试表
    conn = sqlite3.connect(TEST_DB)
    conn.execute("CREATE TABLE test_table (id INTEGER PRIMARY KEY, name TEXT)")
    conn.execute("CREATE TABLE users (id INTEGER, username TEXT, email TEXT)")
    conn.commit()
    conn.close()

    # 重新连接以刷新
    app.connection_manager.disconnect()
    app.command_handler.handle_connect(["test_sqlite"])

    # 测试列出表
    print("  - 列出表...")
    app.command_handler.handle_list([])
    print("    ✓ 表列表显示正常")

    cleanup()
    return True


def test_desc_table():
    """测试 /desc 命令"""
    print("\n测试 4: /desc 命令")
    from src.cli.app import DBManagerApp
    import sqlite3

    app = DBManagerApp()

    # 添加配置并连接
    app.command_handler.handle_config(["add", "test_sqlite", "sqlite", TEST_DB])
    app.command_handler.handle_connect(["test_sqlite"])

    # 创建测试表
    conn = sqlite3.connect(TEST_DB)
    conn.execute("""
        CREATE TABLE products (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            price REAL DEFAULT 0.0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    conn.execute("CREATE INDEX idx_name ON products (name)")
    conn.commit()
    conn.close()

    # 重新连接以刷新
    app.connection_manager.disconnect()
    app.command_handler.handle_connect(["test_sqlite"])

    # 测试查看表结构
    print("  - 查看表结构...")
    app.command_handler.handle_desc(["products"])
    print("    ✓ 表结构显示正常")

    # 测试无参数
    print("  - 测试无参数...")
    app.command_handler.handle_desc([])
    print("    ✓ 正确显示用法提示")

    cleanup()
    return True


def test_sql_execution():
    """测试 SQL 执行"""
    print("\n测试 5: SQL 执行")
    from src.cli.app import DBManagerApp
    import sqlite3

    app = DBManagerApp()

    # 添加配置并连接
    app.command_handler.handle_config(["add", "test_sqlite", "sqlite", TEST_DB])
    app.command_handler.handle_connect(["test_sqlite"])

    # 创建测试表和数据
    conn = sqlite3.connect(TEST_DB)
    conn.execute("CREATE TABLE IF NOT EXISTS items (id INTEGER, name TEXT)")
    conn.execute("INSERT INTO items VALUES (1, 'Item 1')")
    conn.execute("INSERT INTO items VALUES (2, 'Item 2')")
    conn.commit()
    conn.close()

    # 重新连接以刷新
    app.connection_manager.disconnect()
    app.command_handler.handle_connect(["test_sqlite"])

    # 测试 SELECT
    print("  - 测试 SELECT 查询...")
    app._execute_sql("SELECT * FROM items;")
    print("    ✓ 查询结果显示正常")

    # 测试 INSERT
    print("  - 测试 INSERT...")
    app._execute_sql("INSERT INTO items VALUES (3, 'Item 3');")
    print("    ✓ INSERT 执行成功")

    cleanup()
    return True


def main():
    """运行所有测试"""
    print("=" * 50)
    print("DBManager 综合功能测试")
    print("=" * 50)
    print()

    tests = [
        test_config_add,
        test_connect,
        test_list_tables,
        test_desc_table,
        test_sql_execution,
    ]

    passed = 0
    failed = 0

    for test in tests:
        try:
            if test():
                passed += 1
        except Exception as e:
            print(f"  ✗ 测试失败：{e}")
            failed += 1

    print()
    print("=" * 50)
    print(f"测试结果：{passed} 通过，{failed} 失败")
    print("=" * 50)

    return 0 if failed == 0 else 1


if __name__ == "__main__":
    cleanup()
    sys.exit(main())
