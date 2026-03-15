"""
DBManager 主应用类

简化版本 - 修复输出显示
"""

import sys
from typing import Optional, List

from prompt_toolkit import Application
from prompt_toolkit.buffer import Buffer
from prompt_toolkit.layout import Layout
from prompt_toolkit.layout.containers import HSplit, VSplit, Window, ScrollOffsets
from prompt_toolkit.layout.controls import BufferControl, FormattedTextControl
from prompt_toolkit.key_binding import KeyBindings
from prompt_toolkit.styles import Style
from prompt_toolkit.formatted_text import FormattedText, to_formatted_text
from prompt_toolkit.document import Document

from .completer import SQLCompleter
from .commands import CommandHandler
from .highlighter import SimpleSQLLexer
from ..config.manager import ConfigManager
from ..database.connection import ConnectionManager, QueryResult


# 配色方案
DARK_STYLE = Style.from_dict(
    {
        "prompt": "ansigreen bold",
        "command": "ansicyan",
        "output": "ansilightgray",
        "error": "ansired bold",
        "success": "ansigreen",
        "warning": "ansiyellow",
        "status-bar": "bg:#333333 #ffffff",
        "status-bar.offline": "bg:#333333 #ff6b6b",
        "line": "ansilightgray",
        # SQL 语法高亮
        "ansiblue": "ansiblue",
        "ansimagenta": "ansimagenta",
        "ansicyan": "ansicyan",
        "ansiwhite": "ansiwhite",
        "ansiyellow": "ansiyellow",
        "ansigreen": "ansigreen",
        "ansilightgray italic": "ansilightgray italic",
        "ansiteal": "ansiteal",
    }
)


