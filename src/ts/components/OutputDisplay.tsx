/**
 * 输出显示组件 - 增强版
 * 支持代码块、面板、信息框等多种样式
 */

import React from 'react';
import { Box, Text } from 'ink';
import chalk from 'chalk';

interface OutputProps {
  lines: OutputLine[];
}

export interface OutputLine {
  style: string;
  text: string;
}

/**
 * 渲染面板边框
 */
const renderPanel = (text: string, title?: string) => {
  const lines = text.split('\n').filter(l => l);
  const maxLen = Math.max(...lines.map(l => l.length), title?.length || 0);
  const paddedWidth = Math.min(maxLen + 4, 80);

  const topBorder = title
    ? `╭─ ${title} `.padEnd(paddedWidth, '─') + '─╮'
    : '╭' + '─'.repeat(paddedWidth - 2) + '╮';
  const bottomBorder = '╰' + '─'.repeat(paddedWidth - 2) + '╯';

  const result: React.ReactNode[] = [];
  result.push(<Text key="top" color="gray">{topBorder}</Text>);

  for (const line of lines) {
    const padded = line.padEnd(paddedWidth - 4);
    result.push(
      <Text key={`content-${line.substring(0, 20)}`} color="gray">
        │ {padded} │
      </Text>
    );
  }

  result.push(<Text key="bottom" color="gray">{bottomBorder}</Text>);
  return <Box key={`panel-${title || 'untitled'}`} flexDirection="column">{result}</Box>;
};

/**
 * 渲染代码块
 */
const renderCodeBlock = (text: string, language?: string) => {
  const lines = text.split('\n');
  const result: React.ReactNode[] = [];

  // 顶部边框
  result.push(
    <Text key="top" color="gray">
      ┌{language ? ` ${language} ` : ''}{'─'.repeat(Math.max(0, 76 - (language?.length || 0) * 2))}┐
    </Text>
  );

  // 代码内容
  for (const line of lines) {
    const truncated = line.length > 76 ? line.substring(0, 73) + '...' : line;
    result.push(
      <Text key={`code-${line.substring(0, 20)}`} color="dim">
        │ {chalk.dim(truncated)} │
      </Text>
    );
  }

  // 底部边框
  result.push(<Text key="bottom" color="gray">└{'─'.repeat(76)}┘</Text>);

  return <Box key={`codeblock-${language || 'sql'}`} flexDirection="column">{result}</Box>;
};

/**
 * 渲染信息框
 */
const renderInfo = (text: string, type: 'info' | 'tip' | 'note' = 'info') => {
  const icons: Record<string, string> = {
    info: 'ℹ',
    tip: '💡',
    note: '📌',
  };
  const colors: Record<string, 'blue' | 'yellow' | 'cyan'> = {
    info: 'blue',
    tip: 'yellow',
    note: 'cyan',
  };

  const icon = icons[type];
  const color = colors[type];

  return (
    <Text key={`info-${type}`} color={color}>
      {icon} {text}
    </Text>
  );
};

/**
 * 渲染链接
 */
const renderLink = (text: string, url?: string) => {
  return (
    <Text key={`link-${text}`} color="cyan" underline>
      {text}
    </Text>
  );
};

export const OutputDisplay: React.FC<OutputProps> = ({ lines }) => {
  const renderLine = (line: OutputLine, index: number) => {
    const { style, text } = line;

    switch (style) {
      case 'error':
        return <Text key={index} color="red">{text}</Text>;
      case 'success':
        return <Text key={index} color="green">{text}</Text>;
      case 'warning':
        return <Text key={index} color="yellow">{text}</Text>;
      case 'dim':
        return <Text key={index} color="gray">{text}</Text>;
      case 'bold':
        return <Text key={index} bold>{text}</Text>;
      case 'command':
        return <Text key={index} color="cyan">{text}</Text>;
      case 'code':
        return renderCodeBlock(text, 'sql');
      case 'panel':
        return renderPanel(text);
      case 'panel-title':
        return renderPanel(text, line.text.split('|')[0] || undefined);
      case 'info':
        return renderInfo(text, 'info');
      case 'tip':
        return renderInfo(text, 'tip');
      case 'note':
        return renderInfo(text, 'note');
      case 'link':
        return renderLink(text);
      case 'output':
      default:
        return <Text key={index} color="white">{text}</Text>;
    }
  };

  return (
    <Box flexDirection="column" flexGrow={1}>
      {lines.map((line, index) => renderLine(line, index))}
    </Box>
  );
};
