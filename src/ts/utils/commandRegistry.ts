/**
 * 命令注册和发现工具
 * 提供命令元数据管理和查询功能
 */

export interface CommandInfo {
  name: string;
  aliases: string[];
  description: string;
  usage: string;
  category: string;
  shortcut?: string;
}

export type CommandCategory =
  | 'connection'    // 连接管理
  | 'sql'          // SQL 执行
  | 'transaction'  // 事务管理
  | 'format'       // 格式设置
  | 'system'       // 系统命令
  | 'other';       // 其他

export class CommandRegistry {
  private static readonly commands: CommandInfo[] = [
    // 连接管理
    {
      name: 'connect',
      aliases: ['co'],
      description: '连接到数据库实例',
      usage: '/connect <实例名>',
      category: 'connection',
      shortcut: '',
    },
    {
      name: 'disconnect',
      aliases: [],
      description: '断开当前数据库连接',
      usage: '/disconnect',
      category: 'connection',
    },
    {
      name: 'list',
      aliases: ['ls'],
      description: '列出所有表',
      usage: '/list',
      category: 'connection',
    },
    {
      name: 'desc',
      aliases: ['describe'],
      description: '查看表结构',
      usage: '/desc <表名>',
      category: 'connection',
    },
    {
      name: 'config',
      aliases: [],
      description: '配置管理（add/list/remove/test）',
      usage: '/config <子命令> [参数]',
      category: 'connection',
    },

    // SQL 执行
    {
      name: 'run',
      aliases: [],
      description: '执行 SQL 文件',
      usage: '/run <文件路径>',
      category: 'sql',
    },
    {
      name: 'explain',
      aliases: [],
      description: '查看查询计划',
      usage: '/explain <SQL>',
      category: 'sql',
    },
    {
      name: 'batch',
      aliases: [],
      description: '批量执行 SQL 文件（事务中）',
      usage: '/batch file <文件路径>',
      category: 'sql',
    },

    // 事务管理
    {
      name: 'begin',
      aliases: [],
      description: '开始事务',
      usage: '/begin',
      category: 'transaction',
    },
    {
      name: 'commit',
      aliases: [],
      description: '提交事务',
      usage: '/commit',
      category: 'transaction',
    },
    {
      name: 'rollback',
      aliases: [],
      description: '回滚事务',
      usage: '/rollback',
      category: 'transaction',
    },

    // 格式设置
    {
      name: 'format',
      aliases: [],
      description: '设置输出格式（table/json/csv/markdown）',
      usage: '/format <格式>',
      category: 'format',
    },

    // 系统命令
    {
      name: 'help',
      aliases: ['h'],
      description: '显示帮助信息',
      usage: '/help [关键词]',
      category: 'system',
      shortcut: '',
    },
    {
      name: 'history',
      aliases: ['h'],
      description: '查看历史命令',
      usage: '/history [数量]',
      category: 'system',
    },
    {
      name: 'clear',
      aliases: [],
      description: '清屏',
      usage: '/clear',
      category: 'system',
      shortcut: 'Ctrl+L',
    },
    {
      name: 'quit',
      aliases: ['exit', 'q'],
      description: '退出程序',
      usage: '/quit',
      category: 'system',
      shortcut: 'Ctrl+D',
    },

    // 其他
    {
      name: 'export',
      aliases: [],
      description: '导出查询结果',
      usage: '/export <格式> [文件路径]',
      category: 'other',
    },
    {
      name: 'use',
      aliases: [],
      description: '切换数据库',
      usage: '/use <数据库名>',
      category: 'other',
    },

    // 智能助手（v0.5.0 新增）
    {
      name: 'diagnose',
      aliases: ['diag'],
      description: 'SQL 错误诊断（v0.5.0 新功能）',
      usage: '/diagnose <错误消息或代码>',
      category: 'sql',
    },

    // CLI 体验增强（v0.5.0 新增）
    {
      name: 'bookmark',
      aliases: ['bm'],
      description: '查询书签管理（v0.5.0 新功能）',
      usage: '/bookmark <子命令> [参数]',
      category: 'other',
    },

    // 智能助手（v0.5.0 新增）
    {
      name: 'optimize',
      aliases: ['opt'],
      description: 'SQL 查询优化建议（v0.5.0 新功能）',
      usage: '/optimize <SQL 语句>',
      category: 'sql',
    },
    {
      name: 'nl2sql',
      aliases: ['nl'],
      description: '自然语言生成 SQL（v0.5.0 新功能）',
      usage: '/nl2sql <自然语言描述>',
      category: 'sql',
    },

    // AI 增强（v0.6.0 新增）
    {
      name: 'suggest-index',
      aliases: [],
      description: '自动索引建议（v0.6.0 新功能）',
      usage: '/suggest-index <SQL 语句>',
      category: 'sql',
    },
    {
      name: 'fix-sql',
      aliases: [],
      description: 'SQL 自动修复（v0.6.0 新功能）',
      usage: '/fix-sql <SQL 语句>',
      category: 'sql',
    },
  ];

