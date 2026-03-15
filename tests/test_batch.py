#!/usr/bin/env python3
"""
DBManager 批量执行功能测试
"""

import sys
import os
import tempfile

# 添加项目根目录到路径
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


def create_test_sql_file(content: str) -> str:
    """创建临时 SQL 文件"""
    fd, path = tempfile.mkstemp(suffix='.sql')
    with os.fdopen(fd, 'w', encoding='utf-8') as f:
        f.write(content)
    return path


def test_batch_file_success():
    """测试批量执行 SQL 文件（成功）"""
    print("测试 1: 批量执行 SQL 文件（成功）")
    from src.database.connection import ConnectionManager
    from src.config.manager import ConfigManager
    from src.cli.commands import CommandHandler
    from src.cli.app import DBManagerApp

    # 创建测试配置
    config_mgr = ConfigManager()
    conn_mgr = ConnectionManager(config_mgr)
    test_name = "test_batch_" + str(int(__import__('time').time()))
    config_mgr.add_config(test_name, 'sqlite', 'localhost', 0, '', '', ':memory:')
    conn_mgr.connect(test_name)

    # 创建模拟 app
    class MockApp:
        def __init__(self):
            self.connection_manager = conn_mgr
            self.output = []

        def _add_output(self, text, style=""):
            self.output.append(text)

        def _format_result(self, result):
            if result.columns and result.rows:
                self.output.append(f"Columns: {result.columns}")
                self.output.append(f"Rows: {result.rows}")

    app = MockApp()

    # 创建命令处理器
    handler = CommandHandler(app)

    # 创建测试 SQL 文件
    sql_content = """
    CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT);
    INSERT INTO users VALUES (1, 'Alice');
    INSERT INTO users VALUES (2, 'Bob');
    INSERT INTO users VALUES (3, 'Charlie');
    SELECT * FROM users;
    """
    sql_file = create_test_sql_file(sql_content)

    try:
        # 执行批量操作
        handler.handle_batch(['file', sql_file])

        # 验证输出包含提交信息
        output_text = ''.join(app.output)
        assert "事务已提交" in output_text, "应该提交事务"
        assert "执行成功" in output_text, "应该显示执行成功"
        print("    ✓ 批量执行成功，事务已提交")

        # 验证数据已插入
        result = conn_mgr.execute("SELECT COUNT(*) FROM users")
        assert result.rows[0][0] == 3, "应该有 3 条数据"
        print("    ✓ 数据已正确插入")

    finally:
        os.unlink(sql_file)

    return True


def test_batch_file_rollback_on_error():
    """测试批量执行 SQL 文件（失败回滚）"""
    print("\n测试 2: 批量执行 SQL 文件（失败回滚）")
    from src.database.connection import ConnectionManager
    from src.config.manager import ConfigManager
    from src.cli.commands import CommandHandler
    from src.cli.app import DBManagerApp

    # 创建测试配置
    config_mgr = ConfigManager()
    conn_mgr = ConnectionManager(config_mgr)
    test_name = "test_batch_err_" + str(int(__import__('time').time()))
    config_mgr.add_config(test_name, 'sqlite', 'localhost', 0, '', '', ':memory:')
    conn_mgr.connect(test_name)

    # 创建模拟 app
    class MockApp:
        def __init__(self):
            self.connection_manager = conn_mgr
            self.output = []

        def _add_output(self, text, style=""):
            self.output.append(text)

        def _format_result(self, result):
            pass

    app = MockApp()
    handler = CommandHandler(app)

    # 创建测试 SQL 文件（包含错误）
    # 注意：SQLite 的 DDL (CREATE TABLE) 会隐式提交，所以只测试 DML 回滚
    sql_content = """
    CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT);
    INSERT INTO users VALUES (1, 'Alice');
    INSERT INTO users VALUES (1, 'Bob');  -- 主键冲突
    INSERT INTO users VALUES (3, 'Charlie');
    """
    sql_file = create_test_sql_file(sql_content)

    try:
        # 执行批量操作
        handler.handle_batch(['file', sql_file])

        # 验证输出包含回滚信息
        output_text = ''.join(app.output)
        assert "事务已回滚" in output_text, "应该回滚事务"
        assert "执行失败" in output_text, "应该显示执行失败"
        print("    ✓ 批量执行失败，事务已回滚")

        # 验证数据被回滚（SQLite DDL 会隐式提交，但 DML 会回滚）
        result = conn_mgr.execute("SELECT COUNT(*) FROM users")
        # 回滚后应该没有数据（因为 Alice 和 Charlie 都在事务中插入，被一起回滚）
        assert result.rows[0][0] == 0, "应该没有数据（DML 已回滚）"
        print("    ✓ DML 数据已正确回滚")

    finally:
        os.unlink(sql_file)

    return True


