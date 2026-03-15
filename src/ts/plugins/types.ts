/**
 * 插件系统类型定义
 */

import { CompletionItem } from '../cli/completer.js';

/**
 * 插件上下文
 */
export interface PluginContext {
  version: string;
  configPath: string;
  dataPath: string;
}

/**
 * 命令定义
 */
export interface CommandDefinition {
  name: string;
  description: string;
  usage: string;
  handler: (args: string[]) => Promise<void> | void;
  aliases?: string[];
}

/**
 * 补全提供者
 */
export interface CompletionProvider {
  trigger: string;
  provider: (input: string) => Promise<CompletionItem[]> | CompletionItem[];
}

/**
 * 插件接口
 */
export interface DBManagerPlugin {
  /**
   * 插件名称
   */
  name: string;

  /**
   * 插件版本
   */
  version: string;

  /**
   * 插件描述
   */
  description?: string;

  /**
   * 作者
   */
  author?: string;

  /**
   * 插件加载时的生命周期钩子
   */
  onLoad?(context: PluginContext): void | Promise<void>;

  /**
   * 插件卸载时的生命周期钩子
   */
  onUnload?(): void | Promise<void>;

  /**
   * 注册的命令
   */
  commands?: CommandDefinition[];

  /**
   * 注册的补全提供者
   */
  completions?: CompletionProvider[];

  /**
   * 插件配置项
   */
  config?: Record<string, unknown>;
}

/**
 * 插件注册表
 */
export interface PluginRegistry {
  plugins: DBManagerPlugin[];
  commands: Map<string, CommandDefinition>;
  completions: Map<string, CompletionProvider>;
}
