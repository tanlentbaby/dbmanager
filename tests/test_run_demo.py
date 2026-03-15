#!/usr/bin/env python3
"""
测试 /run 命令执行 SQL 文件功能
"""

import sys
import os

TEST_DB = "/tmp/test_run_demo.sqlite"
TEST_SQL = "/tmp/test_run.sql"


def cleanup():
    """清理测试文件"""
    for f in [TEST_DB, TEST_SQL]:
        if os.path.exists(f):
            os.remove(f)


def setup():
    """创建测试数据库和 SQL 文件"""
    import sqlite3

    cleanup()

    # 创建测试数据库
    conn = sqlite3.connect(TEST_DB)
    conn.execute("CREATE TABLE IF NOT EXISTS items (id INTEGER, name TEXT)")
    conn.commit()
    conn.close()

    # 创建测试 SQL 文件
    sql_content = """
-- 测试 SQL 文件
-- 创建表
CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    price REAL DEFAULT 0.0
);

-- 插入数据
INSERT INTO products VALUES (1, 'Apple', 1.50);
INSERT INTO products VALUES (2, 'Banana', 0.75);
INSERT INTO products VALUES (3, 'Orange', 2.00);

-- 查询数据
SELECT * FROM products;

-- 更新数据
UPDATE products SET price = 1.80 WHERE id = 1;

-- 再次查询
SELECT * FROM products ORDER BY price DESC;
"""

    with open(TEST_SQL, 'w', encoding='utf-8') as f:
        f.write(sql_content)


def demo():
    """演示 /run 命令"""
    from src.cli.app import DBManagerApp

    print("=" * 70)
    print("DBManager /run 命令演示")
    print("=" * 70)
    print()

    app = DBManagerApp()

    # 1. 添加配置并连接
    print("[1] 添加配置并连接...")
    app.command_handler.handle_config(["add", "run_test", "sqlite", "localhost", "0", "", "", TEST_DB])
    app.command_handler.handle_connect(["run_test"])
    for style, text in app.output_history[-2:]:
        print(text, end="")
    print()
    app.output_history.clear()

    # 2. 测试 /run 命令
    print("[2] 执行 SQL 文件 (/run test.sql)...")
    print("-" * 70)
    app.command_handler.handle_run([TEST_SQL])
    for style, text in app.output_history:
        print(text, end="")
    print()
    app.output_history.clear()

    # 3. 验证数据
    print("[3] 验证数据 (SELECT FROM products)...")
    print("-" * 70)
    app._execute_sql("SELECT * FROM products ORDER BY price;")
    for style, text in app.output_history:
        print(text, end="")
    print()
    app.output_history.clear()

    # 4. 测试不存在的文件
    print("[4] 测试不存在的文件...")
    print("-" * 70)
    app.command_handler.handle_run(["/nonexistent/file.sql"])
    for style, text in app.output_history[-1:]:
        print(text, end="")
    print()
    app.output_history.clear()

    # 5. 测试未连接情况
    print("[5] 测试未连接情况...")
    print("-" * 70)
    app.connection_manager.disconnect()
    app.command_handler.handle_run([TEST_SQL])
    for style, text in app.output_history[-1:]:
        print(text, end="")
    print()

    print("=" * 70)
    print("演示完成")
    print("=" * 70)


if __name__ == "__main__":
    setup()
    demo()
    cleanup()