  /**
   * 获取所有命令
   */
  static getAllCommands(): CommandInfo[] {
    return this.commands;
  }

  /**
   * 按分类获取命令
   */
  static getCommandsByCategory(category: CommandCategory): CommandInfo[] {
    return this.commands.filter(cmd => cmd.category === category);
  }

  /**
   * 按名称或别名查找命令
   */
  static findCommand(nameOrAlias: string): CommandInfo | undefined {
    const lower = nameOrAlias.toLowerCase();
    return this.commands.find(
      cmd => cmd.name.toLowerCase() === lower ||
             cmd.aliases.some(a => a.toLowerCase() === lower)
    );
  }

  /**
   * 搜索命令（支持模糊匹配）
   */
  static searchCommands(query: string): CommandInfo[] {
    const lowerQuery = query.toLowerCase().trim();
    if (!lowerQuery) return this.commands;

    return this.commands.filter(cmd => {
      // 完全匹配
      if (cmd.name.toLowerCase() === lowerQuery) return true;
      if (cmd.aliases.some(a => a.toLowerCase() === lowerQuery)) return true;

      // 包含匹配
      if (cmd.name.toLowerCase().includes(lowerQuery)) return true;
      if (cmd.aliases.some(a => a.toLowerCase().includes(lowerQuery))) return true;
      if (cmd.description.toLowerCase().includes(lowerQuery)) return true;
      if (cmd.usage.toLowerCase().includes(lowerQuery)) return true;
      if (cmd.category.toLowerCase().includes(lowerQuery)) return true;

      // 模糊匹配（简单的字符匹配）
      return this.fuzzyMatch(lowerQuery, cmd.name.toLowerCase());
    });
  }

  /**
   * 简单的模糊匹配算法
   */
  private static fuzzyMatch(query: string, target: string): boolean {
    let queryIndex = 0;
    for (let i = 0; i < target.length && queryIndex < query.length; i++) {
      if (target[i] === query[queryIndex]) {
        queryIndex++;
      }
    }
    return queryIndex === query.length;
  }

  /**
   * 获取所有分类
   */
  static getCategories(): string[] {
    const categories = new Set<string>();
    for (const cmd of this.commands) {
      categories.add(cmd.category);
    }
    return Array.from(categories);
  }

  /**
   * 获取分类的中文显示名称
   */
  static getCategoryDisplayName(category: string): string {
    const displayNames: Record<string, string> = {
      'connection': '连接管理',
      'sql': 'SQL 执行',
      'transaction': '事务管理',
      'format': '格式设置',
      'system': '系统命令',
      'other': '其他',
    };
    return displayNames[category] || category;
  }

  /**
   * 获取命令的简洁帮助信息
   */
  static getCommandHelp(commandName: string): string | undefined {
    const cmd = this.findCommand(commandName);
    if (!cmd) return undefined;
    return `${cmd.usage} - ${cmd.description}`;
  }

  /**
   * 获取所有快捷键命令
   */
  static getCommandsShortcuts(): CommandInfo[] {
    return this.commands.filter(cmd => cmd.shortcut);
  }
}
