#!/usr/bin/env python3
"""
DBManager 事务管理功能测试
"""

import sys
import os

# 添加项目根目录到路径
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


def test_transaction_state():
    """测试事务状态管理"""
    print("测试 1: 事务状态管理")
    from src.database.connection import ConnectionManager
    from src.config.manager import ConfigManager

    config_mgr = ConfigManager()
    conn_mgr = ConnectionManager(config_mgr)

    # 初始状态
    assert not conn_mgr.in_transaction, "初始状态应该没有事务"
    print("    ✓ 初始状态：无事务")

    # 创建测试配置
    test_name = "test_txn_" + str(int(__import__('time').time()))
    config_mgr.add_config(test_name, 'sqlite', 'localhost', 0, '', '', ':memory:')

    # 连接数据库
    conn_mgr.connect(test_name)
    print("    ✓ 连接数据库")

    return True


def test_begin_transaction():
    """测试开始事务"""
    print("\n测试 2: 开始事务")
    from src.database.connection import ConnectionManager
    from src.config.manager import ConfigManager

    config_mgr = ConfigManager()
    conn_mgr = ConnectionManager(config_mgr)

    test_name = "test_begin_" + str(int(__import__('time').time()))
    config_mgr.add_config(test_name, 'sqlite', 'localhost', 0, '', '', ':memory:')
    conn_mgr.connect(test_name)

    # 开始事务
    conn_mgr.begin_transaction()
    assert conn_mgr.in_transaction, "开始事务后应该有事务"
    print("    ✓ begin_transaction() 设置 in_transaction=True")

    return True


def test_rollback_transaction():
    """测试回滚事务"""
    print("\n测试 3: 回滚事务")
    from src.database.connection import ConnectionManager
    from src.config.manager import ConfigManager

    config_mgr = ConfigManager()
    conn_mgr = ConnectionManager(config_mgr)

    test_name = "test_rollback_" + str(int(__import__('time').time()))
    config_mgr.add_config(test_name, 'sqlite', 'localhost', 0, '', '', ':memory:')
    conn_mgr.connect(test_name)

    # 创建测试表
    conn_mgr.execute("CREATE TABLE users (id INTEGER, name TEXT)")
    conn_mgr.execute("INSERT INTO users VALUES (1, 'Alice')")

    # 开始事务并插入数据
    conn_mgr.begin_transaction()
    conn_mgr.execute("INSERT INTO users VALUES (2, 'Bob')")

    # 验证数据在事务中可见
    result = conn_mgr.execute("SELECT COUNT(*) FROM users")
    assert result.rows[0][0] == 2, "事务中应该能看到插入的数据"
    print("    ✓ 事务中插入数据")

    # 回滚事务
    conn_mgr.rollback_transaction()
    assert not conn_mgr.in_transaction, "回滚后应该没有事务"
    print("    ✓ rollback_transaction() 设置 in_transaction=False")

    # 验证数据被回滚
    result = conn_mgr.execute("SELECT COUNT(*) FROM users")
    assert result.rows[0][0] == 1, "回滚后应该只有 1 条数据"
    print("    ✓ 回滚后数据恢复")

    return True


def test_commit_transaction():
    """测试提交事务"""
    print("\n测试 4: 提交事务")
    from src.database.connection import ConnectionManager
    from src.config.manager import ConfigManager

    config_mgr = ConfigManager()
    conn_mgr = ConnectionManager(config_mgr)

    test_name = "test_commit_" + str(int(__import__('time').time()))
    config_mgr.add_config(test_name, 'sqlite', 'localhost', 0, '', '', ':memory:')
    conn_mgr.connect(test_name)

    # 创建测试表
    conn_mgr.execute("CREATE TABLE users (id INTEGER, name TEXT)")
    conn_mgr.execute("INSERT INTO users VALUES (1, 'Alice')")

    # 开始事务并插入数据
    conn_mgr.begin_transaction()
    conn_mgr.execute("INSERT INTO users VALUES (2, 'Bob')")

    # 提交事务
    conn_mgr.commit_transaction()
    assert not conn_mgr.in_transaction, "提交后应该没有事务"
    print("    ✓ commit_transaction() 设置 in_transaction=False")

    # 验证数据已持久化
    result = conn_mgr.execute("SELECT COUNT(*) FROM users")
    assert result.rows[0][0] == 2, "提交后应该有 2 条数据"
    print("    ✓ 提交后数据已持久化")

    return True


