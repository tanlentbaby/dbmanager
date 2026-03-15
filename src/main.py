#!/usr/bin/env python3
"""
DBManager - 交互式数据库管理命令行工具

主入口
"""

import sys

from src.cli.app import DBManagerApp


def main():
    """主函数"""
    # 处理命令行参数
    args = sys.argv[1:]

    # 检查是否有命令行参数（未来扩展）
    if "--help" in args or "-h" in args:
        print_help()
        sys.exit(0)

    if "--version" in args or "-v" in args:
        from src import __version__
        print(f"DBManager v{__version__}")
        sys.exit(0)

    # 启动交互式应用
    app = DBManagerApp()
    app.run()


def print_help():
    """打印帮助信息"""
    from src import __version__

    help_text = f"""
DBManager v{__version__} - 交互式数据库管理命令行工具

用法:
  dbmanager [选项]

选项:
  -h, --help      显示此帮助信息
  -v, --version   显示版本号

交互命令:
  /config         配置管理
  /connect        连接数据库
  /list           列出所有表
  /desc           查看表结构
  /help           显示帮助
  /quit           退出程序

快捷键:
  Tab             自动补全
  Ctrl+C          取消
  Ctrl+D          退出
  Ctrl+L          清屏
  ↑/↓             历史命令

文档：https://github.com/xxx/dbmanager/wiki
"""
    print(help_text)


if __name__ == "__main__":
    main()
