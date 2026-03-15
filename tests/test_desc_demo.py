#!/usr/bin/env python3
"""
测试 /desc 命令输出效果 - 直接显示输出内容
"""

import sys
import os

TEST_DB = "/tmp/test_desc_demo.sqlite"

def setup_test_db():
    """创建测试数据库和表"""
    import sqlite3

    # 清理旧文件
    if os.path.exists(TEST_DB):
        os.remove(TEST_DB)

    conn = sqlite3.connect(TEST_DB)

    # 创建用户表
    conn.execute("""
        CREATE TABLE users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT NOT NULL UNIQUE,
            email TEXT NOT NULL,
            password_hash TEXT NOT NULL,
            status TEXT DEFAULT 'active',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # 创建索引
    conn.execute("CREATE INDEX idx_username ON users (username)")
    conn.execute("CREATE INDEX idx_status ON users (status)")

    # 创建订单表
    conn.execute("""
        CREATE TABLE orders (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            total_amount REAL NOT NULL,
            status TEXT DEFAULT 'pending',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
    """)

    conn.execute("CREATE INDEX idx_user_id ON orders (user_id)")

    # 插入测试数据
    conn.execute("INSERT INTO users (username, email, password_hash) VALUES ('admin', 'admin@test.com', 'hash123')")
    conn.execute("INSERT INTO users (username, email, password_hash) VALUES ('user1', 'user1@test.com', 'hash456')")

    conn.commit()
    conn.close()

def demo():
    """演示 /desc 命令"""
    from src.cli.app import DBManagerApp

    print("=" * 80)
    print("DBManager /desc 命令输出效果演示")
    print("=" * 80)
    print()

    # 创建应用
    app = DBManagerApp()

    # 添加配置 - 使用完整路径
    print("[添加配置]")
    app.command_handler.handle_config(["add", "demo_db", "sqlite", "localhost", "0", "", "", TEST_DB])

    for style, text in app.output_history[-1:]:
        print(text, end="")
    print()

    # 连接
    print("[连接数据库]")
    app.command_handler.handle_connect(["demo_db"])
    for style, text in app.output_history[-1:]:
        print(text, end="")
    print()

    # 列出表
    print(">>> /list")
    print()
    for style, text in app.output_history[-2:]:
        print(text, end="")
    print()

    # 清空历史
    app.output_history.clear()

    # 查看 users 表结构
    print(">>> /desc users")
    print()
    app.command_handler.handle_desc(["users"])
    for style, text in app.output_history[-1:]:
        print(text, end="")
    print()

    # 清空历史
    app.output_history.clear()

    # 查看 orders 表结构
    print(">>> /desc orders")
    print()
    app.command_handler.handle_desc(["orders"])
    for style, text in app.output_history[-1:]:
        print(text, end="")
    print()

    # 清空历史
    app.output_history.clear()

    # 测试不存在的表
    print(">>> /desc non_existent_table")
    print()
    app.command_handler.handle_desc(["non_existent_table"])
    for style, text in app.output_history[-1:]:
        print(text, end="")
    print()

    # 清空历史
    app.output_history.clear()

    # 测试无参数
    print(">>> /desc")
    print()
    app.command_handler.handle_desc([])
    for style, text in app.output_history[-1:]:
        print(text, end="")
    print()

    # 执行 SQL 查询
    app.output_history.clear()
    print(">>> SELECT * FROM users;")
    print()
    app._execute_sql("SELECT * FROM users;")
    for style, text in app.output_history:
        print(text, end="")
    print()

if __name__ == "__main__":
    setup_test_db()
    demo()

    # 清理
    if os.path.exists(TEST_DB):
        os.remove(TEST_DB)

    print("=" * 80)
    print("演示完成")
    print("=" * 80)
