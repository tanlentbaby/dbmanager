/**
 * 命令面板组件
 * 类 Spotlight 的快速命令搜索面板
 * 快捷键：Ctrl+P
 */

import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import TextInput from 'ink-text-input';
import chalk from 'chalk';
import { CommandRegistry, CommandInfo } from '../utils/commandRegistry.js';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onExecute: (command: string) => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  onExecute,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [results, setResults] = useState<CommandInfo[]>([]);

  // 搜索命令
  useEffect(() => {
    if (searchQuery.trim()) {
      const filtered = CommandRegistry.searchCommands(searchQuery);
      setResults(filtered.slice(0, 10)); // 最多显示 10 条结果
    } else {
      // 无搜索词时显示所有命令
      setResults(CommandRegistry.getAllCommands().slice(0, 10));
    }
    setSelectedIndex(0);
  }, [searchQuery]);

  // 键盘处理
  useInput((input, key) => {
    if (!isOpen) return;

    if (key.escape) {
      setSearchQuery('');
      onClose();
      return;
    }

    if (key.upArrow) {
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : prev));
      return;
    }

    if (key.downArrow) {
      setSelectedIndex((prev) => (prev < results.length - 1 ? prev + 1 : prev));
      return;
    }

    if (key.return) {
      if (results.length > 0 && results[selectedIndex]) {
        const cmd = results[selectedIndex];
        onExecute(`/${cmd.name}`);
        setSearchQuery('');
        onClose();
      }
      return;
    }
  });

  // 重置状态当面板打开时
  useEffect(() => {
    if (isOpen) {
      setSearchQuery('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  // 渲染命令项
  const renderCommand = (cmd: CommandInfo, index: number) => {
    const isSelected = index === selectedIndex;
    const aliases = cmd.aliases.length > 0 ? ` (${cmd.aliases.join(', ')})` : '';
    const shortcut = cmd.shortcut ? chalk.gray(`[${cmd.shortcut}]`) : '';

    if (isSelected) {
      return (
        <Box key={cmd.name} flexDirection="column">
          <Box>
            <Text backgroundColor="cyan" color="black" bold>
              {' '}
              ▶ /{cmd.name}
              {aliases}
              {shortcut}
              {' '}
            </Text>
          </Box>
          <Box>
            <Text backgroundColor="cyan" color="black">
              {' '}
              {cmd.description}
              {' '}
            </Text>
          </Box>
        </Box>
      );
    }

    return (
      <Box key={cmd.name} flexDirection="column">
        <Box>
          <Text color="gray">
            {' '}
            /{cmd.name}
            <Text color="dim">{aliases}</Text>
            {shortcut ? <Text color="dim"> {shortcut}</Text> : null}
          </Text>
        </Box>
        <Box>
          <Text color="dim">
            {'   '}
            {cmd.description}
          </Text>
        </Box>
      </Box>
    );
  };

  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor="cyan"
      padding={1}
      width={60}
    >
      {/* 标题 */}
      <Box marginBottom={1}>
        <Text bold color="cyan">
          ⌘ 命令面板
        </Text>
        <Text color="dim">
          {' '}
          - 搜索命令 (ESC 关闭)
        </Text>
      </Box>

      {/* 搜索输入框 */}
      <Box marginBottom={1}>
        <Text color="cyan">› </Text>
        <TextInput
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="输入命令名称或描述..."
          focus={true}
        />
      </Box>

      {/* 分隔线 */}
      <Box>
        <Text color="gray">{'─'.repeat(56)}</Text>
      </Box>

      {/* 搜索结果 */}
      <Box flexDirection="column" marginTop={1} minHeight={5}>
        {results.length === 0 ? (
          <Text color="yellow">未找到匹配的命令</Text>
        ) : (
          results.map(renderCommand)
        )}
      </Box>

      {/* 底部提示 */}
      <Box marginTop={1}>
        <Text color="dim">
          ↑/↓ 选择 | Enter 执行 | ESC 关闭
        </Text>
        <Text color="dim">
          {' '}
          | 共 {results.length} 个命令
        </Text>
      </Box>
    </Box>
  );
};
