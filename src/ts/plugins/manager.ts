/**
 * 插件管理器
 */

import { DBManagerPlugin, PluginContext, PluginRegistry, CommandDefinition } from './types.js';

export class PluginManager {
  private plugins: Map<string, DBManagerPlugin> = new Map();
  private registry: PluginRegistry = {
    plugins: [],
    commands: new Map(),
    completions: new Map(),
  };
  private context: PluginContext;
  private loaded = false;

  constructor(context: Partial<PluginContext> = {}) {
    this.context = {
      version: context.version || '0.3.0',
      configPath: context.configPath || '',
      dataPath: context.dataPath || '',
    };
  }

  /**
   * 注册插件
   */
  register(plugin: DBManagerPlugin): void {
    if (this.plugins.has(plugin.name)) {
      throw new Error(`插件已存在：${plugin.name}`);
    }

    this.plugins.set(plugin.name, plugin);
    this.registry.plugins.push(plugin);

    // 注册命令
    if (plugin.commands) {
      for (const cmd of plugin.commands) {
        this.registry.commands.set(cmd.name, cmd);
        if (cmd.aliases) {
          for (const alias of cmd.aliases) {
            this.registry.commands.set(alias, cmd);
          }
        }
      }
    }

    // 注册补全提供者
    if (plugin.completions) {
      for (const comp of plugin.completions) {
        this.registry.completions.set(comp.trigger, comp);
      }
    }

    console.log(`✓ 插件已注册：${plugin.name} v${plugin.version}`);
  }

  /**
   * 注销插件
   */
  async unregister(pluginName: string): Promise<void> {
    const plugin = this.plugins.get(pluginName);
    if (!plugin) {
      throw new Error(`插件不存在：${pluginName}`);
    }

    // 调用卸载钩子
    if (plugin.onUnload) {
      await plugin.onUnload();
    }

    // 从注册表中移除
    this.plugins.delete(pluginName);
    this.registry.plugins = this.registry.plugins.filter(p => p.name !== pluginName);

    // 移除命令
    if (plugin.commands) {
      for (const cmd of plugin.commands) {
        this.registry.commands.delete(cmd.name);
        if (cmd.aliases) {
          for (const alias of cmd.aliases) {
            this.registry.commands.delete(alias);
          }
        }
      }
    }

    // 移除补全提供者
    if (plugin.completions) {
      for (const comp of plugin.completions) {
        this.registry.completions.delete(comp.trigger);
      }
    }

    console.log(`✓ 插件已注销：${pluginName}`);
  }

  /**
   * 加载所有插件
   */
  async loadPlugins(pluginPaths: string[]): Promise<void> {
    console.log('🔌 正在加载插件...');

    for (const path of pluginPaths) {
      try {
        const module = await import(path);
        const plugin: DBManagerPlugin = module.default || module.plugin;
        
        if (plugin) {
          // 调用加载钩子
          if (plugin.onLoad) {
            await plugin.onLoad(this.context);
          }
          
          this.register(plugin);
        }
      } catch (error) {
        console.error(`✗ 加载插件失败：${path}`, error);
      }
    }

    this.loaded = true;
    console.log(`✓ 已加载 ${this.plugins.size} 个插件`);
  }

  /**
   * 获取插件
   */
  getPlugin(name: string): DBManagerPlugin | undefined {
    return this.plugins.get(name);
  }

  /**
   * 列出所有插件
   */
  listPlugins(): DBManagerPlugin[] {
    return Array.from(this.plugins.values());
  }

  /**
   * 获取命令
   */
  getCommand(name: string): CommandDefinition | undefined {
    return this.registry.commands.get(name);
  }

  /**
   * 执行插件命令
   */
  async executeCommand(name: string, args: string[]): Promise<void> {
    const command = this.getCommand(name);
    if (!command) {
      throw new Error(`未知命令：${name}`);
    }

    await command.handler(args);
  }

  /**
   * 获取补全
   */
  async getCompletions(trigger: string, input: string) {
    const provider = this.registry.completions.get(trigger);
    if (!provider) {
      return [];
    }

    return await provider.provider(input);
  }

  /**
   * 获取插件统计
   */
  getStats(): {
    total: number;
    commands: number;
    completions: number;
  } {
    return {
      total: this.plugins.size,
      commands: this.registry.commands.size,
      completions: this.registry.completions.size,
    };
  }

  /**
   * 检查插件是否已加载
   */
  isLoaded(): boolean {
    return this.loaded;
  }

  /**
   * 卸载所有插件
   */
  async unloadAll(): Promise<void> {
    const pluginNames = Array.from(this.plugins.keys());
    
    for (const name of pluginNames) {
      await this.unregister(name);
    }
    
    this.loaded = false;
  }
}
