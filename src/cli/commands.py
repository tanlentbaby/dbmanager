"""
命令处理器 - 处理 / 开头的命令
"""

import sys
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from .app import DBManagerApp


class CommandHandler:
    """命令处理器"""

    def __init__(self, app: "DBManagerApp"):
        self.app = app
        self.commands = self._register_commands()

    def _register_commands(self) -> dict:
        """注册所有命令"""
        return {
            # 配置管理
            "config": self.handle_config,
            # 连接管理
            "connect": self.handle_connect,
            "co": self.handle_connect,
            "check-out": self.handle_connect,
            "disconnect": self.handle_disconnect,
            # 数据库操作
            "list": self.handle_list,
            "ls": self.handle_list,
            "desc": self.handle_desc,
            "describe": self.handle_desc,
            "use": self.handle_use,
            # 文件执行
            "run": self.handle_run,
            "source": self.handle_run,
            # 批量执行
            "batch": self.handle_batch,
            # 事务管理
            "begin": self.handle_begin,
            "commit": self.handle_commit,
            "rollback": self.handle_rollback,
            # 查询计划
            "explain": self.handle_explain,
            # 其他
            "history": self.handle_history,
            "h": self.handle_history,
            "export": self.handle_export,
            "format": self.handle_format,
            "help": self.handle_help,
            "quit": self.handle_quit,
            "exit": self.handle_quit,
            "q": self.handle_quit,
        }

    def handle_command(self, text: str):
        """处理命令"""
        parts = text.strip().split()
        if not parts:
            return

        cmd = parts[0][1:].lower()  # 去掉 / 前缀
        args = parts[1:]

        handler = self.commands.get(cmd)
        if handler:
            handler(args)
        else:
            self.app._add_output(f"未知命令：/{cmd}\n输入 /help 查看帮助\n", "error")

    def handle_config(self, args: list[str]):
        """处理 /config 命令"""
        if not args:
            self._show_config_help()
            return

        subcmd = args[0].lower()
        sub_args = args[1:]

        if subcmd == "add":
            self._config_add(sub_args)
        elif subcmd == "list":
            self._config_list(sub_args)
        elif subcmd == "edit":
            self._config_edit(sub_args)
        elif subcmd == "remove":
            self._config_remove(sub_args)
        elif subcmd == "test":
            self._config_test(sub_args)
        else:
            self._show_config_help()

    def _show_config_help(self):
        """显示 config 帮助"""
        help_text = (
            "配置管理命令:\n"
            "  /config add      - 添加数据库配置\n"
            "  /config list     - 列出所有配置\n"
            "  /config edit     - 编辑配置\n"
            "  /config remove   - 删除配置\n"
            "  /config test     - 测试连接\n"
        )
        self.app._add_output(help_text, "output")

    def _config_add(self, args: list[str]):
        """添加配置 - 支持命令行参数"""
        # 解析命令行参数
        # 格式：/config add <name> <type> <host> <port> <user> <password> <database>
        if len(args) >= 5:
            name = args[0]
            db_type = args[1].lower()
            host = args[2] if len(args) > 2 else "localhost"
            port = int(args[3]) if len(args) > 3 else None
            username = args[4] if len(args) > 4 else ""
            password = args[5] if len(args) > 5 else ""
            database = args[6] if len(args) > 6 else ""

            self._save_config(name, db_type, host, port, username, password, database)
            return

        # 参数不足，显示使用说明
        self.app._add_output("添加数据库配置\n", "bold")
        self.app._add_output("-" * 40 + "\n", "dim")
        self.app._add_output(
            "用法：/config add <名称> <类型> <主机> [端口] <用户> <密码> [数据库]\n",
            "output"
        )
        self.app._add_output("\n示例:\n", "output")
        self.app._add_output(
            "  /config add local mysql localhost 3306 root password testdb\n",
            "dim"
        )
        self.app._add_output(
            "  /config add prod postgresql prod.db.com 5432 admin secret mydb\n",
            "dim"
        )
        self.app._add_output(
            "  /config add mydb sqlite :memory: - - /path/to/db.sqlite\n",
            "dim"
        )

    def _save_config(self, name: str, db_type: str, host: str,
                     port: int, username: str, password: str, database: str):
        """保存配置"""
        # 验证
        if not name:
            self.app._add_output("错误：实例名称不能为空\n", "error")
            return

        if name in self.app.config_manager.list_configs():
            self.app._add_output(f"错误：实例 '{name}' 已存在\n", "error")
            return

        if db_type not in ["mysql", "postgresql", "sqlite"]:
            self.app._add_output(f"错误：不支持的数据库类型 '{db_type}'\n", "error")
            return

        # 设置默认端口
        if port is None:
            port = {"mysql": 3306, "postgresql": 5432, "sqlite": 0}.get(db_type, 3306)

        # SQLite 特殊处理
        if db_type == "sqlite":
            database = database or ":memory:"
            self.app.config_manager.add_config(
                name=name,
                db_type=db_type,
                host="localhost",
                port=0,
                username="",
                password="",
                database=database,
            )
        else:
            # 验证用户名
            if not username:
                self.app._add_output("错误：用户名不能为空\n", "error")
                return

            self.app.config_manager.add_config(
                name=name,
                db_type=db_type,
                host=host,
                port=port,
                username=username,
                password=password,
                database=database,
            )

        self.app._add_output(f"✓ 配置已保存：{name}\n", "success")
        if db_type != "sqlite":
            self.app._add_output(f"提示：使用 /connect {name} 连接到此数据库\n", "dim")

    def _config_list(self, args: list[str]):
        """列出配置"""
        configs = self.app.config_manager.list_configs()
        if not configs:
            self.app._add_output("暂无配置，请使用 /config add 添加\n", "warning")
            return

        # 简单表格输出
        lines = []
        lines.append("配置列表:")
        lines.append("-" * 60)
        lines.append(f"{'名称':<20} {'类型':<12} {'主机':<15} {'端口':<6} {'数据库':<10} {'状态':<6}")
        lines.append("-" * 60)

        current = self.app.connection_manager.current_instance
        for name, cfg in configs.items():
            status = "●" if name == current else "○"
            lines.append(
                f"{name:<20} "
                f"{cfg.get('type', 'unknown'):<12} "
                f"{cfg.get('host', '-'):.<15} "
                f"{str(cfg.get('port', '-')):<6} "
                f"{cfg.get('database', '-'):.<10} "
                f"{status:<6}"
            )
        lines.append("-" * 60)
        lines.append("图例：● 当前连接  ○ 未连接")

        self.app._add_output("\n".join(lines) + "\n", "output")

    def _config_edit(self, args: list[str]):
        """编辑配置"""
        if not args:
            self.app._add_output("用法：/config edit <实例名>\n", "error")
            return

        name = args[0]
        configs = self.app.config_manager.list_configs()

        if name not in configs:
            self.app._add_output(f"错误：配置 '{name}' 不存在\n", "error")
            return

        # 显示当前配置
        cfg = configs[name]
        self.app._add_output(f"编辑配置：{name}\n", "bold")
        self.app._add_output("-" * 40 + "\n", "dim")
        self.app._add_output(f"类型：{cfg.get('type', 'unknown')}\n", "output")
        self.app._add_output(f"主机：{cfg.get('host', '-')}\n", "output")
        self.app._add_output(f"端口：{cfg.get('port', '-')}\n", "output")
        self.app._add_output(f"用户：{cfg.get('username', '-')}\n", "output")
        self.app._add_output(f"数据库：{cfg.get('database', '-')}\n", "output")
        self.app._add_output("\n提示：/config edit 功能开发中，请使用配置文件直接编辑\n", "warning")

    def _config_remove(self, args: list[str]):
        """删除配置"""
        if not args:
            self.app._add_output("用法：/config remove <实例名>\n", "error")
            return

        name = args[0]
        configs = self.app.config_manager.list_configs()

        if name not in configs:
            self.app._add_output(f"错误：配置 '{name}' 不存在\n", "error")
            return

        # 检查是否是当前连接
        if self.app.connection_manager.current_instance == name:
            self.app._add_output(f"错误：不能删除当前连接的配置\n", "error")
            return

        # 删除配置
        self.app.config_manager.remove_config(name)
        self.app._add_output(f"✓ 配置已删除：{name}\n", "success")

    def _config_test(self, args: list[str]):
        """测试连接"""
        if not args:
            self.app._add_output("用法：/config test <实例名>\n", "error")
            return

        name = args[0]
        result = self.app.connection_manager.test_connection(name)

        if result.success:
            self.app._add_output(f"✓ 连接成功：{name}\n", "success")
            self.app._add_output(f"  类型：{result.db_type}\n", "dim")
            self.app._add_output(f"  版本：{result.version}\n", "dim")
            self.app._add_output(f"  延迟：{result.latency_ms:.2f}ms\n", "dim")
        else:
            self.app._add_output(f"✗ 连接失败：{name}\n", "error")
            self.app._add_output(f"  错误：{result.message}\n", "dim")

    def handle_connect(self, args: list[str]):
        """处理 /connect 命令"""
        if not args:
            # 列出可连接的实例
            self._list_instances()
            return

        instance_name = args[0]
        try:
            self.app.connection_manager.connect(instance_name)
            # 刷新补全器缓存
            self.app.completer.invalidate_cache()
            self.app._add_output(f"✓ 已连接到 {instance_name}\n", "success")
        except Exception as e:
            self.app._add_output(f"连接失败：{str(e)}\n", "error")

    def _list_instances(self):
        """列出可连接的实例"""
        configs = self.app.config_manager.list_configs()
        if not configs:
            self.app._add_output("暂无配置，请使用 /config add 添加\n", "warning")
            return

        lines = ["可连接的实例:"]
        current = self.app.connection_manager.current_instance
        for name in configs:
            marker = "→" if name == current else " "
            lines.append(f"  {marker} {name}")
        self.app._add_output("\n".join(lines) + "\n", "output")

    def handle_disconnect(self, args: list[str]):
        """处理 /disconnect 命令"""
        self.app.connection_manager.disconnect()
        self.app._add_output("已断开连接\n", "dim")

    def handle_list(self, args: list[str]):
        """处理 /list 命令 - 列出所有表"""
        if not self.app.connection_manager.is_connected:
            self.app._add_output("错误：未连接数据库\n", "error")
            return

        try:
            tables = self.app.connection_manager.get_tables()
            lines = [f"Tables in {self.app.connection_manager.current_database}:"]
            for table in tables:
                lines.append(f"  {table}")
            self.app._add_output("\n".join(lines) + "\n", "output")
        except Exception as e:
            self.app._add_output(f"错误：{str(e)}\n", "error")

    def handle_desc(self, args: list[str]):
        """处理 /desc 命令 - 查看表结构"""
        if not args:
            self.app._add_output("用法：/desc <表名>\n", "error")
            return

        if not self.app.connection_manager.is_connected:
            self.app._add_output("错误：未连接数据库\n", "error")
            return

        table_name = args[0]
        try:
            schema = self.app.connection_manager.get_table_schema(table_name)
            self._show_table_schema(schema)
        except Exception as e:
            self.app._add_output(f"错误：{str(e)}\n", "error")

    def _show_table_schema(self, schema):
        """显示表结构"""
        lines = []
        lines.append(f"表结构：{schema.table_name}")
        lines.append("=" * 80)

        # 表头
        header = f"{'字段':<25} {'类型':<20} {'空':<6} {'默认值':<15} {'额外':<10}"
        lines.append(header)
        lines.append("-" * 80)

        # 列信息
        for col in schema.columns:
            nullable = "YES" if col.nullable else "NO"
            default = col.default if col.default else "-"
            extra = []
            if col.primary_key:
                extra.append("PK")
            if col.auto_increment:
                extra.append("AUTO")
            extra_str = ",".join(extra) if extra else "-"

            lines.append(f"{col.name:<25} {col.type:<20} {nullable:<6} {str(default):<15} {extra_str:<10}")

        lines.append("-" * 80)

        # 主键信息
        if schema.primary_keys:
            lines.append(f"主键：{', '.join(schema.primary_keys)}")

        # 索引信息
        if schema.indexes:
            lines.append("索引:")
            for idx in schema.indexes:
                unique = "UNIQUE " if idx.get("unique") and not idx.get("primary") else ""
                cols = ", ".join(idx["columns"])
                lines.append(f"  - {unique}{idx['name']} ({cols})")

        lines.append("=" * 80)
        self.app._add_output("\n".join(lines) + "\n", "output")

    def handle_use(self, args: list[str]):
        """处理 /use 命令 - 切换数据库"""
        if not args:
            self.app._add_output("用法：/use <数据库名>\n", "error")
            return
        # TODO: 实现切换数据库
        self.app._add_output("切换数据库功能开发中...\n", "warning")

    def handle_run(self, args: list[str]):
        """处理 /run 命令 - 执行 SQL 文件"""
        if not args:
            self.app._add_output("用法：/run <SQL 文件>\n", "error")
            return

        if not self.app.connection_manager.is_connected:
            self.app._add_output("错误：未连接数据库\n", "error")
            return

        file_path = args[0]

        # 检查文件是否存在
        import os
        if not os.path.exists(file_path):
            self.app._add_output(f"错误：文件不存在：{file_path}\n", "error")
            return

        # 读取文件内容
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
        except Exception as e:
            self.app._add_output(f"错误：读取文件失败：{str(e)}\n", "error")
            return

        self.app._add_output(f"执行文件：{file_path}\n", "dim")
        self.app._add_output("-" * 40 + "\n", "dim")

        # 分割 SQL 语句（按分号分割）
        statements = self._split_sql_statements(content)

        total = len(statements)
        executed = 0
        errors = 0
        skipped = 0

        for i, stmt in enumerate(statements, 1):
            stmt = stmt.strip()
            if not stmt:
                continue

            # 移除语句中的注释行
            lines = stmt.split('\n')
            cleaned_lines = []
            for line in lines:
                stripped = line.strip()
                if not stripped.startswith('--'):
                    cleaned_lines.append(line)
            stmt = '\n'.join(cleaned_lines).strip()

            if not stmt:
                skipped += 1
                continue

            try:
                result = self.app.connection_manager.execute(stmt)
                executed += 1

                # 显示执行结果
                if result.rows:
                    # SELECT 查询
                    self.app._format_result(result)
                else:
                    # 写操作/DDL
                    if result.affected_rows >= 0:
                        self.app._add_output(f"[{i}/{total}] OK - 影响 {result.affected_rows} 行\n", "success")
                    else:
                        self.app._add_output(f"[{i}/{total}] OK\n", "success")

            except Exception as e:
                errors += 1
                self.app._add_output(f"[{i}/{total}] 错误：{str(e)}\n", "error")

        # 汇总报告
        self.app._add_output("-" * 40 + "\n", "dim")
        self.app._add_output(f"执行完成：共 {total} 条语句，成功 {executed} 条，失败 {errors} 条\n", "bold")

    def _split_sql_statements(self, content: str) -> list[str]:
        """分割 SQL 语句，处理分号分隔"""
        statements = []
        current = []
        in_string = False
        string_char = None
        in_comment_line = False
        in_comment_block = False

        i = 0
        while i < len(content):
            char = content[i]
            next_char = content[i + 1] if i + 1 < len(content) else ''

            # 处理单行注释
            if not in_string and not in_comment_block and char == '-' and next_char == '-':
                in_comment_line = True
                current.append(char)
                i += 1
                continue

            if in_comment_line and char == '\n':
                in_comment_line = False
                current.append(char)
                i += 1
                continue

            if in_comment_line:
                current.append(char)
                i += 1
                continue

            # 处理块注释
            if not in_string and char == '/' and next_char == '*':
                in_comment_block = True
                current.append(char)
                i += 1
                continue

            if in_comment_block and char == '*' and next_char == '/':
                in_comment_block = False
                current.append(char)
                current.append(next_char)
                i += 2
                continue

            if in_comment_block:
                current.append(char)
                i += 1
                continue

            # 处理字符串
            if char in ("'", '"') and (i == 0 or content[i-1] != '\\'):
                if not in_string:
                    in_string = True
                    string_char = char
                elif char == string_char:
                    in_string = False
                    string_char = None

            # 处理分号
            if char == ';' and not in_string:
                statements.append(''.join(current))
                current = []
                i += 1
                continue

            current.append(char)
            i += 1

        # 处理最后一条语句（没有分号结尾）
        if current:
            stmt = ''.join(current).strip()
            if stmt:
                statements.append(stmt)

        return statements

    def handle_history(self, args: list[str]):
        """处理 /history 命令 - 显示命令历史"""
        # 显示最近的命令历史
        max_items = int(args[0]) if args and args[0].isdigit() else 20

        history = self.app.command_history
        if not history:
            self.app._add_output("暂无历史记录\n", "dim")
            return

        # 获取最近的命令
        recent = history[-max_items:] if len(history) > max_items else history
        start_index = len(history) - len(recent)

        lines = [f"最近 {len(recent)} 条命令:"]
        lines.append("-" * 40)
        for i, cmd in enumerate(recent, start=start_index + 1):
            lines.append(f"  {i}.  {cmd}")
        lines.append("-" * 40)
        lines.append(f"共 {len(history)} 条历史记录")
        lines.append("提示：使用 ↑/↓ 键快速导航历史命令")

        self.app._add_output("\n".join(lines) + "\n", "output")

    def handle_export(self, args: list[str]):
        """处理 /export 命令 - 导出查询结果"""
        if not args:
            self.app._add_output("用法：/export <格式> <SQL 查询>\n", "error")
            self.app._add_output("支持的格式：csv, json, markdown, table\n", "dim")
            self.app._add_output("示例：/export csv SELECT * FROM users;\n", "dim")
            return

        if not self.app.connection_manager.is_connected:
            self.app._add_output("错误：未连接数据库\n", "error")
            return

        fmt = args[0].lower()
        if fmt not in ["csv", "json", "markdown", "table"]:
            self.app._add_output(f"错误：不支持的格式 '{fmt}'\n", "error")
            self.app._add_output("支持的格式：csv, json, markdown, table\n", "dim")
            return

        # 获取 SQL 查询
        if len(args) < 2:
            self.app._add_output("错误：请提供 SQL 查询\n", "error")
            return

        sql = " ".join(args[1:])
        if not sql.endswith(";"):
            sql = sql + ";"

        try:
            result = self.app.connection_manager.execute(sql)
        except Exception as e:
            self.app._add_output(f"错误：{str(e)}\n", "error")
            return

        # 根据格式导出
        if fmt == "csv":
            output = self._export_csv(result)
            self.app._add_output(output, "output")
        elif fmt == "json":
            output = self._export_json(result)
            self.app._add_output(output, "output")
        elif fmt == "markdown":
            output = self._export_markdown(result)
            self.app._add_output(output, "output")
        else:
            # table 格式使用默认格式化
            self.app._format_result(result)

    def _export_csv(self, result) -> str:
        """导出为 CSV 格式"""
        import csv
        from io import StringIO

        output = StringIO()
        writer = csv.writer(output)

        # 写入表头
        if result.columns:
            writer.writerow(result.columns)

        # 写入数据
        for row in result.rows:
            writer.writerow([v if v is not None else "" for v in row])

        return output.getvalue()

    def _export_json(self, result) -> str:
        """导出为 JSON 格式"""
        import json

        if not result.columns:
            return json.dumps([], indent=2)

        # 构建字典列表
        data = []
        for row in result.rows:
            row_dict = {}
            for i, col in enumerate(result.columns):
                value = row[i] if i < len(row) else None
                row_dict[col] = value
            data.append(row_dict)

        return json.dumps(data, indent=2, ensure_ascii=False)

    def _export_markdown(self, result) -> str:
        """导出为 Markdown 表格格式"""
        if not result.columns:
            return ""

        lines = []

        # 表头
        header = "| " + " | ".join(str(col) for col in result.columns) + " |"
        lines.append(header)

        # 分隔线
        separator = "| " + " | ".join("---" for _ in result.columns) + " |"
        lines.append(separator)

        # 数据行
        for row in result.rows:
            row_str = "| " + " | ".join(
                str(v) if v is not None else "" for v in row
            ) + " |"
            lines.append(row_str)

        return "\n".join(lines) + "\n"

    def handle_format(self, args: list[str]):
        """处理 /format 命令 - 设置输出格式"""
        if not args:
            # 显示当前格式
            current = self.app.get_output_format()
            self.app._add_output(f"当前输出格式：{current}\n", "dim")
            self.app._add_output("用法：/format <格式>\n支持的格式：table, json, csv, markdown\n", "dim")
            return

        fmt = args[0].lower()
        if fmt not in ["table", "json", "csv", "markdown"]:
            self.app._add_output(f"错误：不支持的格式 '{fmt}'\n", "error")
            self.app._add_output("支持的格式：table, json, csv, markdown\n", "dim")
            return

        self.app.set_output_format(fmt)
        self.app._add_output(f"✓ 输出格式已设置为：{fmt}\n", "success")

    def handle_help(self, args: list[str]):
        """处理 /help 命令"""
        help_text = (
            "\n"
            "DBManager - 交互式数据库管理工具\n"
            "\n"
            "连接管理:\n"
            "  /config            配置管理\n"
            "  /connect <name>    连接数据库 (别名：/co, /check-out)\n"
            "  /disconnect        断开当前连接\n"
            "  /list, /ls         列出所有表\n"
            "\n"
            "SQL 执行:\n"
            "  直接输入 SQL 语句执行，以分号结束\n"
            "  /desc <table>      查看表结构\n"
            "  /run <file>        执行 SQL 文件\n"
            "  /batch file <file> 批量执行 SQL 文件（事务中）\n"
            "  /batch run <SQL>   批量执行 SQL 语句（事务中）\n"
            "  /explain <SQL>     查看查询计划\n"
            "\n"
            "事务管理:\n"
            "  /begin             开始事务\n"
            "  /commit            提交事务\n"
            "  /rollback          回滚事务\n"
            "\n"
            "其他:\n"
            "  /history           查看历史\n"
            "  /format <type>     设置格式 (table/json/csv/markdown)\n"
            "  /help              此帮助\n"
            "  /quit              退出 (快捷键：Ctrl+D, /q)\n"
        )
        self.app._add_output(help_text, "output")

    def handle_quit(self, args: list[str]):
        """处理 /quit 命令"""
        self.app._add_output("再见!\n", "dim")
        self.app.app.exit()

    def handle_begin(self, args: list[str]):
        """处理 /begin 命令 - 开始事务"""
        if not self.app.connection_manager.is_connected:
            self.app._add_output("错误：未连接数据库\n", "error")
            return

        if self.app.connection_manager.in_transaction:
            self.app._add_output("警告：当前已有活动的事务\n", "warning")
            return

        try:
            self.app.connection_manager.begin_transaction()
            self.app._add_output("✓ 事务已开始\n", "success")
            self.app._add_output("提示：使用 /commit 提交事务，或使用 /rollback 回滚事务\n", "dim")
        except Exception as e:
            self.app._add_output(f"错误：{str(e)}\n", "error")

    def handle_commit(self, args: list[str]):
        """处理 /commit 命令 - 提交事务"""
        if not self.app.connection_manager.is_connected:
            self.app._add_output("错误：未连接数据库\n", "error")
            return

        if not self.app.connection_manager.in_transaction:
            self.app._add_output("错误：当前没有活动的事务\n", "error")
            return

        try:
            self.app.connection_manager.commit_transaction()
            self.app._add_output("✓ 事务已提交\n", "success")
        except Exception as e:
            self.app._add_output(f"错误：{str(e)}\n", "error")

    def handle_rollback(self, args: list[str]):
        """处理 /rollback 命令 - 回滚事务"""
        if not self.app.connection_manager.is_connected:
            self.app._add_output("错误：未连接数据库\n", "error")
            return

        if not self.app.connection_manager.in_transaction:
            self.app._add_output("错误：当前没有活动的事务\n", "error")
            return

        try:
            self.app.connection_manager.rollback_transaction()
            self.app._add_output("✓ 事务已回滚\n", "success")
        except Exception as e:
            self.app._add_output(f"错误：{str(e)}\n", "error")

    def handle_batch(self, args: list[str]):
        """处理 /batch 命令 - 批量执行 SQL 语句（自动在事务中执行）"""
        if not args:
            self._show_batch_help()
            return

        if not self.app.connection_manager.is_connected:
            self.app._add_output("错误：未连接数据库\n", "error")
            return

        # 检查是否有活动的事务
        if self.app.connection_manager.in_transaction:
            self.app._add_output("错误：当前已有活动的事务，批量执行需要在非事务模式下运行\n", "error")
            self.app._add_output("提示：使用 /commit 或 /rollback 结束当前事务\n", "dim")
            return

        subcmd = args[0].lower()
        sub_args = args[1:]

        if subcmd == "file":
            self._batch_file(sub_args)
        elif subcmd == "run":
            self._batch_run(sub_args)
        else:
            # 默认是 file 模式
            self._batch_file(args)

    def _batch_file(self, args: list[str]):
        """批量执行 SQL 文件（在事务中）"""
        if not args:
            self.app._add_output("用法：/batch file <SQL 文件>\n", "error")
            return

        file_path = args[0]

        # 检查文件是否存在
        import os
        if not os.path.exists(file_path):
            self.app._add_output(f"错误：文件不存在：{file_path}\n", "error")
            return

        # 读取文件内容
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
        except Exception as e:
            self.app._add_output(f"错误：读取文件失败：{str(e)}\n", "error")
            return

        self.app._add_output(f"批量执行文件：{file_path}\n", "dim")
        self.app._add_output("-" * 40 + "\n", "dim")

        # 分割 SQL 语句
        statements = self._split_sql_statements(content)

        # 开始事务
        self.app.connection_manager.begin_transaction()
        self.app._add_output("[事务已开启]\n", "dim")

        total = len(statements)
        executed = 0
        errors = 0
        skipped = 0
        error_details = []

        for i, stmt in enumerate(statements, 1):
            stmt = stmt.strip()
            if not stmt:
                skipped += 1
                continue

            # 移除语句中的注释行
            lines = stmt.split('\n')
            cleaned_lines = []
            for line in lines:
                stripped = line.strip()
                if not stripped.startswith('--'):
                    cleaned_lines.append(line)
            stmt = '\n'.join(cleaned_lines).strip()

            if not stmt:
                skipped += 1
                continue

            try:
                result = self.app.connection_manager.execute(stmt)
                executed += 1

                # 只显示 SELECT 查询的结果
                if result.rows and result.columns:
                    self.app._add_output(f"[{i}/{total}] {stmt[:50]}...\n", "dim")
                    self.app._format_result(result)
                else:
                    # 静默执行写操作
                    pass

            except Exception as e:
                errors += 1
                error_details.append((i, stmt, str(e)))
                self.app._add_output(f"[{i}/{total}] 错误：{str(e)}\n", "error")

        # 汇总报告
        self.app._add_output("-" * 40 + "\n", "dim")

        if errors > 0:
            # 有错误，回滚事务
            self.app.connection_manager.rollback_transaction()
            self.app._add_output(f"[事务已回滚]\n", "warning")
            self.app._add_output(f"执行失败：共 {total} 条语句，成功 {executed} 条，失败 {errors} 条，跳过 {skipped} 条\n", "error")

            # 显示错误详情
            if error_details:
                self.app._add_output("\n错误详情:\n", "error")
                for idx, stmt, err in error_details[:5]:  # 只显示前 5 个错误
                    self.app._add_output(f"  [{idx}] {stmt[:60]}...\n    -> {err}\n", "error")
                if len(error_details) > 5:
                    self.app._add_output(f"  ... 还有 {len(error_details) - 5} 个错误\n", "dim")
        else:
            # 无错误，提交事务
            self.app.connection_manager.commit_transaction()
            self.app._add_output("[事务已提交]\n", "success")
            self.app._add_output(f"执行成功：共 {total} 条语句，成功 {executed} 条，跳过 {skipped} 条\n", "success")

    def _batch_run(self, args: list[str]):
        """批量执行 SQL 语句（从命令行参数）"""
        if not args:
            self.app._add_output("用法：/batch run <SQL 语句>\n", "error")
            return

        sql = " ".join(args)
        if not sql.endswith(";"):
            sql = sql + ";"

        self.app._add_output("批量执行 SQL 语句:\n", "dim")
        self.app._add_output(f"  {sql}\n", "dim")
        self.app._add_output("-" * 40 + "\n", "dim")

        # 分割 SQL 语句
        statements = self._split_sql_statements(sql)

        # 开始事务
        self.app.connection_manager.begin_transaction()
        self.app._add_output("[事务已开启]\n", "dim")

        total = len(statements)
        executed = 0
        errors = 0
        error_details = []

        for i, stmt in enumerate(statements, 1):
            stmt = stmt.strip()
            if not stmt:
                continue

            try:
                result = self.app.connection_manager.execute(stmt)
                executed += 1

                # 只显示 SELECT 查询的结果
                if result.rows and result.columns:
                    self.app._format_result(result)

            except Exception as e:
                errors += 1
                error_details.append((i, stmt, str(e)))
                self.app._add_output(f"[{i}/{total}] 错误：{str(e)}\n", "error")

        # 汇总报告
        self.app._add_output("-" * 40 + "\n", "dim")

        if errors > 0:
            # 有错误，回滚事务
            self.app.connection_manager.rollback_transaction()
            self.app._add_output("[事务已回滚]\n", "warning")
            self.app._add_output(f"执行失败：共 {total} 条语句，成功 {executed} 条，失败 {errors} 条\n", "error")
        else:
            # 无错误，提交事务
            self.app.connection_manager.commit_transaction()
            self.app._add_output("[事务已提交]\n", "success")
            self.app._add_output(f"执行成功：共 {total} 条语句\n", "success")

    def _show_batch_help(self):
        """显示 batch 帮助"""
        help_text = (
            "批量执行命令:\n"
            "  /batch file <SQL 文件>   - 批量执行 SQL 文件（在事务中）\n"
            "  /batch run <SQL 语句>    - 批量执行 SQL 语句（在事务中）\n"
            "\n"
            "特性:\n"
            "  - 自动在事务中执行所有语句\n"
            "  - 任一语句失败则回滚全部操作\n"
            "  - 全部成功则自动提交\n"
            "\n"
            "示例:\n"
            "  /batch file migrate.sql\n"
            "  /batch run INSERT INTO t VALUES (1); UPDATE t SET x=2;\n"
        )
        self.app._add_output(help_text, "output")

    def handle_explain(self, args: list[str]):
        """处理 /explain 命令 - 查看 SQL 查询计划"""
        if not args:
            self._show_explain_help()
            return

        if not self.app.connection_manager.is_connected:
            self.app._add_output("错误：未连接数据库\n", "error")
            return

        sql = " ".join(args)

        try:
            # 获取查询计划
            result = self.app.connection_manager.get_explain_plan(sql)

            # 显示查询计划
            self.app._add_output(f"查询计划:\n", "bold")
            self.app._add_output("-" * 80 + "\n", "dim")

            if result.plan_type == "mysql":
                self._show_explain_mysql(result)
            elif result.plan_type == "postgresql":
                self._show_explain_postgresql(result)
            elif result.plan_type == "sqlite":
                self._show_explain_sqlite(result)

            self.app._add_output("-" * 80 + "\n", "dim")

        except Exception as e:
            self.app._add_output(f"错误：{str(e)}\n", "error")

    def _show_explain_mysql(self, result):
        """显示 MySQL EXPLAIN 结果"""
        # MySQL EXPLAIN 列：id, select_type, table, type, possible_keys, key, key_len, ref, rows, Extra
        columns = result.columns
        rows = result.rows

        if not rows:
            self.app._add_output("无查询计划数据\n", "warning")
            return

        # 显示表头
        header = " | ".join(str(col) for col in columns)
        self.app._add_output(f"{header}\n", "bold")
        self.app._add_output("-" * len(header) + "\n", "dim")

        # 显示数据行
        for row in rows:
            line = " | ".join(str(v) if v is not None else "NULL" for v in row)
            self.app._add_output(f"{line}\n", "output")

    def _show_explain_postgresql(self, result):
        """显示 PostgreSQL EXPLAIN 结果"""
        # PostgreSQL EXPLAIN ANALYZE 返回多行文本
        for row in result.rows:
            self.app._add_output(f"{row[0]}\n", "output")

    def _show_explain_sqlite(self, result):
        """显示 SQLite EXPLAIN QUERY PLAN 结果"""
        # SQLite EXPLAIN QUERY PLAN 列：id, parent, notused, detail
        columns = ["id", "parent", "notused", "detail"]

        if not result.rows:
            self.app._add_output("无查询计划数据\n", "warning")
            return

        # 显示表头
        header = f"{'id':<6} {'parent':<8} {'notused':<10} {'detail':<50}"
        self.app._add_output(f"{header}\n", "bold")
        self.app._add_output("-" * len(header) + "\n", "dim")

        # 显示数据行
        for row in result.rows:
            line = f"{str(row[0]):<6} {str(row[1]):<8} {str(row[2]):<10} {str(row[3]):<50}"
            self.app._add_output(f"{line}\n", "output")

        # 显示简单解释
        self.app._add_output("\n提示:\n", "bold")
        for row in result.rows:
            detail = str(row[3])
            if "SCAN" in detail.upper():
                if "INDEX" in detail.upper():
                    self.app._add_output(f"  - 使用索引扫描：{detail}\n", "dim")
                else:
                    self.app._add_output(f"  - 全表扫描：{detail}\n", "warning")
            elif "SEARCH" in detail.upper():
                self.app._add_output(f"  - 使用索引查找：{detail}\n", "success")

    def _show_explain_help(self):
        """显示 explain 帮助"""
        help_text = (
            "查询计划命令:\n"
            "  /explain <SQL 查询>    - 分析 SQL 查询执行计划\n"
            "\n"
            "支持的数据库:\n"
            "  - MySQL: 使用 EXPLAIN 分析查询\n"
            "  - PostgreSQL: 使用 EXPLAIN ANALYZE 分析查询\n"
            "  - SQLite: 使用 EXPLAIN QUERY PLAN 分析查询\n"
            "\n"
            "示例:\n"
            "  /explain SELECT * FROM users WHERE id = 1\n"
            "  /explain SELECT u.*, o.* FROM users u JOIN orders o ON u.id = o.user_id\n"
        )
        self.app._add_output(help_text, "output")
