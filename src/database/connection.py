"""
数据库连接管理器
"""

import time
from dataclasses import dataclass, field
from typing import Any, Optional


@dataclass
class ColumnInfo:
    """列信息"""
    name: str
    type: str
    nullable: bool = True
    default: Optional[str] = None
    auto_increment: bool = False
    primary_key: bool = False
    length: Optional[int] = None


@dataclass
class TableSchema:
    """表结构信息"""
    table_name: str
    columns: list[ColumnInfo] = field(default_factory=list)
    primary_keys: list[str] = field(default_factory=list)
    indexes: list[dict] = field(default_factory=list)


@dataclass
class ConnectionTestResult:
    """连接测试结果"""
    success: bool
    db_type: str
    version: str
    message: str
    latency_ms: float = 0.0


@dataclass
class QueryResult:
    """SQL 查询结果"""

    columns: list[str] = field(default_factory=list)
    rows: list[tuple] = field(default_factory=list)
    affected_rows: int = 0
    execution_time_ms: float = 0.0


@dataclass
class ExplainResult:
    """查询计划结果"""

    plan_type: str  # "mysql", "postgresql", "sqlite"
    columns: list[str] = field(default_factory=list)
    rows: list[tuple] = field(default_factory=list)


@dataclass
class DatabaseConnection:
    """数据库连接抽象"""

    db_type: str
    host: str
    port: int
    username: str
    database: str
    _connection: Any = None

    def close(self):
        """关闭连接"""
        if self._connection:
            self._connection.close()
            self._connection = None


