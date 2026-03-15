"""
数据库模块 - 数据库连接和执行
"""

from .connection import ConnectionManager, QueryResult

__all__ = ["ConnectionManager", "QueryResult"]
