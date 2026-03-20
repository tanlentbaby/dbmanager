/**
 * 主题和快捷键管理器
 * v0.8.0 Phase 5 - 主题和快捷键
 * 
 * 功能:
 * - 主题系统
 * - 快捷键自定义
 * - 命令别名
 * - 配置持久化
 */

import * as fs from 'fs';
import * as path from 'path';

export interface Theme {
  name: string;
  colors: {
    primary: string;
    secondary: string;
    success: string;
    error: string;
    warning: string;
    info: string;
    background: string;
    foreground: string;
    muted: string;
  };
  isDark: boolean;
}

export interface KeyBinding {
  key: string;
  action: string;
  description: string;
}

export interface CommandAlias {
  alias: string;
  command: string;
  description: string;
}

export interface UserConfig {
  theme: string;
  keyBindings: KeyBinding[];
  commandAliases: CommandAlias[];
}

export class ThemeManager {
  private themes: Map<string, Theme>;
  private currentTheme: string;
  private configPath: string;

  constructor() {
    this.themes = new Map();
    this.currentTheme = 'dark';
    this.configPath = path.join(process.env.HOME || '~', '.dbmanager', 'theme.json');
    this.initializeThemes();
  }

  /**
   * 初始化内置主题
   */
  private initializeThemes(): void {
    // 深色主题
    this.themes.set('dark', {
      name: 'Dark',
      isDark: true,
      colors: {
        primary: '#58a6ff',
        secondary: '#8b949e',
        success: '#3fb950',
        error: '#f85149',
        warning: '#d29922',
        info: '#58a6ff',
        background: '#0d1117',
        foreground: '#c9d1d9',
        muted: '#8b949e',
      },
    });

    // 浅色主题
    this.themes.set('light', {
      name: 'Light',
      isDark: false,
      colors: {
        primary: '#0969da',
        secondary: '#6e7781',
        success: '#1a7f37',
        error: '#cf222e',
        warning: '#9a6700',
        info: '#0969da',
        background: '#ffffff',
        foreground: '#24292f',
        muted: '#6e7781',
      },
    });

    // GitHub 主题
    this.themes.set('github', {
      name: 'GitHub',
      isDark: false,
      colors: {
        primary: '#0366d6',
        secondary: '#586069',
        success: '#28a745',
        error: '#d73a49',
        warning: '#f9c513',
        info: '#0366d6',
        background: '#ffffff',
        foreground: '#24292e',
        muted: '#6a737d',
      },
    });

    // 加载用户主题
    this.loadCustomThemes();
  }

  /**
   * 加载自定义主题
   */
  private loadCustomThemes(): void {
    try {
      if (fs.existsSync(this.configPath)) {
        const data = fs.readFileSync(this.configPath, 'utf-8');
        const config = JSON.parse(data);
        
        if (config.customThemes) {
          for (const theme of config.customThemes) {
            this.themes.set(theme.id, theme);
          }
        }
      }
    } catch (error) {
      console.error('加载自定义主题失败:', error);
    }
  }

  /**
   * 设置当前主题
   */
  setTheme(themeName: string): boolean {
    if (!this.themes.has(themeName)) {
      return false;
    }

    this.currentTheme = themeName;
    this.savePreference();
    return true;
  }

  /**
   * 获取当前主题
   */
  getCurrentTheme(): Theme | undefined {
    return this.themes.get(this.currentTheme);
  }

  /**
   * 获取所有主题
   */
  getThemes(): Theme[] {
    return Array.from(this.themes.values());
  }

  /**
   * 获取颜色
   */
  getColor(colorName: keyof Theme['colors']): string {
    const theme = this.themes.get(this.currentTheme);
    if (!theme) {
      return '#000000';
    }
    return theme.colors[colorName];
  }

  /**
   * 添加自定义主题
   */
  addCustomTheme(theme: Theme & { id: string }): void {
    this.themes.set(theme.id, theme);
    this.saveCustomTheme(theme);
  }

  /**
   * 保存自定义主题
   */
  private saveCustomTheme(theme: Theme & { id: string }): void {
    try {
      let config: any = { customThemes: [] };
      
      if (fs.existsSync(this.configPath)) {
        config = JSON.parse(fs.readFileSync(this.configPath, 'utf-8'));
      }

      const existingIndex = config.customThemes.findIndex((t: any) => t.id === theme.id);
      if (existingIndex >= 0) {
        config.customThemes[existingIndex] = theme;
      } else {
        config.customThemes.push(theme);
      }

      fs.writeFileSync(this.configPath, JSON.stringify(config, null, 2), 'utf-8');
    } catch (error) {
      console.error('保存自定义主题失败:', error);
    }
  }

