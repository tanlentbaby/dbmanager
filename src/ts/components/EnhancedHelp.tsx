/**
 * 增强帮助系统组件
 * 分类展示命令，支持关键词过滤
 */

import React from 'react';
import { Box, Text } from 'ink';
import chalk from 'chalk';
import { CommandRegistry, CommandInfo, CommandCategory } from '../utils/commandRegistry.js';

interface EnhancedHelpProps {
  filter?: string; // 可选的关键词过滤
}

export const EnhancedHelp: React.FC<EnhancedHelpProps> = ({ filter }) => {
  const categories: CommandCategory[] = [
    'connection',
    'sql',
    'transaction',
    'format',
    'system',
    'other',
  ];

  // 根据过滤条件获取命令
  const commands = filter
    ? CommandRegistry.searchCommands(filter)
    : CommandRegistry.getAllCommands();

  // 按分类组织命令
  const commandsByCategory = new Map<CommandCategory, CommandInfo[]>();
  for (const cmd of commands) {
    const category = cmd.category as CommandCategory;
    if (!commandsByCategory.has(category)) {
      commandsByCategory.set(category, []);
    }
    commandsByCategory.get(category)!.push(cmd);
  }

  // 渲染单个命令
  const renderCommand = (cmd: CommandInfo) => {
    const aliases = cmd.aliases.length > 0 ? ` (${cmd.aliases.map(a => `/${a}`).join(', ')})` : '';
    const shortcut = cmd.shortcut ? chalk.gray(` [${cmd.shortcut}]`) : '';

    return (
      <Box key={cmd.name} flexDirection="column">
        <Box>
          <Text color="cyan">
            {'  '}
            {`/${cmd.name}`}
          </Text>
          <Text color="gray">{aliases}</Text>
          <Text color="gray">{shortcut}</Text>
        </Box>
        <Box>
          <Text color="gray">
            {'    '}
            {cmd.description}
          </Text>
        </Box>
        <Box>
          <Text color="dim">
            {'    '}
            用法：{cmd.usage}
          </Text>
        </Box>
      </Box>
    );
  };

  // 渲染分类
  const renderCategory = (category: CommandCategory) => {
    const cmds = commandsByCategory.get(category);
    if (!cmds || cmds.length === 0) return null;

    const displayName = CommandRegistry.getCategoryDisplayName(category);

    return (
      <Box key={category} flexDirection="column" marginBottom={1}>
        <Box>
          <Text bold color="green">
            {`► ${displayName}`}
          </Text>
        </Box>
        {cmds.map(renderCommand)}
      </Box>
    );
  };

  // 如果没有搜索结果
  if (commands.length === 0) {
    return (
      <Box flexDirection="column">
        <Text color="yellow">
          未找到与 "{filter}" 相关的命令
        </Text>
        <Box marginTop={1}>
          <Text color="dim">
            提示：尝试其他关键词，或输入 /help 查看所有命令
          </Text>
        </Box>
      </Box>
    );
  }

  return (
    <Box flexDirection="column">
      {/* 标题 */}
      <Box marginBottom={1}>
        <Text bold color="cyan">
          ═══════════════════════════════════════════════════════════
        </Text>
      </Box>
      <Box marginBottom={1}>
        <Text bold color="white">
          DBManager - 交互式数据库管理命令行工具
        </Text>
        {filter && (
          <Text color="gray">
            {' '}
            (搜索：{filter})
          </Text>
        )}
      </Box>
      <Box marginBottom={1}>
        <Text color="cyan">
          ═══════════════════════════════════════════════════════════
        </Text>
      </Box>

      {/* 快捷键提示 */}
      <Box flexDirection="column" marginBottom={1}>
        <Text color="gray">
          快捷键：
        </Text>
        <Text color="dim">
          ↑/↓ - 历史命令导航 | Tab - 自动补全 | Ctrl+P - 命令面板 | Ctrl+L - 清屏 | Ctrl+D - 退出
        </Text>
      </Box>

      {/* 分类展示命令 */}
      {categories.map(renderCategory)}

      {/* 底部提示 */}
      <Box marginTop={1} flexDirection="column">
        <Text color="gray">
          ─────────────────────────────────────────────────────────
        </Text>
        <Text color="dim">
          提示：输入 /help {'<'}关键词{'>'} 搜索特定命令
        </Text>
        <Text color="dim">
          示例：/help connect  或  /help select
        </Text>
      </Box>
    </Box>
  );
};