def test_transaction_no_auto_commit():
    """测试事务模式下不自动提交"""
    print("\n测试 5: 事务模式下不自动提交")
    from src.database.connection import ConnectionManager
    from src.config.manager import ConfigManager

    config_mgr = ConfigManager()
    conn_mgr = ConnectionManager(config_mgr)

    test_name = "test_nocommit_" + str(int(__import__('time').time()))
    config_mgr.add_config(test_name, 'sqlite', 'localhost', 0, '', '', ':memory:')
    conn_mgr.connect(test_name)

    # 创建测试表
    conn_mgr.execute("CREATE TABLE users (id INTEGER, name TEXT)")

    # 开始事务
    conn_mgr.begin_transaction()

    # 在非事务模式下，INSERT 会自动提交
    # 在事务模式下，INSERT 不会自动提交
    conn_mgr.execute("INSERT INTO users VALUES (1, 'Alice')")

    # 回滚事务
    conn_mgr.rollback_transaction()

    # 验证数据被回滚（说明没有自动提交）
    result = conn_mgr.execute("SELECT COUNT(*) FROM users")
    assert result.rows[0][0] == 0, "事务模式下应该没有自动提交"
    print("    ✓ 事务模式下 execute() 不自动提交")

    return True


def test_rollback_on_error():
    """测试异常时自动回滚"""
    print("\n测试 6: 异常时自动回滚（非事务模式）")
    from src.database.connection import ConnectionManager
    from src.config.manager import ConfigManager

    config_mgr = ConfigManager()
    conn_mgr = ConnectionManager(config_mgr)

    test_name = "test_error_" + str(int(__import__('time').time()))
    config_mgr.add_config(test_name, 'sqlite', 'localhost', 0, '', '', ':memory:')
    conn_mgr.connect(test_name)

    # 创建测试表
    conn_mgr.execute("CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT)")
    conn_mgr.execute("INSERT INTO users VALUES (1, 'Alice')")

    # 执行会失败的 SQL（主键冲突）
    try:
        conn_mgr.execute("INSERT INTO users VALUES (1, 'Bob')")
        assert False, "应该抛出异常"
    except Exception:
        pass

    # 验证原有数据未受影响
    result = conn_mgr.execute("SELECT COUNT(*) FROM users")
    assert result.rows[0][0] == 1, "异常后应该回滚"
    print("    ✓ 异常时自动回滚")

    return True


def test_double_transaction_error():
    """测试双重开始事务的警告"""
    print("\n测试 7: 双重开始事务")
    from src.database.connection import ConnectionManager
    from src.config.manager import ConfigManager

    config_mgr = ConfigManager()
    conn_mgr = ConnectionManager(config_mgr)

    test_name = "test_double_" + str(int(__import__('time').time()))
    config_mgr.add_config(test_name, 'sqlite', 'localhost', 0, '', '', ':memory:')
    conn_mgr.connect(test_name)

    # 开始事务
    conn_mgr.begin_transaction()

    # 再次开始事务（应该被允许，但会重置状态）
    conn_mgr.begin_transaction()
    assert conn_mgr.in_transaction, "双重 begin 后应该有事务"
    print("    ✓ 双重 begin_transaction() 被允许")

    return True


def test_commit_without_transaction_error():
    """测试无事务时提交抛出异常"""
    print("\n测试 8: 无事务时提交抛出异常")
    from src.database.connection import ConnectionManager
    from src.config.manager import ConfigManager

    config_mgr = ConfigManager()
    conn_mgr = ConnectionManager(config_mgr)

    test_name = "test_noTxn_" + str(int(__import__('time').time()))
    config_mgr.add_config(test_name, 'sqlite', 'localhost', 0, '', '', ':memory:')
    conn_mgr.connect(test_name)

    # 无事务时提交应该抛出异常
    try:
        conn_mgr.commit_transaction()
        assert False, "应该抛出异常"
    except RuntimeError as e:
        assert "没有活动的事务" in str(e)
        print("    ✓ commit_transaction() 抛出正确异常")

    return True


def main():
    """运行所有测试"""
    print("=" * 60)
    print("DBManager 事务管理功能测试")
    print("=" * 60)

    tests = [
        test_transaction_state,
        test_begin_transaction,
        test_rollback_transaction,
        test_commit_transaction,
        test_transaction_no_auto_commit,
        test_rollback_on_error,
        test_double_transaction_error,
        test_commit_without_transaction_error,
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
