/**
 * 状态栏组件 - 增强版
 * 添加快捷键提示轮播和模式指示
 */

import React, { useState, useEffect } from 'react';
import { Box, Text } from 'ink';
import chalk from 'chalk';

interface StatusBarProps {
  connected: boolean;
  inTransaction?: boolean;
  dbType?: string;
  host?: string;
  port?: number;
  database?: string;
  outputFormat?: string;
  mode?: 'normal' | 'commandPalette' | 'completion' | 'select';
}

// 快捷键提示列表
const SHORTCUT_HINTS = [
  { keys: 'Ctrl+P', action: '命令面板' },
  { keys: '↑/↓', action: '历史导航' },
  { keys: 'Tab', action: '自动补全' },
  { keys: 'Ctrl+L', action: '清屏' },
  { keys: 'Ctrl+D', action: '退出' },
  { keys: '/help', action: '帮助' },
];

export const StatusBar: React.FC<StatusBarProps> = ({
  connected,
  inTransaction,
  dbType,
  host,
  port,
  database,
  outputFormat = 'table',
  mode = 'normal',
}) => {
  const [shortcutIndex, setShortcutIndex] = useState(0);

  // 快捷键提示轮播（每 5 秒切换）
  useEffect(() => {
    const interval = setInterval(() => {
      setShortcutIndex((prev) => (prev + 1) % SHORTCUT_HINTS.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const currentShortcut = SHORTCUT_HINTS[shortcutIndex];

  // 模式指示器
  const modeIndicator = () => {
    switch (mode) {
      case 'commandPalette':
        return (
          <Text backgroundColor="cyan" color="black">
            {' '}
            ⌘ 命令面板
          </Text>
        );
      case 'completion':
        return (
          <Text backgroundColor="blue" color="white">
            {' '}
            Tab 补全
          </Text>
        );
      case 'select':
        return (
          <Text backgroundColor="yellow" color="black">
            {' '}
            选择模式
          </Text>
        );
      default:
        return null;
    }
  };

  if (connected && dbType && host && port !== undefined && database) {
    return (
      <Box width="100%" flexDirection="column">
        {/* 主状态栏 */}
        <Box>
          <Text backgroundColor="black" color="green">
            {' '}
            {dbType} @ {host}:{port} | {database}{' '}
          </Text>
          <Text backgroundColor="black" color="gray"> | 格式：{outputFormat} </Text>
          {inTransaction && (
            <Text backgroundColor="black" color="yellow"> [事务中] </Text>
          )}
          {modeIndicator()}
          <Box flexGrow={1} />
          {/* 快捷键提示 */}
          <Text backgroundColor="black" color="dim">
            {' '}
            {currentShortcut.keys}: {currentShortcut.action}{' '}
          </Text>
        </Box>
      </Box>
    );
  }

  return (
    <Box width="100%" flexDirection="column">
      <Box>
        <Text backgroundColor="red" color="white"> 未连接 | 输入 /connect 连接数据库 </Text>
        <Box flexGrow={1} />
        <Text backgroundColor="black" color="dim">
          {' '}
          {currentShortcut.keys}: {currentShortcut.action}{' '}
        </Text>
      </Box>
    </Box>
  );
};
