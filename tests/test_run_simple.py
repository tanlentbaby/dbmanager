#!/usr/bin/env python3
"""
测试 /run 命令 - 简化版
"""

import sys
import os

TEST_DB = "/tmp/test_run_simple.sqlite"
TEST_SQL = "/tmp/test_run_simple.sql"


def cleanup():
    """清理测试文件"""
    for f in [TEST_DB, TEST_SQL]:
        if os.path.exists(f):
            os.remove(f)


def setup():
    """创建测试数据库和 SQL 文件"""
    cleanup()

    # 创建测试 SQL 文件
    sql_content = """-- 创建表
CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    price REAL DEFAULT 0.0
);

-- 插入数据
INSERT INTO products VALUES (1, 'Apple', 1.50);
INSERT INTO products VALUES (2, 'Banana', 0.75);

-- 查询
SELECT * FROM products;
"""

    with open(TEST_SQL, 'w', encoding='utf-8') as f:
        f.write(sql_content)


def test():
    """测试 /run 命令"""
    from src.cli.app import DBManagerApp

    print("=" * 70)
    print("/run 命令测试")
    print("=" * 70)
    print()

    app = DBManagerApp()

    # 添加配置并连接
    print("添加配置并连接...")
    app.command_handler.handle_config(["add", "run_test", "sqlite", "localhost", "0", "", "", TEST_DB])
    app.command_handler.handle_connect(["run_test"])
    print("已连接\n")

    app.output_history.clear()

    # 执行 SQL 文件
    print("执行 SQL 文件...")
    print("-" * 70)
    app.command_handler.handle_run([TEST_SQL])

    for style, text in app.output_history:
        print(text, end="")
    print()

    # 验证
    print("验证数据...")
    print("-" * 70)
    app._execute_sql("SELECT * FROM products ORDER BY price DESC;")
    for style, text in app.output_history:
        print(text, end="")

if __name__ == "__main__":
    setup()
    test()
    cleanup()