def test_batch_run_success():
    """测试批量执行 SQL 语句（成功）"""
    print("\n测试 3: 批量执行 SQL 语句（成功）")
    from src.database.connection import ConnectionManager
    from src.config.manager import ConfigManager
    from src.cli.commands import CommandHandler
    from src.cli.app import DBManagerApp

    # 创建测试配置
    config_mgr = ConfigManager()
    conn_mgr = ConnectionManager(config_mgr)
    test_name = "test_batch_run_" + str(int(__import__('time').time()))
    config_mgr.add_config(test_name, 'sqlite', 'localhost', 0, '', '', ':memory:')
    conn_mgr.connect(test_name)

    # 创建模拟 app
    class MockApp:
        def __init__(self):
            self.connection_manager = conn_mgr
            self.output = []

        def _add_output(self, text, style=""):
            self.output.append(text)

        def _format_result(self, result):
            if result.columns and result.rows:
                self.output.append(f"Columns: {result.columns}")
                self.output.append(f"Rows: {result.rows}")

    app = MockApp()
    handler = CommandHandler(app)

    # 执行批量 SQL 语句
    handler.handle_batch(['run', "CREATE TABLE t (id INTEGER);", "INSERT INTO t VALUES (1);", "INSERT INTO t VALUES (2);"])

    # 验证输出包含提交信息
    output_text = ''.join(app.output)
    assert "事务已提交" in output_text, "应该提交事务"
    print("    ✓ 批量执行 SQL 语句成功")

    # 验证数据已插入
    result = conn_mgr.execute("SELECT COUNT(*) FROM t")
    assert result.rows[0][0] == 2, "应该有 2 条数据"
    print("    ✓ 数据已正确插入")

    return True


def test_batch_run_rollback_on_error():
    """测试批量执行 SQL 语句（失败回滚）"""
    print("\n测试 4: 批量执行 SQL 语句（失败回滚）")
    from src.database.connection import ConnectionManager
    from src.config.manager import ConfigManager
    from src.cli.commands import CommandHandler
    from src.cli.app import DBManagerApp

    # 创建测试配置
    config_mgr = ConfigManager()
    conn_mgr = ConnectionManager(config_mgr)
    test_name = "test_batch_run_err_" + str(int(__import__('time').time()))
    config_mgr.add_config(test_name, 'sqlite', 'localhost', 0, '', '', ':memory:')
    conn_mgr.connect(test_name)

    # 创建模拟 app
    class MockApp:
        def __init__(self):
            self.connection_manager = conn_mgr
            self.output = []

        def _add_output(self, text, style=""):
            self.output.append(text)

        def _format_result(self, result):
            pass

    app = MockApp()
    handler = CommandHandler(app)

    # 先创建表（分开执行，避免 DDL 隐式提交影响测试）
    conn_mgr.execute("CREATE TABLE t (id INTEGER PRIMARY KEY)")

    # 执行批量 SQL 语句（包含错误，只测试 DML）
    handler.handle_batch(['run', "INSERT INTO t VALUES (1);", "INSERT INTO t VALUES (2);", "INSERT INTO t VALUES (1);"])

    # 验证输出包含回滚信息
    output_text = ''.join(app.output)
    assert "事务已回滚" in output_text, "应该回滚事务"
    print("    ✓ 批量执行 SQL 语句失败，事务已回滚")

    # 验证数据被回滚（表存在但为空，因为 INSERT 被回滚）
    result = conn_mgr.execute("SELECT COUNT(*) FROM t")
    assert result.rows[0][0] == 0, "表应该为空（INSERT 已回滚）"
    print("    ✓ DML 数据已正确回滚")

    return True


