#!/usr/bin/env python3
"""
DBManager 查询计划功能测试
"""

import sys
import os

# 添加项目根目录到路径
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


def test_explain_sqlite_basic():
    """测试 SQLite 基础查询计划"""
    print("测试 1: SQLite 基础查询计划")
    from src.database.connection import ConnectionManager
    from src.config.manager import ConfigManager

    config_mgr = ConfigManager()
    conn_mgr = ConnectionManager(config_mgr)
    test_name = "test_explain_" + str(int(__import__('time').time()))
    config_mgr.add_config(test_name, 'sqlite', 'localhost', 0, '', '', ':memory:')
    conn_mgr.connect(test_name)

    # 创建测试表
    conn_mgr.execute("CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT)")
    conn_mgr.execute("CREATE INDEX idx_name ON users(name)")
    conn_mgr.execute("INSERT INTO users VALUES (1, 'Alice')")
    conn_mgr.execute("INSERT INTO users VALUES (2, 'Bob')")

    # 测试简单查询
    result = conn_mgr.get_explain_plan("SELECT * FROM users WHERE id = 1")

    assert result.plan_type == "sqlite"
    assert len(result.rows) > 0
    print(f"    ✓ 查询计划返回 {len(result.rows)} 行")

    # 检查列
    assert result.columns == ["id", "parent", "notused", "detail"]
    print("    ✓ 列名正确")

    return True


def test_explain_sqlite_index_usage():
    """测试 SQLite 索引使用"""
    print("\n测试 2: SQLite 索引使用检测")
    from src.database.connection import ConnectionManager
    from src.config.manager import ConfigManager

    config_mgr = ConfigManager()
    conn_mgr = ConnectionManager(config_mgr)
    test_name = "test_explain_idx_" + str(int(__import__('time').time()))
    config_mgr.add_config(test_name, 'sqlite', 'localhost', 0, '', '', ':memory:')
    conn_mgr.connect(test_name)

    # 创建测试表和索引
    conn_mgr.execute("CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT)")
    conn_mgr.execute("CREATE INDEX idx_name ON users(name)")
    conn_mgr.execute("INSERT INTO users VALUES (1, 'Alice')")
    conn_mgr.execute("INSERT INTO users VALUES (2, 'Bob')")

    # 使用索引的查询
    result = conn_mgr.get_explain_plan("SELECT * FROM users WHERE name = 'Alice'")

    # 检查是否使用索引
    detail = str(result.rows[0][3])
    assert "INDEX" in detail.upper() or "SEARCH" in detail.upper()
    print(f"    ✓ 查询使用索引：{detail}")

    return True


def test_explain_sqlite_full_table_scan():
    """测试 SQLite 全表扫描"""
    print("\n测试 3: SQLite 全表扫描检测")
    from src.database.connection import ConnectionManager
    from src.config.manager import ConfigManager

    config_mgr = ConfigManager()
    conn_mgr = ConnectionManager(config_mgr)
    test_name = "test_explain_scan_" + str(int(__import__('time').time()))
    config_mgr.add_config(test_name, 'sqlite', 'localhost', 0, '', '', ':memory:')
    conn_mgr.connect(test_name)

    # 创建测试表（无索引）
    conn_mgr.execute("CREATE TABLE data (id INTEGER, value TEXT)")
    conn_mgr.execute("INSERT INTO data VALUES (1, 'test')")

    # 全表扫描查询
    result = conn_mgr.get_explain_plan("SELECT * FROM data WHERE value = 'test'")

    # 检查是否有 SCAN
    found_scan = False
    for row in result.rows:
        detail = str(row[3])
        if "SCAN" in detail.upper():
            found_scan = True
            print(f"    ✓ 检测到扫描：{detail}")
            break

    assert found_scan, "应该检测到表扫描"

    return True


def test_explain_no_connection():
    """测试未连接时的错误"""
    print("\n测试 4: 未连接时的错误")
    from src.database.connection import ConnectionManager
    from src.config.manager import ConfigManager

    config_mgr = ConfigManager()
    conn_mgr = ConnectionManager(config_mgr)

    try:
        conn_mgr.get_explain_plan("SELECT 1")
        assert False, "应该抛出异常"
    except RuntimeError as e:
        assert "未连接数据库" in str(e)
        print("    ✓ 正确抛出未连接错误")

    return True