class DBManagerApp:
    """DBManager 主应用类"""

    def __init__(self):
        self.config_manager = ConfigManager()
        self.connection_manager = ConnectionManager(self.config_manager)
        self.command_handler = CommandHandler(self)

        # 输出历史 (存储 formatted text)
        self.output_history: List[tuple] = []

        # 默认输出格式
        self.output_format: str = "table"

        # 命令历史记录
        self.command_history: List[str] = []
        self.history_index: int = -1

        # 创建输出缓冲区 (使用 Document 来设置只读缓冲区的内容)
        self.output_buffer = Buffer(read_only=False)

        # 创建补全器
        self.completer = SQLCompleter(self.connection_manager, self.config_manager)

        # 创建命令缓冲区
        self.input_buffer = Buffer(
            completer=self.completer,
            complete_while_typing=True,
        )

        # 创建键绑定
        self.key_bindings = self._create_key_bindings()

        # 创建状态栏
        self.status_bar = FormattedTextControl(self._get_status_bar_text)

        # 创建布局
        self.layout = self._create_layout()

        # 创建应用
        self.app = Application(
            layout=self.layout,
            key_bindings=self.key_bindings,
            style=DARK_STYLE,
            full_screen=False,  # 改为非全屏模式，便于复制
            mouse_support=True,
        )

        # 初始化欢迎信息
        self._init_welcome()

    def _create_key_bindings(self) -> KeyBindings:
        """创建快捷键绑定"""
        kb = KeyBindings()

        @kb.add("enter")
        def _(event):
            """回车键处理"""
            self._handle_input()

        @kb.add("c-c")
        def _(event):
            """Ctrl+C 取消"""
            event.app.exit(exception=KeyboardInterrupt())

        @kb.add("c-d")
        def _(event):
            """Ctrl+D 退出"""
            if not self.input_buffer.text:
                event.app.exit()
            else:
                self.input_buffer.text = ""

        @kb.add("c-l")
        def _(event):
            """Ctrl+L 清屏"""
            self.output_history.clear()
            self._refresh_output()

        @kb.add("tab")
        def _(event):
            """Tab 补全"""
            b = event.current_buffer
            if b.complete_state:
                b.complete_next()
            else:
                b.start_completion()

        @kb.add("s-tab")
        def _(event):
            """Shift+Tab 上一个补全"""
            b = event.current_buffer
            if b.complete_state:
                b.complete_previous()

        @kb.add("escape")
        def _(event):
            """ESC 取消补全"""
            b = event.current_buffer
            if b.complete_state:
                b.cancel_completion()

        @kb.add("up", eager=True)
        def _(event):
            """↑ 上一条历史命令 / 补全菜单上一个选项"""
            b = event.current_buffer
            # 如果补全菜单打开，导航到上一个补全选项
            if b.complete_state:
                b.complete_previous()
                return
            # 处理历史命令导航
            if self.command_history:
                if self.history_index < len(self.command_history) - 1:
                    self.history_index += 1
                    self.input_buffer.text = self.command_history[
                        len(self.command_history) - 1 - self.history_index
                    ]

        @kb.add("down", eager=True)
        def _(event):
            """↓ 下一条历史命令 / 补全菜单下一个选项"""
            b = event.current_buffer
            # 如果补全菜单打开，导航到下一个补全选项
            if b.complete_state:
                b.complete_next()
                return
            # 处理历史命令导航
            if self.command_history and self.history_index >= 0:
                self.history_index -= 1
                if self.history_index < 0:
                    self.input_buffer.text = ""
                else:
                    self.input_buffer.text = self.command_history[
                        len(self.command_history) - 1 - self.history_index
                    ]

        return kb

    def _create_layout(self) -> Layout:
        """创建界面布局"""
        # 输出区域（启用滚动）
        output_control = BufferControl(buffer=self.output_buffer)
        output_window = Window(
            content=output_control,
            wrap_lines=True,
            height=None,
            scroll_offsets=ScrollOffsets(top=2, bottom=2),
        )

        # 提示符
        prompt_control = FormattedTextControl(self._get_prompt_text)
        prompt_window = Window(
            content=prompt_control,
            width=6,
            dont_extend_width=True,
        )

        # 输入区域（带语法高亮）
        input_window = Window(
            content=BufferControl(buffer=self.input_buffer, lexer=SimpleSQLLexer()),
            wrap_lines=True,
        )

        # 输入行 (提示符 + 输入框)
        input_line = VSplit([prompt_window, input_window])

        # 主布局
        root_container = HSplit(
            [
                output_window,
                Window(height=1, char="─", style="class:line"),
                input_line,
                Window(height=1, content=self.status_bar, style="class:status-bar"),
            ]
        )

        return Layout(root_container, focused_element=input_window)

    def _get_prompt_text(self):
        """获取提示符文本"""
        if self.connection_manager.is_connected:
            return [("class:prompt", "sql> ")]
        else:
            return [("class:prompt", "sql> ")]

    def _get_status_bar_text(self):
        """获取状态栏文本"""
        if self.connection_manager.is_connected:
            conn = self.connection_manager.current_connection
            info = f" {conn.db_type} @ {conn.host}:{conn.port} | {conn.database} "
            return [("class:status-bar", info)]
        else:
            return [("class:status-bar.offline", " 未连接 | 输入 /connect 连接数据库 ")]

    def _handle_input(self):
        """处理用户输入"""
        text = self.input_buffer.text.strip()
        if not text:
            return

        # 添加到历史
        self._add_to_history(text)

        # 添加到命令历史（仅非空命令）
        if text and not text.startswith("/history"):
            self.command_history.append(text)
            self.history_index = -1  # 重置历史索引

        # 清空输入框
        self.input_buffer.text = ""

        # 处理命令
        if text.startswith("/"):
            self.command_handler.handle_command(text)
        else:
            # 执行 SQL
            self._execute_sql(text)

    def _execute_sql(self, sql: str):
        """执行 SQL 语句"""
        if not self.connection_manager.is_connected:
            self._add_output("错误：未连接数据库。请先使用 /connect 连接。\n", "error")
            return

        try:
            result = self.connection_manager.execute(sql)
            self._format_result(result)
        except Exception as e:
            self._add_output(f"错误：{str(e)}\n", "error")

    def _format_result(self, result: QueryResult):
        """格式化显示结果"""
        # 根据设置的格式进行输出
        fmt = self.output_format

        if fmt == "json":
            self._format_result_json(result)
        elif fmt == "csv":
            self._format_result_csv(result)
        elif fmt == "markdown":
            self._format_result_markdown(result)
        else:
            # table 格式（默认）
            self._format_result_table(result)

    def _format_result_table(self, result: QueryResult):
        """表格格式显示结果"""
        if not result.rows:
            self._add_output(f"✓ 执行成功 - 影响 {result.affected_rows} 行\n", "success")
            return

        # 简单表格输出
        output_lines = []

        # 表头
        header = "│ " + " │ ".join(str(col) for col in result.columns) + " │"
        separator = "├─" + "─┼─".join("─" * len(col) for col in result.columns) + "─┤"
        top_border = "┌─" + "─┬─".join("─" * len(col) for col in result.columns) + "─┐"
        bottom_border = "└─" + "─┴─".join("─" * len(col) for col in result.columns) + "─┘"

        output_lines.append(top_border)
        output_lines.append(header)
        output_lines.append(separator)

        # 数据行
        max_rows = self.config_manager.settings.get("max_display_rows", 100)
        displayed = min(len(result.rows), max_rows)

        for row in result.rows[:displayed]:
            row_str = "│ " + " │ ".join(str(v) if v is not None else "NULL" for v in row) + " │"
            output_lines.append(row_str)

        output_lines.append(bottom_border)

        # 统计信息
        stats = f"{displayed} rows in {result.execution_time_ms:.2f}ms"
        if len(result.rows) > max_rows:
            stats += f" (共 {len(result.rows)} 行，仅显示前 {max_rows} 行)"
        output_lines.append(stats)

        self._add_output("\n".join(output_lines) + "\n", "output")

    def _format_result_json(self, result: QueryResult):
        """JSON 格式显示结果"""
        import json

        if not result.rows:
            self._add_output(f"✓ 执行成功 - 影响 {result.affected_rows} 行\n", "success")
            return

        if not result.columns:
            self._add_output("[]\n", "output")
            return

        # 构建字典列表
        data = []
        for row in result.rows:
            row_dict = {}
            for i, col in enumerate(result.columns):
                value = row[i] if i < len(row) else None
                row_dict[col] = value
            data.append(row_dict)

        self._add_output(json.dumps(data, indent=2, ensure_ascii=False) + "\n", "output")

    def _format_result_csv(self, result: QueryResult):
        """CSV 格式显示结果"""
        import csv
        from io import StringIO

        if not result.rows:
            self._add_output(f"✓ 执行成功 - 影响 {result.affected_rows} 行\n", "success")
            return

        output = StringIO()
        writer = csv.writer(output)

        # 写入表头
        if result.columns:
            writer.writerow(result.columns)

        # 写入数据
        for row in result.rows:
            writer.writerow([v if v is not None else "" for v in row])

        self._add_output(output.getvalue(), "output")

    def _format_result_markdown(self, result: QueryResult):
        """Markdown 表格格式显示结果"""
        if not result.rows:
            self._add_output(f"✓ 执行成功 - 影响 {result.affected_rows} 行\n", "success")
            return

        if not result.columns:
            return

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

        self._add_output("\n".join(lines) + "\n", "output")

    def _add_output(self, text: str, style: str = ""):
        """添加输出到历史"""
        self.output_history.append((f"class:{style}" if style else "", text))
        self._refresh_output()

    def _add_to_history(self, text: str):
        """添加命令到历史"""
        self.output_history.append(("class:command", f"sql> {text}\n"))

    def set_output_format(self, fmt: str):
        """设置输出格式"""
        if fmt not in ["table", "json", "csv", "markdown"]:
            return False
        self.output_format = fmt
        return True

    def get_output_format(self) -> str:
        """获取当前输出格式"""
        return self.output_format

    def _refresh_output(self):
        """刷新输出显示"""
        self.output_buffer.text = "".join(text for _, text in self.output_history)
        # 滚动到底部
        self.output_buffer.cursor_position = len(self.output_buffer.text)

    def run(self):
        """运行应用"""
        self.app.run()

    def _init_welcome(self):
        """初始化欢迎信息"""
        from .. import __version__

        welcome = []
        welcome.append(("class:command", "╔══════════════════════════════════════════════════════════╗\n"))
        welcome.append(("class:command", f"║                   DBManager v{__version__}                      ║\n"))
        welcome.append(("class:command", "║              交互式数据库管理命令行工具                    ║\n"))
        welcome.append(("class:command", "╚══════════════════════════════════════════════════════════╝\n\n"))
        welcome.append(("class:output", "提示：输入 /help 查看可用命令，输入 / 查看命令提示\n\n"))
        self.output_history.extend(welcome)
        self._refresh_output()
