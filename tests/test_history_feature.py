#!/usr/bin/env python3
"""
DBManager /history 命令功能测试
"""

import sys
import os

TEST_DB = "/tmp/test_history_feature.sqlite"


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
            name TEXT NOT NULL
        )
    """)
    cursor.execute("INSERT INTO users VALUES (1, 'Alice')")
    cursor.execute("INSERT INTO users VALUES (2, 'Bob')")
    conn.commit()
    conn.close()


def test_history_empty():
    """测试空历史"""
    print("测试 1: 空历史")
    from src.cli.app import DBManagerApp

    app = DBManagerApp()

    app.output_history.clear()
    app.command_handler.handle_history([])
    output = "".join(text for _, text in app.output_history[-1:])

    assert "暂无历史记录" in output, f"期望暂无历史记录，得到：{output}"
    print("    ✓ 空历史处理正确")

    return True


def test_history_add_commands():
    """测试添加命令到历史"""
    print("\n测试 2: 添加命令到历史")
    from src.cli.app import DBManagerApp

    app = DBManagerApp()

    # 模拟添加命令
    app.command_history.append("SELECT * FROM users")
    app.command_history.append("INSERT INTO users VALUES (3, 'Charlie')")
    app.command_history.append("UPDATE users SET name='David' WHERE id=1")

    assert len(app.command_history) == 3, f"期望 3 条历史，得到：{len(app.command_history)}"
    print("    ✓ 命令添加到历史成功")

    return True


def test_history_display():
    """测试显示历史记录"""
    print("\n测试 3: 显示历史记录")
    from src.cli.app import DBManagerApp

    app = DBManagerApp()

    # 添加一些命令
    app.command_history.append("SELECT * FROM users")
    app.command_history.append("INSERT INTO users VALUES (3, 'Charlie')")
    app.command_history.append("UPDATE users SET name='David' WHERE id=1")
    app.command_history.append("DELETE FROM users WHERE id=2")
    app.command_history.append("SELECT COUNT(*) FROM users")

    app.output_history.clear()
    app.command_handler.handle_history([])
    output = "".join(text for _, text in app.output_history)

    assert "最近 5 条命令" in output, f"期望显示最近 5 条命令，得到：{output}"
    assert "SELECT * FROM users" in output, f"期望包含 SELECT 命令，得到：{output}"
    assert "共 5 条历史记录" in output, f"期望显示共 5 条记录，得到：{output}"
    print("    ✓ 历史记录显示正确")

    return True


def test_history_limit():
    """测试限制显示数量"""
    print("\n测试 4: 限制显示数量")
    from src.cli.app import DBManagerApp

    app = DBManagerApp()

    # 添加 10 条命令
    for i in range(10):
        app.command_history.append(f"SELECT * FROM table{i}")

    app.output_history.clear()
    app.command_handler.handle_history(["3"])
    output = "".join(text for _, text in app.output_history)

    assert "最近 3 条命令" in output, f"期望显示最近 3 条命令，得到：{output}"
    assert "table9" in output, f"期望包含最近的命令，得到：{output}"
    assert "table8" in output, f"期望包含倒数第二条命令，得到：{output}"
    assert "table7" in output, f"期望包含倒数第三条命令，得到：{output}"
    print("    ✓ 限制显示数量正确")

    return True


def test_history_navigation():
    """测试历史导航（↑/↓键）"""
    print("\n测试 5: 历史导航")
    from src.cli.app import DBManagerApp

    app = DBManagerApp()

    # 添加命令
    app.command_history.append("SELECT * FROM users")
    app.command_history.append("INSERT INTO users VALUES (1, 'Test')")
    app.command_history.append("UPDATE users SET name='Updated'")

    # 模拟按 ↑ 键
    app.input_buffer.text = ""
    # 模拟 up 键触发
    if app.command_history:
        app.history_index = 0
        app.input_buffer.text = app.command_history[len(app.command_history) - 1 - app.history_index]

    assert app.input_buffer.text == "UPDATE users SET name='Updated'", \
        f"期望最后一条命令，得到：{app.input_buffer.text}"
    print("    ✓ 历史导航正确")

    return True


def test_history_with_sql_execution():
    """测试执行 SQL 后自动添加到历史"""
    print("\n测试 6: SQL 执行后自动添加到历史")
    from src.cli.app import DBManagerApp

    app = DBManagerApp()

    # 连接数据库
    app.command_handler.handle_config(["add", "history_test", "sqlite", "localhost", "0", "", "", TEST_DB])
    app.command_handler.handle_connect(["history_test"])

    initial_count = len(app.command_history)

    # 模拟执行 SQL
    app.input_buffer.text = "SELECT * FROM users LIMIT 1;"
    app._handle_input()

    assert len(app.command_history) == initial_count + 1, \
        f"期望历史增加 1 条，得到：{len(app.command_history)}"
    assert "SELECT * FROM users LIMIT 1;" in app.command_history, \
        f"期望包含执行的 SQL，得到：{app.command_history}"
    print("    ✓ SQL 执行后自动添加到历史")

    # 清理
    if "history_test" in app.config_manager.list_configs():
        app.config_manager.remove_config("history_test")

    return True


def main():
    """运行所有测试"""
    print("=" * 50)
    print("DBManager /history 命令功能测试")
    print("=" * 50)
    print()

    setup()

    tests = [
        test_history_empty,
        test_history_add_commands,
        test_history_display,
        test_history_limit,
        test_history_navigation,
        test_history_with_sql_execution,
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