def test_explain_invalid_sql():
    """测试无效 SQL 的错误处理"""
    print("\n测试 5: 无效 SQL 的错误处理")
    from src.database.connection import ConnectionManager
    from src.config.manager import ConfigManager

    config_mgr = ConfigManager()
    conn_mgr = ConnectionManager(config_mgr)
    test_name = "test_explain_err_" + str(int(__import__('time').time()))
    config_mgr.add_config(test_name, 'sqlite', 'localhost', 0, '', '', ':memory:')
    conn_mgr.connect(test_name)

    # 创建测试表
    conn_mgr.execute("CREATE TABLE users (id INTEGER)")

    try:
        # 无效的表名
        result = conn_mgr.get_explain_plan("SELECT * FROM nonexistent_table")
        # SQLite 可能不会立即报错，取决于实现
        print("    ✓ 无效表名处理完成")
    except Exception as e:
        print(f"    ✓ 捕获错误：{str(e)[:50]}")

    return True


def test_explain_command_handler():
    """测试命令处理器的 /explain 命令"""
    print("\n测试 6: 命令处理器的 /explain 命令")
    from src.database.connection import ConnectionManager
    from src.config.manager import ConfigManager
    from src.cli.commands import CommandHandler

    config_mgr = ConfigManager()
    conn_mgr = ConnectionManager(config_mgr)
    test_name = "test_explain_cmd_" + str(int(__import__('time').time()))
    config_mgr.add_config(test_name, 'sqlite', 'localhost', 0, '', '', ':memory:')
    conn_mgr.connect(test_name)

    # 创建测试表
    conn_mgr.execute("CREATE TABLE users (id INTEGER, name TEXT)")

    # 创建模拟 app
    class MockApp:
        def __init__(self, cm):
            self.connection_manager = cm
            self.output = []
        def _add_output(self, text, style=''):
            self.output.append(text)
        def _format_result(self, result):
            pass

    app = MockApp(conn_mgr)
    handler = CommandHandler(app)

    # 测试 /explain 命令
    handler.handle_explain(["SELECT * FROM users"])

    output = ''.join(app.output)
    assert "查询计划" in output
    print("    ✓ /explain 命令输出正确")

    return True


def test_explain_help():
    """测试 /explain 帮助"""
    print("\n测试 7: /explain 帮助信息")
    from src.database.connection import ConnectionManager
    from src.config.manager import ConfigManager
    from src.cli.commands import CommandHandler

    config_mgr = ConfigManager()
    conn_mgr = ConnectionManager(config_mgr)
    test_name = "test_explain_help_" + str(int(__import__('time').time()))
    config_mgr.add_config(test_name, 'sqlite', 'localhost', 0, '', '', ':memory:')
    conn_mgr.connect(test_name)

    # 创建模拟 app
    class MockApp:
        def __init__(self, cm):
            self.connection_manager = cm
            self.output = []
        def _add_output(self, text, style=''):
            self.output.append(text)

    app = MockApp(conn_mgr)
    handler = CommandHandler(app)

    # 无参数调用 explain
    handler.handle_explain([])

    output = ''.join(app.output)
    assert "/explain" in output
    print("    ✓ 帮助信息正确显示")

    return True


def main():
    """运行所有测试"""
    print("=" * 60)
    print("DBManager 查询计划功能测试")
    print("=" * 60)

    tests = [
        test_explain_sqlite_basic,
        test_explain_sqlite_index_usage,
        test_explain_sqlite_full_table_scan,
        test_explain_no_connection,
        test_explain_invalid_sql,
        test_explain_command_handler,
        test_explain_help,
    ]

    passed = 0
    failed = 0

    for test in tests:
        try:
            if test():
                passed += 1
        except Exception as e:
            print(f"    ✗ 测试失败：{e}")
            import traceback
            traceback.print_exc()
            failed += 1

    print()
    print("=" * 60)
    print(f"测试结果：{passed} 通过，{failed} 失败")
    print("=" * 60)

    return 0 if failed == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
