#!/usr/bin/env python3
"""
测试 /config test, /config remove, /config edit 命令
"""

import sys
import os

TEST_DB = "/tmp/test_config_demo.sqlite"

def setup_test_db():
    """创建测试数据库"""
    import sqlite3
    if os.path.exists(TEST_DB):
        os.remove(TEST_DB)
    conn = sqlite3.connect(TEST_DB)
    conn.execute("CREATE TABLE test (id INTEGER)")
    conn.commit()
    conn.close()

def cleanup():
    """清理测试文件"""
    if os.path.exists(TEST_DB):
        os.remove(TEST_DB)

def demo():
    """演示命令"""
    from src.cli.app import DBManagerApp

    print("=" * 70)
    print("DBManager /config test/remove/edit 命令演示")
    print("=" * 70)
    print()

    app = DBManagerApp()

    # 1. 添加测试配置
    print("[1] 添加测试配置...")
    app.command_handler.handle_config(["add", "test1", "sqlite", "localhost", "0", "", "", TEST_DB])
    app.command_handler.handle_config(["add", "test2", "sqlite", ":memory:"])
    app.command_handler.handle_config(["add", "local_mysql", "mysql", "localhost", "3306", "root", "password", "testdb"])
    print()

    # 2. 列出配置
    print("[2] 列出配置...")
    app.command_handler.handle_config(["list"])
    for style, text in app.output_history[-6:]:
        print(text, end="")
    print()
    app.output_history.clear()

    # 3. 测试连接
    print("[3] 测试连接 (test1)...")
    app.command_handler.handle_config(["test", "test1"])
    for style, text in app.output_history[-4:]:
        print(text, end="")
    print()
    app.output_history.clear()

    # 4. 测试不存在的配置
    print("[4] 测试不存在的配置...")
    app.command_handler.handle_config(["test", "nonexistent"])
    for style, text in app.output_history[-2:]:
        print(text, end="")
    print()
    app.output_history.clear()

    # 5. 测试 MySQL 配置（应该失败）
    print("[5] 测试 MySQL 配置（预期失败）...")
    app.command_handler.handle_config(["test", "local_mysql"])
    for style, text in app.output_history[-3:]:
        print(text, end="")
    print()
    app.output_history.clear()

    # 6. 编辑配置
    print("[6] 编辑配置...")
    app.command_handler.handle_config(["edit", "test1"])
    for style, text in app.output_history[-7:]:
        print(text, end="")
    print()
    app.output_history.clear()

    # 7. 删除配置
    print("[7] 删除配置 (test2)...")
    app.command_handler.handle_config(["remove", "test2"])
    for style, text in app.output_history[-1:]:
        print(text, end="")
    print()
    app.output_history.clear()

    # 8. 再次列出配置
    print("[8] 再次列出配置...")
    app.command_handler.handle_config(["list"])
    for style, text in app.output_history[-5:]:
        print(text, end="")
    print()

    # 9. 删除当前连接的配置（应该失败）
    print("[9] 删除当前连接的配置（先连接再删除）...")
    app.command_handler.handle_connect(["test1"])
    for style, text in app.output_history[-1:]:
        print(text, end="")

    app.command_handler.handle_config(["remove", "test1"])
    for style, text in app.output_history[-1:]:
        print(text, end="")
    print()

    print("=" * 70)
    print("演示完成")
    print("=" * 70)

if __name__ == "__main__":
    setup_test_db()
    demo()
    cleanup()
