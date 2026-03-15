#!/usr/bin/env python3
"""
DBManager 测试脚本 - 验证输出显示功能
"""

import sys


def test_import():
    """测试导入"""
    print("测试 1: 导入模块...")
    try:
        from src.cli.app import DBManagerApp
        from src.cli.commands import CommandHandler
        from src.config.manager import ConfigManager
        from src.database.connection import ConnectionManager
        print("  ✓ 所有模块导入成功")
        return True
    except Exception as e:
        print(f"  ✗ 导入失败：{e}")
        return False


def test_app_create():
    """测试应用创建"""
    print("测试 2: 创建应用...")
    try:
        from src.cli.app import DBManagerApp
        app = DBManagerApp()
        print(f"  ✓ 应用创建成功")
        print(f"    - 输出历史条目：{len(app.output_history)}")
        print(f"    - 配置管理器：{type(app.config_manager).__name__}")
        print(f"    - 连接管理器：{type(app.connection_manager).__name__}")
        return True
    except Exception as e:
        print(f"  ✗ 应用创建失败：{e}")
        return False


def test_commands():
    """测试命令处理"""
    print("测试 3: 命令处理...")
    try:
        from src.cli.app import DBManagerApp
        app = DBManagerApp()

        # 测试 /help
        app.command_handler.handle_help([])
        print("  ✓ /help 命令正常")

        # 测试 /config list
        app.command_handler.handle_config(['list'])
        print("  ✓ /config list 命令正常")

        # 测试 /list (未连接)
        app.command_handler.handle_list([])
        print("  ✓ /list 命令正常 (未连接)")

        # 测试 /connect (无参数)
        app.command_handler.handle_connect([])
        print("  ✓ /connect 命令正常 (无参数)")

        return True
    except Exception as e:
        print(f"  ✗ 命令处理失败：{e}")
        return False


def test_config_manager():
    """测试配置管理器"""
    print("测试 4: 配置管理器...")
    try:
        from src.config.manager import ConfigManager
        manager = ConfigManager()

        # 测试默认配置
        assert manager.settings.get('max_display_rows') == 100
        print("  ✓ 默认配置正常")

        # 测试加密解密
        password = "test_password"
        encrypted = manager.encrypt(password)
        decrypted = manager.decrypt(encrypted)
        assert decrypted == password
        print("  ✓ 加密解密正常")

        # 测试配置列表
        configs = manager.list_configs()
        print(f"  ✓ 配置列表：{len(configs)} 个配置")

        return True
    except Exception as e:
        print(f"  ✗ 配置管理器失败：{e}")
        return False


def test_output_format():
    """测试输出格式化"""
    print("测试 5: 输出格式化...")
    try:
        from src.cli.app import DBManagerApp
        from src.database.connection import QueryResult

        app = DBManagerApp()

        # 测试空结果
        result = QueryResult(affected_rows=5)
        app._format_result(result)
        print("  ✓ 空结果格式化正常")

        # 测试有结果
        result = QueryResult(
            columns=['id', 'name', 'email'],
            rows=[
                (1, 'Alice', 'alice@example.com'),
                (2, 'Bob', 'bob@example.com'),
                (3, 'Charlie', 'charlie@example.com'),
            ],
            affected_rows=3,
            execution_time_ms=12.5
        )
        app._format_result(result)
        print("  ✓ 有结果格式化正常")

        return True
    except Exception as e:
        print(f"  ✗ 输出格式化失败：{e}")
        return False


def main():
    """运行所有测试"""
    print("=" * 50)
    print("DBManager 输出显示功能测试")
    print("=" * 50)
    print()

    tests = [
        test_import,
        test_app_create,
        test_commands,
        test_config_manager,
        test_output_format,
    ]

    passed = 0
    failed = 0

    for test in tests:
        if test():
            passed += 1
        else:
            failed += 1
        print()

    print("=" * 50)
    print(f"测试结果：{passed} 通过，{failed} 失败")
    print("=" * 50)

    return 0 if failed == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
