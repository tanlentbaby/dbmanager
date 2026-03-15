/**
 * 插件系统类型定义
 */

import { ConnectionManager } from '../database/connection.js';
import { ConfigManager } from '../config/manager.js';

/**
 * 插件接口
 */
export interface DBManagerPlugin {
  /** 插件名称 */
  name: string;
  /** 插件版本 */
  version: string;
  /** 插件描述 */
  description?: string;
  /** 插件命令 */
  commands?: CommandDefinition[];
  /** 自动补全提供者 */
  completions?: CompletionProvider[];
  /** 生命周期：加载时 */
  onLoad?(context: PluginContext): Promise<void> | void;
  /** 生命周期：卸载时 */
  onUnload?(): Promise<void> | void;
}

/**
 * 命令定义
 */
export interface CommandDefinition {
  /** 命令名称 (如 /schema) */
  name: string;
  /** 命令描述 */
  description: string;
  /** 使用示例 */
  usage?: string;
  /** 命令处理器 */
  handler: CommandHandler;
}

/**
 * 命令处理器
 */
export interface CommandHandler {
  (args: string[], context: CommandContext): Promise<CommandResult>;
}

/**
 * 命令执行结果
 */
export interface CommandResult {
  /** 输出内容 */
  output: string;
  /** 退出码 (0=成功) */
  exitCode: number;
}

/**
 * 命令上下文
 */
export interface CommandContext {
  /** 连接管理器 */
  connectionManager: ConnectionManager;
  /** 配置管理器 */
  configManager: ConfigManager;
  /** 日志记录器 */
  logger?: PluginLogger;
}

/**
 * 插件日志器
 */
export interface PluginLogger {
  info(message: string): void;
  warn(message: string): void;
  error(message: string): void;
  debug(message: string): void;
}

/**
 * 插件上下文
 */
export interface PluginContext {
  /** 连接管理器 */
  connectionManager: ConnectionManager;
  /** 配置管理器 */
  configManager: ConfigManager;
  /** 日志记录器 */
  logger?: PluginLogger;
  /** 注册命令 */
  registerCommand(command: CommandDefinition): void;
}

/**
 * 自动补全提供者
 */
export interface CompletionProvider {
  /** 触发前缀 */
  trigger: string;
  /** 补全提供者函数 */
  provider: CompletionProviderFn;
}

/**
 * 补全提供者函数
 */
export interface CompletionProviderFn {
  (context: CompletionContext): Promise<string[]> | string[];
}

/**
 * 补全上下文
 */
export interface CompletionContext {
  /** 当前输入 */
  input: string;
  /** 光标位置 */
  cursorPosition: number;
  /** 连接管理器 */
  connectionManager: ConnectionManager;
}

/**
 * 插件管理器接口
 */
export interface IPluginManager {
  /** 注册插件 */
  register(plugin: DBManagerPlugin): void;
  /** 卸载插件 */
  unregister(name: string): void;
  /** 列出所有插件 */
  list(): DBManagerPlugin[];
  /** 获取插件 */
  get(name: string): DBManagerPlugin | undefined;
  /** 加载所有插件 */
  loadAll(): Promise<void>;
  /** 卸载所有插件 */
  unloadAll(): Promise<void>;
}
