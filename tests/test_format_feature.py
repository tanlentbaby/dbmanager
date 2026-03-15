#!/usr/bin/env python3
"""
DBManager /format 命令功能测试
"""

import sys
import os

TEST_DB = "/tmp/test_format_feature.sqlite"


def cleanup():
    """清理测试文件"""
    if os.path.exists(TEST_DB):
        os.remove(TEST_DB)


def setup():
    """创建测试数据库"""
    cleanup()
    # 创建测试数据库
    import sqlite3
    conn = sqlite3.connect(TEST_DB)
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE products (
            id INTEGER PRIMARY KEY,
            name TEXT NOT NULL,
            price REAL DEFAULT 0.0
        )
    """)
    cursor.execute("INSERT INTO products VALUES (1, 'Apple', 1.50)")
    cursor.execute("INSERT INTO products VALUES (2, 'Banana', 0.75)")
    cursor.execute("INSERT INTO products VALUES (3, 'Orange', 2.00)")
    conn.commit()
    conn.close()


def test_format_default():
    """测试默认格式（table）"""
    print("测试 1: 默认格式 (table)")
    from src.cli.app import DBManagerApp

    app = DBManagerApp()
    app.command_handler.handle_config(["add", "format_test", "sqlite", "localhost", "0", "", "", TEST_DB])
    app.command_handler.handle_connect(["format_test"])

    app.output_history.clear()

    # 执行查询，默认应该是 table 格式
    app._execute_sql("SELECT * FROM products LIMIT 2;")
    output = "".join(text for _, text in app.output_history)

    assert "│" in output, f"期望表格格式包含 │，得到：{output}"
    assert "Apple" in output, f"期望包含 Apple，得到：{output}"
    print("    ✓ 默认 table 格式正确")

    # 清理
    if "format_test" in app.config_manager.list_configs():
        app.config_manager.remove_config("format_test")

    return True


def test_format_json():
    """测试 JSON 格式"""
    print("\n测试 2: JSON 格式")
    from src.cli.app import DBManagerApp

    app = DBManagerApp()
    app.command_handler.handle_config(["add", "format_test2", "sqlite", "localhost", "0", "", "", TEST_DB])
    app.command_handler.handle_connect(["format_test2"])

    app.output_history.clear()

    # 设置为 JSON 格式
    app.command_handler.handle_format(["json"])
    output = "".join(text for _, text in app.output_history[-1:])
    assert "格式已设置为：json" in output, f"期望格式设置成功，得到：{output}"

    # 执行查询
    app.output_history.clear()
    app._execute_sql("SELECT * FROM products LIMIT 2;")
    output = "".join(text for _, text in app.output_history)

    assert '"id"' in output, f"期望 JSON 格式包含 id，得到：{output}"
    assert '"name"' in output, f"期望 JSON 格式包含 name，得到：{output}"
    assert "Apple" in output, f"期望包含 Apple，得到：{output}"
    print("    ✓ JSON 格式正确")

    # 清理
    if "format_test2" in app.config_manager.list_configs():
        app.config_manager.remove_config("format_test2")

    return True


def test_format_csv():
    """测试 CSV 格式"""
    print("\n测试 3: CSV 格式")
    from src.cli.app import DBManagerApp

    app = DBManagerApp()
    app.command_handler.handle_config(["add", "format_test3", "sqlite", "localhost", "0", "", "", TEST_DB])
    app.command_handler.handle_connect(["format_test3"])

    app.output_history.clear()

    # 设置为 CSV 格式
    app.command_handler.handle_format(["csv"])
    output = "".join(text for _, text in app.output_history[-1:])
    assert "格式已设置为：csv" in output

    # 执行查询
    app.output_history.clear()
    app._execute_sql("SELECT * FROM products LIMIT 2;")
    output = "".join(text for _, text in app.output_history)

    assert "id,name,price" in output, f"期望 CSV 表头，得到：{output}"
    assert "Apple" in output, f"期望包含 Apple，得到：{output}"
    print("    ✓ CSV 格式正确")

    # 清理
    if "format_test3" in app.config_manager.list_configs():
        app.config_manager.remove_config("format_test3")

    return True


def test_format_markdown():
    """测试 Markdown 格式"""
    print("\n测试 4: Markdown 格式")
    from src.cli.app import DBManagerApp

    app = DBManagerApp()
    app.command_handler.handle_config(["add", "format_test4", "sqlite", "localhost", "0", "", "", TEST_DB])
    app.command_handler.handle_connect(["format_test4"])

    app.output_history.clear()

    # 设置为 Markdown 格式
    app.command_handler.handle_format(["markdown"])
    output = "".join(text for _, text in app.output_history[-1:])
    assert "格式已设置为：markdown" in output

    # 执行查询
    app.output_history.clear()
    app._execute_sql("SELECT * FROM products LIMIT 2;")
    output = "".join(text for _, text in app.output_history)

    assert "|" in output, f"期望 Markdown 表格包含 |，得到：{output}"
    assert "---" in output, f"期望 Markdown 分隔线，得到：{output}"
    print("    ✓ Markdown 格式正确")

    # 清理
    if "format_test4" in app.config_manager.list_configs():
        app.config_manager.remove_config("format_test4")

    return True


def test_format_invalid():
    """测试无效格式"""
    print("\n测试 5: 无效格式")
    from src.cli.app import DBManagerApp

    app = DBManagerApp()

    app.output_history.clear()
    app.command_handler.handle_format(["invalid"])
    # 获取所有输出，不只是最后一行
    output = "".join(text for _, text in app.output_history)

    assert "不支持的格式" in output, f"期望错误提示，得到：{output}"
    print("    ✓ 错误处理正确")

    return True


def test_format_no_args():
    """测试无参数情况"""
    print("\n测试 6: 无参数情况")
    from src.cli.app import DBManagerApp

    app = DBManagerApp()

    app.output_history.clear()
    app.command_handler.handle_format([])
    # 获取所有输出
    output = "".join(text for _, text in app.output_history)

    assert "当前输出格式" in output or "用法" in output, f"期望显示用法或当前格式，得到：{output}"
    print("    ✓ 用法提示正确")

    return True


def main():
    """运行所有测试"""
    print("=" * 50)
    print("DBManager /format 命令功能测试")
    print("=" * 50)
    print()

    setup()

    tests = [
        test_format_default,
        test_format_json,
        test_format_csv,
        test_format_markdown,
        test_format_invalid,
        test_format_no_args,
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