def test_batch_no_connection():
    """测试未连接时批量执行"""
    print("\n测试 5: 未连接时批量执行")
    from src.database.connection import ConnectionManager
    from src.config.manager import ConfigManager
    from src.cli.commands import CommandHandler
    from src.cli.app import DBManagerApp

    # 创建测试配置（不连接）
    config_mgr = ConfigManager()
    conn_mgr = ConnectionManager(config_mgr)

    # 创建模拟 app
    class MockApp:
        def __init__(self):
            self.connection_manager = conn_mgr
            self.output = []

        def _add_output(self, text, style=""):
            self.output.append(text)

    app = MockApp()
    handler = CommandHandler(app)

    # 执行批量操作
    handler.handle_batch(['file', 'test.sql'])

    # 验证输出包含错误信息
    output_text = ''.join(app.output)
    assert "未连接数据库" in output_text, "应该显示未连接错误"
    print("    ✓ 未连接时正确报错")

    return True


def test_batch_with_existing_transaction():
    """测试在已有事务时批量执行"""
    print("\n测试 6: 在已有事务时批量执行")
    from src.database.connection import ConnectionManager
    from src.config.manager import ConfigManager
    from src.cli.commands import CommandHandler
    from src.cli.app import DBManagerApp

    # 创建测试配置
    config_mgr = ConfigManager()
    conn_mgr = ConnectionManager(config_mgr)
    test_name = "test_batch_txn_" + str(int(__import__('time').time()))
    config_mgr.add_config(test_name, 'sqlite', 'localhost', 0, '', '', ':memory:')
    conn_mgr.connect(test_name)

    # 创建模拟 app
    class MockApp:
        def __init__(self):
            self.connection_manager = conn_mgr
            self.output = []

        def _add_output(self, text, style=""):
            self.output.append(text)

    app = MockApp()
    handler = CommandHandler(app)

    # 先开始一个事务
    conn_mgr.begin_transaction()

    # 尝试批量执行
    handler.handle_batch(['run', "SELECT 1;"])

    # 验证输出包含错误信息
    output_text = ''.join(app.output)
    assert "已有活动的事务" in output_text, "应该显示已有事务错误"
    print("    ✓ 已有事务时正确报错")

    # 清理：回滚事务
    conn_mgr.rollback_transaction()

    return True


def test_batch_help():
    """测试批量执行帮助"""
    print("\n测试 7: 批量执行帮助")
    from src.database.connection import ConnectionManager
    from src.config.manager import ConfigManager
    from src.cli.commands import CommandHandler
    from src.cli.app import DBManagerApp

    # 创建测试配置
    config_mgr = ConfigManager()
    conn_mgr = ConnectionManager(config_mgr)
    test_name = "test_batch_help_" + str(int(__import__('time').time()))
    config_mgr.add_config(test_name, 'sqlite', 'localhost', 0, '', '', ':memory:')
    conn_mgr.connect(test_name)

    # 创建模拟 app
    class MockApp:
        def __init__(self):
            self.connection_manager = conn_mgr
            self.output = []

        def _add_output(self, text, style=""):
            self.output.append(text)

    app = MockApp()
    handler = CommandHandler(app)

    # 无参数调用 batch
    handler.handle_batch([])

    # 验证输出包含帮助信息
    output_text = ''.join(app.output)
    assert "/batch file" in output_text, "应该显示 file 命令帮助"
    assert "/batch run" in output_text, "应该显示 run 命令帮助"
    print("    ✓ 帮助信息正确显示")

    return True


def main():
    """运行所有测试"""
    print("=" * 60)
    print("DBManager 批量执行功能测试")
    print("=" * 60)

    tests = [
        test_batch_file_success,
        test_batch_file_rollback_on_error,
        test_batch_run_success,
        test_batch_run_rollback_on_error,
        test_batch_no_connection,
        test_batch_with_existing_transaction,
        test_batch_help,
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
