/**
 * 示例插件 - 展示如何开发 DBManager 插件
 */

import { DBManagerPlugin, CommandDefinition } from '../src/ts/plugins/types.js';

// 定义插件命令
const commands: CommandDefinition[] = [
  {
    name: '/hello',
    description: '示例命令 - 显示问候语',
    usage: '/hello [name]',
    handler: (args: string[]) => {
      const name = args[0] || 'World';
      console.log(`👋 Hello, ${name}!`);
      console.log('这是来自示例插件的问候！');
    },
    aliases: ['/hi'],
  },
  {
    name: '/time',
    description: '示例命令 - 显示当前时间',
    usage: '/time',
    handler: () => {
      const now = new Date();
      console.log(`🕐 当前时间：${now.toLocaleString('zh-CN')}`);
    },
  },
  {
    name: '/stats',
    description: '示例命令 - 显示数据库统计',
    usage: '/stats',
    handler: async (args: string[]) => {
      console.log('📊 数据库统计信息');
      console.log('这是一个示例命令，实际使用时可以连接数据库获取统计信息');
    },
  },
];

// 导出插件
export const plugin: DBManagerPlugin = {
  name: 'example-plugin',
  version: '1.0.0',
  description: 'DBManager 示例插件，展示插件开发方法',
  author: 'DBManager Team',
  
  commands,
  
  async onLoad(context) {
    console.log(`[Example Plugin] 插件已加载`);
    console.log(`[Example Plugin] DBManager 版本：${context.version}`);
  },
  
  async onUnload() {
    console.log('[Example Plugin] 插件已卸载');
  },
};

export default plugin;