class ConnectionManager:
    """连接管理器"""

    def __init__(self, config_manager):
        self.config_manager = config_manager
        self.current_instance: Optional[str] = None
        self.current_connection: Optional[DatabaseConnection] = None
        self._drivers = self._init_drivers()
        # 事务状态
        self.in_transaction: bool = False
        self.transaction_queries: list[str] = []

    def _init_drivers(self) -> dict:
        """初始化数据库驱动"""
        return {
            "mysql": self._connect_mysql,
            "postgresql": self._connect_postgresql,
            "sqlite": self._connect_sqlite,
        }

    def connect(self, instance_name: str) -> DatabaseConnection:
        """连接到指定实例"""
        config = self.config_manager.get_config(instance_name)
        if not config:
            raise ValueError(f"配置不存在：{instance_name}")

        db_type = config.get("type", "mysql")
        connect_func = self._drivers.get(db_type)

        if not connect_func:
            raise ValueError(f"不支持的数据库类型：{db_type}")

        # 断开当前连接
        if self.current_connection:
            self.disconnect()

        # 建立新连接
        connection = connect_func(config)
        self.current_instance = instance_name
        self.current_connection = connection

        return connection

    def disconnect(self):
        """断开当前连接"""
        if self.current_connection:
            self.current_connection.close()
            self.current_connection = None
            self.current_instance = None

    @property
    def is_connected(self) -> bool:
        """是否已连接"""
        return self.current_connection is not None

    @property
    def current_database(self) -> Optional[str]:
        """当前数据库名"""
        if self.current_connection:
            return self.current_connection.database
        return None

    def get_current_info(self) -> str:
        """获取当前连接信息"""
        if not self.current_connection:
            return "未连接"

        conn = self.current_connection
        return f"{conn.db_type}://{conn.username}@{conn.host}:{conn.port}/{conn.database}"

    def execute(self, sql: str) -> QueryResult:
        """执行 SQL 语句"""
        if not self.current_connection:
            raise RuntimeError("未连接数据库")

        conn = self.current_connection._connection
        if not conn:
            raise RuntimeError("连接已断开")

        start_time = time.time()

        try:
            cursor = conn.cursor()
            cursor.execute(sql)

            # 判断查询类型
            sql_upper = sql.strip().upper()
            if sql_upper.startswith("SELECT") or sql_upper.startswith("SHOW") or sql_upper.startswith("DESCRIBE"):
                # 查询语句
                columns = [desc[0] for desc in cursor.description] if cursor.description else []
                rows = cursor.fetchall()
                result = QueryResult(
                    columns=columns,
                    rows=rows,
                    affected_rows=len(rows),
                )
            else:
                # 写操作
                if not self.in_transaction:
                    conn.commit()
                result = QueryResult(
                    affected_rows=cursor.rowcount,
                )

            cursor.close()

        except Exception as e:
            if not self.in_transaction:
                conn.rollback()
            raise e

        # 计算执行时间
        result.execution_time_ms = (time.time() - start_time) * 1000

        return result

    def begin_transaction(self):
        """开始事务"""
        if not self.current_connection:
            raise RuntimeError("未连接数据库")

        conn = self.current_connection._connection
        if not conn:
            raise RuntimeError("连接已断开")

        # 不同类型的数据库使用不同的方式开始事务
        db_type = self.current_connection.db_type

        if db_type == "sqlite":
            # SQLite 自动开始事务
            pass
        else:
            cursor = conn.cursor()
            cursor.execute("BEGIN")
            cursor.close()

        self.in_transaction = True
        self.transaction_queries = []

    def commit_transaction(self):
        """提交事务"""
        if not self.in_transaction:
            raise RuntimeError("当前没有活动的事务")

        conn = self.current_connection._connection
        conn.commit()

        self.in_transaction = False
        self.transaction_queries = []

    def rollback_transaction(self):
        """回滚事务"""
        if not self.in_transaction:
            raise RuntimeError("当前没有活动的事务")

        conn = self.current_connection._connection
        conn.rollback()

        self.in_transaction = False
        self.transaction_queries = []

    def get_tables(self) -> list[str]:
        """获取所有表名"""
        if not self.current_connection:
            return []

        db_type = self.current_connection.db_type

        if db_type == "mysql":
            return self._get_tables_mysql()
        elif db_type == "postgresql":
            return self._get_tables_postgresql()
        elif db_type == "sqlite":
            return self._get_tables_sqlite()
        else:
            return []

    def _get_tables_mysql(self) -> list[str]:
        """MySQL 获取表名"""
        conn = self.current_connection._connection
        cursor = conn.cursor()
        cursor.execute("SHOW TABLES")
        tables = [row[0] for row in cursor.fetchall()]
        cursor.close()
        return tables

    def _get_tables_postgresql(self) -> list[str]:
        """PostgreSQL 获取表名"""
        conn = self.current_connection._connection
        cursor = conn.cursor()
        cursor.execute("""
            SELECT table_name FROM information_schema.tables
            WHERE table_schema = 'public'
            ORDER BY table_name
        """)
        tables = [row[0] for row in cursor.fetchall()]
        cursor.close()
        return tables

    def _get_tables_sqlite(self) -> list[str]:
        """SQLite 获取表名"""
        conn = self.current_connection._connection
        cursor = conn.cursor()
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
        tables = [row[0] for row in cursor.fetchall()]
        cursor.close()
        return tables

    def get_columns(self, table_name: str) -> list[str]:
        """获取表的列名"""
        if not self.current_connection:
            return []

        db_type = self.current_connection.db_type

        if db_type == "mysql":
            return self._get_columns_mysql(table_name)
        elif db_type == "postgresql":
            return self._get_columns_postgresql(table_name)
        elif db_type == "sqlite":
            return self._get_columns_sqlite(table_name)
        else:
            return []

    def _get_columns_mysql(self, table_name: str) -> list[str]:
        """MySQL 获取列名"""
        conn = self.current_connection._connection
        cursor = conn.cursor()
        cursor.execute(f"DESCRIBE `{table_name}`")
        columns = [row[0] for row in cursor.fetchall()]
        cursor.close()
        return columns

    def _get_columns_postgresql(self, table_name: str) -> list[str]:
        """PostgreSQL 获取列名"""
        conn = self.current_connection._connection
        cursor = conn.cursor()
        cursor.execute("""
            SELECT column_name FROM information_schema.columns
            WHERE table_name = %s
            ORDER BY ordinal_position
        """, (table_name,))
        columns = [row[0] for row in cursor.fetchall()]
        cursor.close()
        return columns

    def _get_columns_sqlite(self, table_name: str) -> list[str]:
        """SQLite 获取列名"""
        conn = self.current_connection._connection
        cursor = conn.cursor()
        cursor.execute(f"PRAGMA table_info({table_name})")
        columns = [row[1] for row in cursor.fetchall()]
        cursor.close()
        return columns

    def get_table_schema(self, table_name: str) -> TableSchema:
        """获取表结构详细信息"""
        if not self.current_connection:
            raise RuntimeError("未连接数据库")

        db_type = self.current_connection.db_type

        if db_type == "mysql":
            return self._get_table_schema_mysql(table_name)
        elif db_type == "postgresql":
            return self._get_table_schema_postgresql(table_name)
        elif db_type == "sqlite":
            return self._get_table_schema_sqlite(table_name)
        else:
            raise ValueError(f"不支持的数据库类型：{db_type}")

    def _get_table_schema_mysql(self, table_name: str) -> TableSchema:
        """MySQL 获取表结构"""
        conn = self.current_connection._connection
        cursor = conn.cursor()

        # 获取列信息
        cursor.execute(f"DESCRIBE `{table_name}`")
        rows = cursor.fetchall()

        columns = []
        primary_keys = []

        for row in rows:
            col = ColumnInfo(
                name=row[0],
                type=row[1],
                nullable=row[2] == "YES",
                default=row[3],
                auto_increment="auto_increment" in (row[5] or ""),
                primary_key=row[3] == "PRI",
            )
            columns.append(col)
            if col.primary_key:
                primary_keys.append(col.name)

        # 获取索引信息
        cursor.execute(f"SHOW INDEX FROM `{table_name}`")
        index_rows = cursor.fetchall()

        indexes = []
        seen_indexes = set()
        for row in index_rows:
            idx_name = row[2]
            if idx_name not in seen_indexes:
                seen_indexes.add(idx_name)
                indexes.append({
                    "name": idx_name,
                    "columns": [row[4]],
                    "unique": row[1] == 0,
                    "primary": row[2] == "PRIMARY",
                })
            else:
                for idx in indexes:
                    if idx["name"] == idx_name:
                        idx["columns"].append(row[4])

        cursor.close()

        return TableSchema(
            table_name=table_name,
            columns=columns,
            primary_keys=primary_keys,
            indexes=indexes,
        )

    def _get_table_schema_postgresql(self, table_name: str) -> TableSchema:
        """PostgreSQL 获取表结构"""
        conn = self.current_connection._connection
        cursor = conn.cursor()

        # 获取列信息
        cursor.execute("""
            SELECT
                column_name,
                data_type,
                is_nullable,
                column_default,
                character_maximum_length,
                numeric_precision
            FROM information_schema.columns
            WHERE table_name = %s
            ORDER BY ordinal_position
        """, (table_name,))

        rows = cursor.fetchall()
        columns = []
        primary_keys = []

        for row in rows:
            col_type = row[1]
            if row[4]:  # character length
                col_type += f"({row[4]})"
            elif row[5]:  # numeric precision
                col_type += f"({row[5]})"

            col = ColumnInfo(
                name=row[0],
                type=col_type,
                nullable=row[2] == "YES",
                default=row[3],
            )
            columns.append(col)

        # 获取主键信息
        cursor.execute("""
            SELECT a.attname
            FROM pg_index i
            JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
            WHERE i.indrelid = %s::regclass AND i.indisprimary
        """, (table_name,))

        for row in cursor.fetchall():
            primary_keys.append(row[0])

        for col in columns:
            if col.name in primary_keys:
                col.primary_key = True

        cursor.close()

        return TableSchema(
            table_name=table_name,
            columns=columns,
            primary_keys=primary_keys,
            indexes=[],
        )

    def _get_table_schema_sqlite(self, table_name: str) -> TableSchema:
        """SQLite 获取表结构"""
        conn = self.current_connection._connection
        cursor = conn.cursor()

        # 获取列信息
        cursor.execute(f"PRAGMA table_info({table_name})")
        rows = cursor.fetchall()

        columns = []
        primary_keys = []

        for row in rows:
            col = ColumnInfo(
                name=row[1],
                type=row[2],
                nullable=row[3] == 0,
                default=row[4],
                primary_key=row[5] == 1,
            )
            columns.append(col)
            if col.primary_key:
                primary_keys.append(col.name)

        # 获取索引信息
        cursor.execute(f"PRAGMA index_list({table_name})")
        index_rows = cursor.fetchall()

        indexes = []
        for idx_row in index_rows:
            idx_name = idx_row[1]
            cursor.execute(f"PRAGMA index_info({idx_name})")
            idx_cols = [r[2] for r in cursor.fetchall()]
            indexes.append({
                "name": idx_name,
                "columns": idx_cols,
                "unique": idx_row[2] == 1,
                "primary": idx_row[0] == 0 and "pk" in idx_name.lower(),
            })

        cursor.close()

        return TableSchema(
            table_name=table_name,
            columns=columns,
            primary_keys=primary_keys,
            indexes=indexes,
        )

    def get_explain_plan(self, sql: str) -> ExplainResult:
        """获取 SQL 查询计划"""
        if not self.current_connection:
            raise RuntimeError("未连接数据库")

        db_type = self.current_connection.db_type

        if db_type == "mysql":
            return self._get_explain_plan_mysql(sql)
        elif db_type == "postgresql":
            return self._get_explain_plan_postgresql(sql)
        elif db_type == "sqlite":
            return self._get_explain_plan_sqlite(sql)
        else:
            raise ValueError(f"不支持的数据库类型：{db_type}")

    def _get_explain_plan_mysql(self, sql: str) -> ExplainResult:
        """MySQL EXPLAIN"""
        conn = self.current_connection._connection
        cursor = conn.cursor()

        # 移除 SQL 末尾的分号
        sql = sql.rstrip(';').strip()

        # 检查是否是 ANALYZE 格式
        if sql.upper().startswith("ANALYZE"):
            cursor.execute(sql)
        else:
            cursor.execute(f"EXPLAIN {sql}")

        columns = [desc[0] for desc in cursor.description] if cursor.description else []
        rows = cursor.fetchall()
        cursor.close()

        return ExplainResult(
            plan_type="mysql",
            columns=columns,
            rows=rows,
        )

    def _get_explain_plan_postgresql(self, sql: str) -> ExplainResult:
        """PostgreSQL EXPLAIN ANALYZE"""
        conn = self.current_connection._connection
        cursor = conn.cursor()

        # 移除 SQL 末尾的分号
        sql = sql.rstrip(';').strip()

        # 使用 EXPLAIN ANALYZE 获取详细计划
        cursor.execute(f"EXPLAIN ANALYZE {sql}")

        # PostgreSQL EXPLAIN 返回单列文本
        columns = ["Query Plan"]
        rows = cursor.fetchall()
        cursor.close()

        return ExplainResult(
            plan_type="postgresql",
            columns=columns,
            rows=rows,
        )

    def _get_explain_plan_sqlite(self, sql: str) -> ExplainResult:
        """SQLite EXPLAIN QUERY PLAN"""
        conn = self.current_connection._connection
        cursor = conn.cursor()

        # 移除 SQL 末尾的分号
        sql = sql.rstrip(';').strip()

        cursor.execute(f"EXPLAIN QUERY PLAN {sql}")

        columns = ["id", "parent", "notused", "detail"]
        rows = cursor.fetchall()
        cursor.close()

        return ExplainResult(
            plan_type="sqlite",
            columns=columns,
            rows=rows,
        )

    def _connect_mysql(self, config: dict) -> DatabaseConnection:
        """连接 MySQL"""
        try:
            import pymysql

            connection = pymysql.connect(
                host=config["host"],
                port=config["port"],
                user=config["username"],
                password=config["password"],
                database=config.get("database", ""),
                charset="utf8mb4",
                connect_timeout=config.get("connect_timeout", 10),
                cursorclass=pymysql.cursors.Cursor,
            )

            return DatabaseConnection(
                db_type="mysql",
                host=config["host"],
                port=config["port"],
                username=config["username"],
                database=config.get("database", ""),
                _connection=connection,
            )

        except ImportError:
            raise RuntimeError("未安装 pymysql：pip install pymysql")

    def _connect_postgresql(self, config: dict) -> DatabaseConnection:
        """连接 PostgreSQL"""
        try:
            import psycopg2

            connection = psycopg2.connect(
                host=config["host"],
                port=config["port"],
                user=config["username"],
                password=config["password"],
                dbname=config.get("database", ""),
                connect_timeout=config.get("connect_timeout", 10),
            )

            return DatabaseConnection(
                db_type="postgresql",
                host=config["host"],
                port=config["port"],
                username=config["username"],
                database=config.get("database", ""),
                _connection=connection,
            )

        except ImportError:
            raise RuntimeError("未安装 psycopg2：pip install psycopg2-binary")

    def _connect_sqlite(self, config: dict) -> DatabaseConnection:
        """连接 SQLite"""
        import sqlite3

        database = config.get("database", ":memory:")
        connection = sqlite3.connect(database)

        return DatabaseConnection(
            db_type="sqlite",
            host="localhost",
            port=0,
            username="",
            database=database,
            _connection=connection,
        )

    def test_connection(self, instance_name: str) -> ConnectionTestResult:
        """测试数据库连接"""
        import time

        config = self.config_manager.get_config(instance_name)
        if not config:
            return ConnectionTestResult(
                success=False,
                db_type="",
                version="",
                message=f"配置不存在：{instance_name}"
            )

        db_type = config.get("type", "mysql")
        start_time = time.time()

        try:
            if db_type == "mysql":
                result = self._test_mysql(config)
            elif db_type == "postgresql":
                result = self._test_postgresql(config)
            elif db_type == "sqlite":
                result = self._test_sqlite(config)
            else:
                result = ConnectionTestResult(
                    success=False,
                    db_type=db_type,
                    version="",
                    message=f"不支持的数据库类型：{db_type}"
                )

            result.latency_ms = (time.time() - start_time) * 1000
            return result

        except Exception as e:
            return ConnectionTestResult(
                success=False,
                db_type=db_type,
                version="",
                message=str(e),
                latency_ms=(time.time() - start_time) * 1000
            )

    def _test_mysql(self, config: dict) -> ConnectionTestResult:
        """测试 MySQL 连接"""
        import pymysql

        try:
            conn = pymysql.connect(
                host=config["host"],
                port=config["port"],
                user=config["username"],
                password=config["password"],
                database=config.get("database", ""),
                charset="utf8mb4",
                connect_timeout=config.get("connect_timeout", 10),
            )
            cursor = conn.cursor()
            cursor.execute("SELECT VERSION()")
            version = cursor.fetchone()[0]
            cursor.close()
            conn.close()

            return ConnectionTestResult(
                success=True,
                db_type="mysql",
                version=version,
                message="连接成功"
            )
        except pymysql.Error as e:
            raise e

    def _test_postgresql(self, config: dict) -> ConnectionTestResult:
        """测试 PostgreSQL 连接"""
        import psycopg2

        try:
            conn = psycopg2.connect(
                host=config["host"],
                port=config["port"],
                user=config["username"],
                password=config["password"],
                dbname=config.get("database", ""),
                connect_timeout=config.get("connect_timeout", 10),
            )
            cursor = conn.cursor()
            cursor.execute("SELECT VERSION()")
            version = cursor.fetchone()[0]
            cursor.close()
            conn.close()

            return ConnectionTestResult(
                success=True,
                db_type="postgresql",
                version=version,
                message="连接成功"
            )
        except psycopg2.Error as e:
            raise e

    def _test_sqlite(self, config: dict) -> ConnectionTestResult:
        """测试 SQLite 连接"""
        import sqlite3

        database = config.get("database", ":memory:")
        conn = sqlite3.connect(database)
        cursor = conn.cursor()
        cursor.execute("SELECT sqlite_version()")
        version = cursor.fetchone()[0]
        cursor.close()
        conn.close()

        return ConnectionTestResult(
            success=True,
            db_type="sqlite",
            version=f"SQLite {version}",
            message="连接成功"
        )
