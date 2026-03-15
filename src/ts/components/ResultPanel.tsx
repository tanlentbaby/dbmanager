/**
 * 结果面板组件
 * 增强的查询结果展示，带边框、标题、统计信息
 */

import React from 'react';
import { Box, Text } from 'ink';
import chalk from 'chalk';

interface ResultPanelProps {
  title?: string;
  executionTimeMs?: number;
  rowCount?: number;
  affectedRows?: number;
  children: React.ReactNode;
  showStats?: boolean;
}

export const ResultPanel: React.FC<ResultPanelProps> = ({
  title,
  executionTimeMs,
  rowCount,
  affectedRows,
  children,
  showStats = true,
}) => {
  // 渲染统计信息
  const renderStats = () => {
    const stats: string[] = [];

    if (rowCount !== undefined) {
      stats.push(`${rowCount} rows`);
    }

    if (affectedRows !== undefined) {
      stats.push(`${affectedRows} affected`);
    }

    if (executionTimeMs !== undefined) {
      stats.push(`${executionTimeMs.toFixed(2)}ms`);
    }

    if (stats.length === 0) {
      return null;
    }

    return (
      <Text color="dim">
        {stats.join(' • ')}
      </Text>
    );
  };

  return (
    <Box flexDirection="column">
      {/* 标题栏 */}
      {title && (
        <Box>
          <Text color="cyan" bold>
            ╭─ {title}{' '}
            {showStats && renderStats()}
          </Text>
        </Box>
      )}

      {/* 内容区域 */}
      <Box>
        <Text color="gray">│</Text>
        <Box flexGrow={1}>
          {children}
        </Box>
        <Text color="gray">│</Text>
      </Box>

      {/* 底部边框 */}
      <Box>
        <Text color="gray">╰{'─'.repeat(Math.max(title?.length || 0, 40))}╯</Text>
      </Box>
    </Box>
  );
};

/**
 * 简化的结果卡片组件
 */
interface ResultCardProps {
  message: string;
  type?: 'success' | 'error' | 'warning' | 'info';
  executionTimeMs?: number;
}

export const ResultCard: React.FC<ResultCardProps> = ({
  message,
  type = 'info',
  executionTimeMs,
}) => {
  const typeConfig: Record<string, { icon: string; color: string }> = {
    success: { icon: '✓', color: 'green' },
    error: { icon: '✗', color: 'red' },
    warning: { icon: '!', color: 'yellow' },
    info: { icon: 'ℹ', color: 'blue' },
  };

  const { icon, color } = typeConfig[type] || typeConfig.info;

  return (
    <Box flexDirection="column">
      <Box>
        <Text color="gray">╭─</Text>
        <Text color={color} bold>
          {' '}
          {icon}{' '}
        </Text>
        <Text color={color}>{message}</Text>
        {executionTimeMs !== undefined && (
          <Text color="dim">
            {' '}
            ({executionTimeMs.toFixed(2)}ms)
          </Text>
        )}
        <Text color="gray">─╮</Text>
      </Box>
      <Box>
        <Text color="gray">╰{'─'.repeat(40)}╯</Text>
      </Box>
    </Box>
  );
};

/**
 * SQL 执行结果回显组件
 */
interface SqlEchoProps {
  sql: string;
  executionTimeMs?: number;
  rowCount?: number;
}

export const SqlEcho: React.FC<SqlEchoProps> = ({
  sql,
  executionTimeMs,
  rowCount,
}) => {
  // 简单的 SQL 高亮（这里只做基础处理，实际应该用 highlighter.ts）
  const highlightSql = (text: string) => {
    const keywords = ['SELECT', 'FROM', 'WHERE', 'INSERT', 'UPDATE', 'DELETE', 'JOIN', 'ORDER', 'GROUP', 'BY', 'LIMIT'];
    let result = text;

    for (const keyword of keywords) {
      const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
      result = result.replace(regex, (match) => chalk.cyan(match));
    }

    return result;
  };

  return (
    <Box flexDirection="column" marginBottom={1}>
      {/* SQL 语句回显 */}
      <Box>
        <Text color="gray">┌─ </Text>
        <Text color="cyan" bold>
          SQL
        </Text>
        {executionTimeMs !== undefined && (
          <Text color="dim">
            {' '}
            [{executionTimeMs.toFixed(2)}ms]
          </Text>
        )}
        {rowCount !== undefined && (
          <Text color="dim">
            {' '}
            [{rowCount} rows]
          </Text>
        )}
      </Box>
      <Box>
        <Text color="gray">│ </Text>
        <Text>{highlightSql(sql)}</Text>
      </Box>
      <Box>
        <Text color="gray">└{'─'.repeat(40)}</Text>
      </Box>
    </Box>
  );
};
