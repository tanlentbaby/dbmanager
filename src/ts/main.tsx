#!/usr/bin/env node
/**
 * DBManager - 交互式数据库管理命令行工具
 * TypeScript + Ink 版本
 */

import React from 'react';
import { render } from 'ink';
import { ConfigManager } from './config/manager.js';
import { ConnectionManager } from './database/connection.js';
import { App } from './app.js';

async function main(): Promise<void> {
  // 检查是否在 TTY 环境中运行
  if (!process.stdin.isTTY) {
    console.error('错误：需要在 TTY 终端中运行');
    console.error('请直接在终端中运行此命令，不要通过管道或重定向');
    process.exit(1);
  }

  if (!process.stdout.isTTY) {
    console.error('错误：需要在 TTY 终端中运行');
    process.exit(1);
  }

  // 处理命令行参数
  const args = process.argv.slice(2);

  if (args.includes('--help') || args.includes('-h')) {
    printHelp();
    process.exit(0);
  }

  if (args.includes('--version') || args.includes('-v')) {
    console.log('DBManager v0.2.0 (TypeScript)');
    process.exit(0);
  }

  // 初始化配置管理器和连接管理器
  const configManager = new ConfigManager();
  const connectionManager = new ConnectionManager(configManager);

  // 渲染 Ink 应用
  // 设置 exitOnCtrlC: false 以允许终端保留原生复制功能
  // 用户可以使用 Shift+鼠标选择来复制内容
  render(
    <React.StrictMode>
      <App configManager={configManager} connectionManager={connectionManager} />
    </React.StrictMode>,
    {
      exitOnCtrlC: false,
    }
  );
}

function printHelp(): void {
  const version = '0.2.0';
  console.log(`
DBManager v${version} - 交互式数据库管理命令行工具 (TypeScript)

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
  /quit           退出

快捷键:
  Tab             自动补全
  Ctrl+C          取消
  Ctrl+D          退出
  Ctrl+L          清屏
  ↑/↓             历史命令

文档：https://github.com/xxx/dbmanager/wiki
`);
}

main().catch(error => {
  console.error('启动失败:', error instanceof Error ? error.message : error);
  process.exit(1);
});