  /**
   * 保存偏好设置
   */
  private savePreference(): void {
    try {
      const dir = path.dirname(this.configPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      fs.writeFileSync(this.configPath, JSON.stringify({
        currentTheme: this.currentTheme,
      }, null, 2), 'utf-8');
    } catch (error) {
      console.error('保存主题偏好失败:', error);
    }
  }

  /**
   * 格式化输出主题列表
   */
  formatThemeList(): string {
    const themes = this.getThemes();
    const lines: string[] = [];

    lines.push('🎨 可用主题:\n');

    for (const theme of themes) {
      const isCurrent = theme.name.toLowerCase() === this.currentTheme ? ' ✅' : '';
      const mode = theme.isDark ? '🌙' : '☀️';
      lines.push(`  ${mode} ${theme.name}${isCurrent}`);
    }

    lines.push('\n用法：/theme set <主题名>');

    return lines.join('\n');
  }
}

export class KeyBindingManager {
  private bindings: Map<string, KeyBinding>;
  private defaultBindings: KeyBinding[];

  constructor() {
    this.bindings = new Map();
    this.defaultBindings = [
      { key: 'Ctrl+C', action: 'cancel', description: '取消当前操作' },
      { key: 'Ctrl+D', action: 'exit', description: '退出程序' },
      { key: 'Ctrl+L', action: 'clear', description: '清屏' },
      { key: 'Ctrl+R', action: 'refresh', description: '刷新' },
      { key: 'Tab', action: 'autocomplete', description: '自动补全' },
      { key: 'Up', action: 'history_prev', description: '上一条历史' },
      { key: 'Down', action: 'history_next', description: '下一条历史' },
      { key: 'Enter', action: 'execute', description: '执行命令' },
    ];

    // 加载默认绑定
    this.defaultBindings.forEach(b => this.bindings.set(b.key, b));
  }

  /**
   * 添加快捷键绑定
   */
  addBinding(key: string, action: string, description: string): void {
    this.bindings.set(key, { key, action, description });
  }

  /**
   * 移除快捷键绑定
   */
  removeBinding(key: string): void {
    this.bindings.delete(key);
  }

  /**
   * 获取快捷键
   */
  getBinding(key: string): KeyBinding | undefined {
    return this.bindings.get(key);
  }

  /**
   * 获取所有快捷键
   */
  getBindings(): KeyBinding[] {
    return Array.from(this.bindings.values());
  }

  /**
   * 格式化输出快捷键列表
   */
  formatBindings(): string {
    const bindings = this.getBindings();
    const lines: string[] = [];

    lines.push('⌨️  快捷键:\n');

    for (const binding of bindings) {
      lines.push(`  ${binding.key.padEnd(12)} - ${binding.description}`);
    }

    return lines.join('\n');
  }
}

export class CommandAliasManager {
  private aliases: Map<string, CommandAlias>;

  constructor() {
    this.aliases = new Map();
    this.initializeDefaultAliases();
  }

  /**
   * 初始化默认别名
   */
  private initializeDefaultAliases(): void {
    this.aliases.set('co', { alias: 'co', command: 'connect', description: '连接数据库' });
    this.aliases.set('ls', { alias: 'ls', command: 'list', description: '列出表' });
    this.aliases.set('desc', { alias: 'desc', command: 'describe', description: '描述表' });
    this.aliases.set('h', { alias: 'h', command: 'history', description: '历史记录' });
    this.aliases.set('q', { alias: 'q', command: 'quit', description: '退出' });
    this.aliases.set('bm', { alias: 'bm', command: 'bookmark', description: '书签管理' });
    this.aliases.set('opt', { alias: 'opt', command: 'optimize', description: '优化查询' });
    this.aliases.set('nl', { alias: 'nl', command: 'nl2sql', description: '自然语言转 SQL' });
  }

  /**
   * 添加别名
   */
  addAlias(alias: string, command: string, description?: string): void {
    this.aliases.set(alias, {
      alias,
      command,
      description: description || `别名：${command}`,
    });
  }

  /**
   * 移除别名
   */
  removeAlias(alias: string): void {
    // 不允许移除默认别名
    if (this.aliases.get(alias)?.command) {
      const defaultAliases = ['co', 'ls', 'desc', 'h', 'q', 'bm', 'opt', 'nl'];
      if (!defaultAliases.includes(alias)) {
        this.aliases.delete(alias);
      }
    }
  }

  /**
   * 解析别名
   */
  resolve(input: string): string {
    const parts = input.trim().split(/\s+/);
    const alias = this.aliases.get(parts[0]);
    
    if (alias) {
      return [alias.command, ...parts.slice(1)].join(' ');
    }

    return input;
  }

  /**
   * 获取所有别名
   */
  getAliases(): CommandAlias[] {
    return Array.from(this.aliases.values());
  }

  /**
   * 格式化输出别名列表
   */
  formatAliases(): string {
    const aliases = this.getAliases();
    const lines: string[] = [];

    lines.push('🔤 命令别名:\n');

    for (const alias of aliases) {
      lines.push(`  ${alias.alias.padEnd(8)} → ${alias.command}  ${alias.description ? `- ${alias.description}` : ''}`);
    }

    return lines.join('\n');
  }
}

export default { ThemeManager, KeyBindingManager, CommandAliasManager };
