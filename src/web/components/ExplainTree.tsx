/**
 * EXPLAIN 执行计划树形展示组件
 * React + Ink 版本
 */

import React, { FC } from 'ink';
import { Box, Text } from 'ink';

export interface ExplainNode {
  id: string;
  operation: string;
  table?: string;
  cost?: number;
  rows?: number;
  type?: string;
  key?: string;
  extra?: string;
  children: ExplainNode[];
}

interface ExplainTreeProps {
  root: ExplainNode;
  showCost?: boolean;
  showRows?: boolean;
}

export const ExplainTree: FC<ExplainTreeProps> = ({ root, showCost = true, showRows = true }) => {
  return (
    <Box flexDirection="column">
      <TreeNode node={root} prefix="" isLast={true} showCost={showCost} showRows={showRows} />
    </Box>
  );
};

interface TreeNodeProps {
  node: ExplainNode;
  prefix: string;
  isLast: boolean;
  showCost: boolean;
  showRows: boolean;
}

const TreeNode: FC<TreeNodeProps> = ({ node, prefix, isLast, showCost, showRows }) => {
  const connector = isLast ? '└─' : '├─';
  const costStr = showCost && node.cost !== undefined ? ` cost=${node.cost}` : '';
  const rowsStr = showRows && node.rows !== undefined ? ` rows=${node.rows}` : '';
  const typeStr = node.type ? ` [${node.type}]` : '';
  
  const operationText = `${node.operation}${node.table ? ` on ${node.table}` : ''}`;
  
  return (
    <Box flexDirection="column">
      <Box>
        <Text>{prefix}{connector} </Text>
        <Text color="cyan">{operationText}</Text>
        <Text color="gray">{typeStr}{costStr}{rowsStr}</Text>
      </Box>
      
      {node.children.map((child, index) => (
        <TreeNode
          key={child.id}
          node={child}
          prefix={prefix + (isLast ? '  ' : '│ ')}
          isLast={index === node.children.length - 1}
          showCost={showCost}
          showRows={showRows}
        />
      ))}
      
      {node.extra && (
        <Box>
          <Text>{prefix}{isLast ? '  ' : '│ '}  </Text>
          <Text color="yellow" wrap="truncate">Extra: {node.extra}</Text>
        </Box>
      )}
    </Box>
  );
};

export default ExplainTree;
