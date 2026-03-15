/**
 * 增强的补全弹窗组件
 * 多选列表 UI，支持键盘导航
 */

import React from 'react';
import { Box, Text } from 'ink';
import chalk from 'chalk';

export interface CompletionItem {
  label: string;
  type: 'command' | 'keyword' | 'table' | 'column' | 'function';
  description?: string;
}

interface CompletionPopupProps {
  items: CompletionItem[];
  selectedIndex: number;
  maxVisible?: number;
}

// 不同类型项的颜色
const typeColors: Record<string, string> = {
  command: 'cyan',
  keyword: 'green',
  table: 'yellow',
  column: 'blue',
  function: 'magenta',
};

// 类型图标
const typeIcons: Record<string, string> = {
  command: '⌘',
  keyword: 'K',
  table: '◫',
  column: '|',
  function: 'ƒ',
};

export const CompletionPopup: React.FC<CompletionPopupProps> = ({
  items,
  selectedIndex,
  maxVisible = 8,
}) => {
  if (items.length === 0) {
    return null;
  }

  // 计算可见范围
  let startIndex = 0;
  let endIndex = items.length;

  if (items.length > maxVisible) {
    // 确保选中项在可见范围内
    if (selectedIndex >= maxVisible) {
      startIndex = selectedIndex - maxVisible + 1;
      endIndex = startIndex + maxVisible;
    }
  }

  const visibleItems = items.slice(startIndex, endIndex);
  const totalWidth = 50;

  // 渲染单个项
  const renderItem = (item: CompletionItem, index: number, isSelected: boolean) => {
    const actualIndex = startIndex + index;
    const color = typeColors[item.type] || 'white';
    const icon = typeIcons[item.type] || '•';
    const label = item.label.padEnd(20);

    // 选中状态
    if (isSelected) {
      return (
        <Box key={actualIndex} width={totalWidth}>
          <Text backgroundColor="cyan" color="black">
            {' '}
            ▶ {icon} {label}
            {item.description ? ` - ${item.description}`.substring(0, 24) : ''}
            {' '}
          </Text>
        </Box>
      );
    }

    // 未选中状态
    return (
      <Box key={actualIndex} width={totalWidth}>
        <Text color="gray">
          {' '}
          {actualIndex === selectedIndex ? '▶' : ' '}  {icon}{' '}
          <Text color={color}>{label}</Text>
          {item.description ? (
            <Text color="dim">
              {' '}
              - {item.description}
            </Text>
          ) : null}
        </Text>
      </Box>
    );
  };

  // 计算是否需要显示更多提示
  const showMoreTop = startIndex > 0;
  const showMoreBottom = endIndex < items.length;

  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor="gray"
      paddingX={1}
      marginTop={1}
    >
      {showMoreTop && (
        <Box justifyContent="center">
          <Text color="gray">
            ... {startIndex} more above
          </Text>
        </Box>
      )}
      {visibleItems.map((item, index) =>
        renderItem(item, index, index === selectedIndex - startIndex)
      )}
      {showMoreBottom && (
        <Box justifyContent="center">
          <Text color="gray">
            ... {items.length - endIndex} more below
          </Text>
        </Box>
      )}
      <Box marginTop={1}>
        <Text color="dim">
          ↑/↓ 导航 | Enter 选择 | ESC 取消 | Tab 补全
        </Text>
      </Box>
    </Box>
  );
};

/**
 * 获取补全项类型
 */
export function getCompletionType(value: string): CompletionItem['type'] {
  const lower = value.toLowerCase();

  // 命令
  if (value.startsWith('/')) {
    return 'command';
  }

  // SQL 关键字
  const keywords = [
    'select', 'from', 'where', 'and', 'or', 'not', 'in', 'is', 'null',
    'like', 'between', 'exists', 'case', 'when', 'then', 'else', 'end',
    'join', 'inner', 'left', 'right', 'outer', 'on', 'as', 'group', 'by',
    'having', 'order', 'asc', 'desc', 'limit', 'offset', 'union', 'all',
    'insert', 'into', 'values', 'update', 'set', 'delete', 'create', 'drop',
    'alter', 'table', 'index', 'view', 'trigger', 'database', 'schema',
    'primary', 'key', 'foreign', 'references', 'unique', 'check', 'default',
    'constraint', 'add', 'modify', 'change', 'rename', 'column', 'if',
  ];
  if (keywords.includes(lower)) {
    return 'keyword';
  }

  // SQL 函数
  const functions = [
    'count', 'sum', 'avg', 'min', 'max', 'abs', 'round', 'ceil', 'floor',
    'length', 'trim', 'upper', 'lower', 'substr', 'replace', 'concat',
    'now', 'current_date', 'current_time', 'current_timestamp',
  ];
  if (functions.includes(lower)) {
    return 'function';
  }

  return 'table';
}

/**
 * 创建补全项
 */
export function createCompletionItem(
  label: string,
  type?: CompletionItem['type'],
  description?: string
): CompletionItem {
  return {
    label,
    type: type || getCompletionType(label),
    description,
  };
}
