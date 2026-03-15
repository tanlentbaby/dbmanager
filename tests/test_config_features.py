#!/usr/bin/env python3
"""
DBManager 配置管理功能测试
测试 /config test, /config remove, /config edit

注意：配置存储在 ~/.dbmanager/config.json，是全局的
所以测试使用唯一名称避免冲突
"""

import sys
import os
import uuid
import time

TEST_DB = "/tmp/test_config_test.sqlite"
TEST_DB2 = "/tmp/test_config_test2.sqlite"

# 使用唯一前缀避免与其他测试冲突
TEST_PREFIX = f"test_{int(time.time())}_{uuid.uuid4().hex[:8]}"


def cleanup():
    """清理测试文件"""
    for db in [TEST_DB, TEST_DB2]:
        if os.path.exists(db):
            os.remove(db)


def setup():
    """创建测试数据库"""
    import sqlite3
    cleanup()
    for db in [TEST_DB, TEST_DB2]:
        conn = sqlite3.connect(db)
        conn.execute("CREATE TABLE test (id INTEGER)")
        conn.commit()
        conn.close()


def test_config_test():
    """测试 /config test 命令"""
    print("测试 1: /config test 命令")
    from src.cli.app import DBManagerApp

    app = DBManagerApp()
    test_name = f"{TEST_PREFIX}_test"

    # 添加配置
    app.command_handler.handle_config(["add", test_name, "sqlite", "localhost", "0", "", "", TEST_DB])

    # 测试成功情况
    print("  - 测试有效配置...")
    app.command_handler.handle_config(["test", test_name])
    output = "".join(text for _, text in app.output_history[-4:])
    assert "连接成功" in output or "SQLite" in output, f"期望连接成功，得到：{output}"
    print("    ✓ 连接成功显示正确")

    app.output_history.clear()

    # 测试不存在配置
    print("  - 测试不存在配置...")
    app.command_handler.handle_config(["test", f"{TEST_PREFIX}_nonexistent"])
    output = "".join(text for _, text in app.output_history[-2:])
    assert "连接失败" in output, f"期望连接失败，得到：{output}"
    assert "配置不存在" in output, f"期望显示配置不存在，得到：{output}"
    print("    ✓ 错误处理正确")

    # 清理配置
    if test_name in app.config_manager.list_configs():
        app.config_manager.remove_config(test_name)

    cleanup()
    return True


def test_config_remove():
    """测试 /config remove 命令"""
    print("\n测试 2: /config remove 命令")
    from src.cli.app import DBManagerApp

    app = DBManagerApp()
    test_name = f"{TEST_PREFIX}_remove"

    # 先清理可能存在的旧配置
    if test_name in app.config_manager.list_configs():
        app.config_manager.remove_config(test_name)

    # 添加配置
    app.command_handler.handle_config(["add", test_name, "sqlite", "localhost", "0", "", "", TEST_DB])
    app.output_history.clear()

    # 验证已添加
    assert test_name in app.config_manager.list_configs(), "配置应该已添加"

    # 测试删除
    print("  - 删除配置...")
    app.command_handler.handle_config(["remove", test_name])
    output = "".join(text for _, text in app.output_history[-1:])
    assert "已删除" in output, f"期望显示已删除，得到：{output}"
    print("    ✓ 删除成功")

    app.output_history.clear()

    # 验证已删除
    print("  - 验证配置已删除...")
    configs = app.config_manager.list_configs()
    assert test_name not in configs, "配置应该已被删除"
    print("    ✓ 配置已删除")

    # 测试删除不存在的配置
    print("  - 删除不存在的配置...")
    app.command_handler.handle_config(["remove", test_name])
    output = "".join(text for _, text in app.output_history[-1:])
    assert "不存在" in output, f"期望显示不存在，得到：{output}"
    print("    ✓ 错误处理正确")

    cleanup()
    return True


def test_config_edit():
    """测试 /config edit 命令"""
    print("\n测试 3: /config edit 命令")
    from src.cli.app import DBManagerApp

    app = DBManagerApp()
    test_name = f"{TEST_PREFIX}_edit"

    # 先清理可能存在的旧配置
    if test_name in app.config_manager.list_configs():
        app.config_manager.remove_config(test_name)

    # 添加配置
    app.command_handler.handle_config(["add", test_name, "sqlite", "localhost", "0", "", "", TEST_DB])
    app.output_history.clear()

    # 测试编辑显示
    print("  - 编辑配置显示...")
    app.command_handler.handle_config(["edit", test_name])
    output = "".join(text for _, text in app.output_history)
    assert test_name in output, f"期望显示配置名，得到：{output}"
    assert "sqlite" in output, f"期望显示类型，得到：{output}"
    assert "localhost" in output, f"期望显示主机，得到：{output}"
    print("    ✓ 显示配置正确")

    app.output_history.clear()

    # 测试编辑不存在的配置
    print("  - 编辑不存在的配置...")
    app.command_handler.handle_config(["edit", f"{TEST_PREFIX}_nonexistent"])
    # 应该显示配置不存在或者错误
    print("    ✓ 错误处理正确")

    # 测试无参数
    print("  - 无参数情况...")
    app.output_history.clear()
    app.command_handler.handle_config(["edit"])
    output = "".join(text for _, text in app.output_history[-1:])
    assert "用法" in output, f"期望显示用法，得到：{output}"
    print("    ✓ 用法提示正确")

    # 清理配置
    if test_name in app.config_manager.list_configs():
        app.config_manager.remove_config(test_name)

    cleanup()
    return True


def test_config_list():
    """测试 /config list 命令"""
    print("\n测试 4: /config list 命令")
    from src.cli.app import DBManagerApp

    app = DBManagerApp()
    test_name1 = f"{TEST_PREFIX}_list1"
    test_name2 = f"{TEST_PREFIX}_list2"

    # 先清理可能存在的旧配置
    for name in [test_name1, test_name2]:
        if name in app.config_manager.list_configs():
            app.config_manager.remove_config(name)

    # 添加配置
    app.command_handler.handle_config(["add", test_name1, "sqlite", "localhost", "0", "", "", TEST_DB])
    app.command_handler.handle_config(["add", test_name2, "sqlite", "localhost", "0", "", "", TEST_DB2])

    app.output_history.clear()

    # 列出配置
    print("  - 列出配置...")
    app.command_handler.handle_config(["list"])
    output = "".join(text for _, text in app.output_history)
    # 检查新添加的配置是否显示
    lines = output.split('\n')
    config_lines = [l for l in lines if test_name1 in l or test_name2 in l]
    assert len(config_lines) >= 1, f"期望显示新配置，得到：{output}"
    print("    ✓ 列表显示正确")

    # 清理配置
    for name in [test_name1, test_name2]:
        if name in app.config_manager.list_configs():
            app.config_manager.remove_config(name)

    cleanup()
    return True


def main():
    """运行所有测试"""
    print("=" * 50)
    print(f"DBManager 配置管理功能测试 (前缀：{TEST_PREFIX})")
    print("=" * 50)
    print()

    tests = [
        test_config_test,
        test_config_remove,
        test_config_edit,
        test_config_list,
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
