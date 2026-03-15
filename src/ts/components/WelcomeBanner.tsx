/**
 * 欢迎横幅组件
 */

import React from 'react';
import { Box, Text } from 'ink';
import chalk from 'chalk';

interface WelcomeBannerProps {
  version: string;
}

export const WelcomeBanner: React.FC<WelcomeBannerProps> = ({ version }) => {
  return (
    <Box flexDirection="column" marginBottom={1}>
      <Box>
        <Text>{chalk.green('╔══════════════════════════════════════════════════════════╗')}</Text>
      </Box>
      <Box>
        <Text>{chalk.green('║')}</Text>
        <Text>                   </Text>
        <Text color="cyan">DBManager v{version}</Text>
        <Text>                    </Text>
        <Text color="green">║</Text>
      </Box>
      <Box>
        <Text>{chalk.green('║')}</Text>
        <Text>              </Text>
        <Text color="gray">交互式数据库管理命令行工具</Text>
        <Text>                    </Text>
        <Text color="green">║</Text>
      </Box>
      <Box>
        <Text>{chalk.green('╚══════════════════════════════════════════════════════════╝')}</Text>
      </Box>
    </Box>
  );
};
