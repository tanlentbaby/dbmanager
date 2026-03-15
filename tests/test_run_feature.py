#!/usr/bin/env python3
"""
DBManager /run 命令功能测试
"""

import sys
import os
import uuid
import time

TEST_DB = "/tmp/test_run_feature.sqlite"
TEST_SQL = "/tmp/test_run_feature.sql"

# 使用唯一前缀避免冲突
TEST_PREFIX = f"run_{int(time.time())}_{uuid.uuid4().hex[:8]}"


def cleanup():
    """清理测试文件"""
    for f in [TEST_DB, TEST_SQL]:
        if os.path.exists(f):
            os.remove(f)


def setup():
    """创建测试文件"""
    cleanup()

    # 创建测试 SQL 文件
    sql_content = """-- 创建表
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY,
    username TEXT NOT NULL,
    email TEXT UNIQUE
);

-- 插入数据
INSERT INTO users VALUES (1, 'admin', 'admin@test.com');
INSERT INTO users VALUES (2, 'user1', 'user1@test.com');

-- 查询
SELECT * FROM users;
"""

    with open(TEST_SQL, 'w', encoding='utf-8') as f:
        f.write(sql_content)


def test_run_file():
    """测试执行 SQL 文件"""
    print("测试 1: 执行 SQL 文件")
    from src.cli.app import DBManagerApp

    app = DBManagerApp()
    test_name = f"{TEST_PREFIX}_db"

    # 添加配置并连接
    app.command_handler.handle_config(["add", test_name, "sqlite", "localhost", "0", "", "", TEST_DB])
    app.command_handler.handle_connect([test_name])

    app.output_history.clear()

    # 执行文件
    app.command_handler.handle_run([TEST_SQL])
    output = "".join(text for _, text in app.output_history)

    # 验证结果
    assert "执行完成" in output, f"期望显示执行完成，得到：{output}"
    assert "成功 4 条" in output or "成功 3 条" in output, f"期望显示成功条数，得到：{output}"
    print("    ✓ SQL 文件执行成功")

    # 验证表已创建
    tables = app.connection_manager.get_tables()
    assert "users" in tables, f"期望表 users 存在，得到：{tables}"
    print("    ✓ 表已创建")

    # 清理配置
    if test_name in app.config_manager.list_configs():
        app.config_manager.remove_config(test_name)

    cleanup()
    return True


def test_run_nonexistent_file():
    """测试执行不存在的文件"""
    print("\n测试 2: 执行不存在的文件")
    from src.cli.app import DBManagerApp

    app = DBManagerApp()
    test_name = f"{TEST_PREFIX}_db2"

    # 先连接
    app.command_handler.handle_config(["add", test_name, "sqlite", "localhost", "0", "", "", TEST_DB])
    app.command_handler.handle_connect([test_name])

    app.output_history.clear()
    app.command_handler.handle_run(["/nonexistent/file.sql"])
    output = "".join(text for _, text in app.output_history[-1:])

    # 清理
    if test_name in app.config_manager.list_configs():
        app.config_manager.remove_config(test_name)

    assert "文件不存在" in output, f"期望显示文件不存在，得到：{output}"
    print("    ✓ 错误处理正确")

    return True


def test_run_not_connected():
    """测试未连接时执行文件"""
    print("\n测试 3: 未连接时执行文件")
    from src.cli.app import DBManagerApp

    app = DBManagerApp()

    app.output_history.clear()
    app.command_handler.handle_run([TEST_SQL])
    output = "".join(text for _, text in app.output_history[-1:])

    assert "未连接数据库" in output, f"期望显示未连接，得到：{output}"
    print("    ✓ 错误处理正确")

    return True


def test_run_no_args():
    """测试无参数情况"""
    print("\n测试 4: 无参数情况")
    from src.cli.app import DBManagerApp

    app = DBManagerApp()

    app.output_history.clear()
    app.command_handler.handle_run([])
    output = "".join(text for _, text in app.output_history[-1:])

    assert "用法" in output, f"期望显示用法，得到：{output}"
    print("    ✓ 用法提示正确")

    return True


def main():
    """运行所有测试"""
    print("=" * 50)
    print(f"DBManager /run 命令功能测试 (前缀：{TEST_PREFIX})")
    print("=" * 50)
    print()

    tests = [
        test_run_file,
        test_run_nonexistent_file,
        test_run_not_connected,
        test_run_no_args,
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

    return 0 if failed == 0 else 1


if __name__ == "__main__":
    setup()
    sys.exit(main())
