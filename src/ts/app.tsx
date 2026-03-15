/**
 * DBManager 主应用组件 - Ink + React + TypeScript 版本
 * 完整的交互式数据库管理 CLI 工具
 *
 * 增强版：集成命令面板、增强帮助、改进补全
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Box, Text, useInput, useApp } from 'ink';
import TextInput from 'ink-text-input';
import SelectInput from 'ink-select-input';
import Spinner from 'ink-spinner';
import chalk from 'chalk';
import { ConfigManager } from './config/manager.js';
import { ConnectionManager } from './database/connection.js';
import { WelcomeBanner } from './components/WelcomeBanner.js';
import { StatusBar } from './components/StatusBar.js';
import { OutputDisplay, OutputLine } from './components/OutputDisplay.js';
import { CommandHandler } from './cli/commands.js';
import { TableFormatter } from './utils/formatter.js';
import { TableSchema, QueryResult } from './types.js';
import { EnhancedHelp } from './components/EnhancedHelp.js';
import { CommandPalette } from './components/CommandPalette.js';
import { CompletionPopup, type CompletionItem } from './components/CompletionPopup.js';
import { highlightSqlSimple, getSqlType } from './utils/highlighter.js';
import { CommandRegistry } from './utils/commandRegistry.js';

const VERSION = '0.3.0';

interface Props {
  configManager: ConfigManager;
  connectionManager: ConnectionManager;
}

interface SelectOption {
  label: string;
  value: string;
}

export const App: React.FC<Props> = ({ configManager, connectionManager }) => {
  const { exit } = useApp();

  // 状态
  const [outputLines, setOutputLines] = useState<OutputLine[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [isFocused, setIsFocused] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [outputFormat, setOutputFormat] = useState<'table' | 'json' | 'csv' | 'markdown'>('table');
  const [showConfigSelect, setShowConfigSelect] = useState(false);
  const [configOptions, setConfigOptions] = useState<SelectOption[]>([]);
  const [tables, setTables] = useState<string[]>([]);

  // 新增状态 - 命令面板
  const [showCommandPalette, setShowCommandPalette] = useState(false);

  // 新增状态 - 增强的补全
  const [completionItems, setCompletionItems] = useState<CompletionItem[]>([]);
  const [completionIndex, setCompletionIndex] = useState(0);
  const [showCompletionPopup, setShowCompletionPopup] = useState(false);

  // 新增状态 - 帮助过滤
  const [helpFilter, setHelpFilter] = useState<string | undefined>(undefined);

  // 新增状态 - 模式指示
  const [appMode, setAppMode] = useState<'normal' | 'commandPalette' | 'completion' | 'select'>('normal');

  const commandHandlerRef = useRef<CommandHandler | null>(null);
  const tableFormatter = new TableFormatter();

  // 初始化命令处理器
  useEffect(() => {
    commandHandlerRef.current = new CommandHandler(
      configManager,
      connectionManager,
      addOutput
    );

    // 显示欢迎信息
    showWelcome();

    // 刷新表列表
    refreshTables();
  }, []);

  // 模式变化时更新 UI 状态
  useEffect(() => {
    setAppMode(showCommandPalette ? 'commandPalette' :
               showCompletionPopup ? 'completion' :
               showConfigSelect ? 'select' : 'normal');
  }, [showCommandPalette, showCompletionPopup, showConfigSelect]);

  // 添加输出行
  const addOutput = useCallback((text: string, style: string = 'output'): void => {
    setOutputLines(prev => [...prev, { style, text }]);
  }, []);

  // 添加命令到历史
  const addCommandToHistory = useCallback((text: string): void => {
    if (text && !text.startsWith('/history')) {
      setCommandHistory(prev => [...prev, text]);
      setHistoryIndex(-1);
    }
  }, []);

  // 欢迎信息
  const showWelcome = useCallback(() => {
    const welcome: OutputLine[] = [
      { style: 'command', text: '╔══════════════════════════════════════════════════════════╗\n' },
      { style: 'command', text: `║                   DBManager v${VERSION}                      ║\n` },
      { style: 'command', text: '║              交互式数据库管理命令行工具                    ║\n' },
      { style: 'command', text: '╚══════════════════════════════════════════════════════════╝\n\n' },
      { style: 'output', text: '提示：输入 /help 查看可用命令，输入 / 查看命令提示\n\n' },
    ];
    setOutputLines(welcome);
  }, []);

  // 刷新表列表
  const refreshTables = async () => {
    if (!connectionManager.isConnected) {
      setTables([]);
      return;
    }
    try {
      const tableList = await connectionManager.getTables();
      setTables(tableList);
    } catch (error) {
      setTables([]);
    }
  };

  // 处理输入（带语法高亮）
  const handleInput = useCallback((value: string) => {
    setInputValue(value);
    
    // 如果是 SQL 语句，可以实时高亮（未来优化）
    // 目前由 TextInput 组件处理基础高亮
  }, []);

  // 提交输入
  const handleSubmit = useCallback(() => {
    const text = inputValue.trim();
    if (!text) return;

    // 添加到历史
    addCommandToHistory(text);

    // 添加命令到输出
    addOutput(`sql> ${text}\n`, 'command');

    // 清空输入框
    setInputValue('');
    setShowCompletionPopup(false);
    setCompletionItems([]);

    // 处理命令
    handleCommand(text);
  }, [inputValue, addCommandToHistory, addOutput]);

  // 处理命令
  const handleCommand = useCallback((text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;

    if (trimmed.startsWith('/')) {
      // 退出命令
      if (trimmed === '/quit' || trimmed === '/exit' || trimmed === '/q') {
        addOutput('再见!\n', 'dim');
        exit();
        return;
      }

      // 清屏
      if (trimmed === '/clear') {
        setOutputLines([]);
        showWelcome();
        return;
      }

      // 连接命令
      if (trimmed === '/connect' || trimmed === '/co' || trimmed.startsWith('/connect ') || trimmed.startsWith('/co ')) {
        const args = trimmed.split(/\s+/).slice(1);
        if (args.length === 0) {
          // 显示配置列表供选择
          const configs = configManager.listConfigs();
          if (Object.keys(configs).length === 0) {
            addOutput('暂无配置，请使用 /config add 添加\n', 'warning');
            return;
          }
          const options = Object.keys(configs).map(name => ({
            label: name,
            value: name,
          }));
          setConfigOptions(options);
          setShowConfigSelect(true);
          setIsFocused(false);
          return;
        }
        handleConnect(args[0]);
        return;
      }

      // 断开连接
      if (trimmed === '/disconnect') {
        connectionManager.disconnect();
        addOutput('已断开连接\n', 'dim');
        setTables([]);
        return;
      }

      // 列出表
      if (trimmed === '/list' || trimmed === '/ls') {
        handleList();
        return;
      }

      // 查看表结构
      if (trimmed === '/desc' || trimmed.startsWith('/desc ')) {
        const args = trimmed.split(/\s+/).slice(1);
        if (args.length === 0) {
          addOutput('用法：/desc <表名>\n', 'error');
          return;
        }
        handleDesc(args[0]);
        return;
      }

      // 帮助 - 支持关键词搜索
      if (trimmed === '/help' || trimmed.startsWith('/help ')) {
        const filter = trimmed.split(/\s+/).slice(1).join(' ');
        setHelpFilter(filter || undefined);
        // 清空输出，显示增强帮助
        setOutputLines([]);
        addOutput('按 ESC 返回输入模式\n\n', 'dim');
        // 使用 EnhancedHelp 组件渲染
        renderEnhancedHelp(filter);
        return;
      }

      // 格式设置
      if (trimmed === '/format' || trimmed.startsWith('/format ')) {
        handleFormat(trimmed.split(/\s+/).slice(1));
        return;
      }

      // 历史命令
      if (trimmed === '/history' || trimmed.startsWith('/history ')) {
        handleHistory(trimmed.split(/\s+/).slice(1));
        return;
      }

      // 事务命令
      if (trimmed === '/begin') {
        handleBegin();
        return;
      }
      if (trimmed === '/commit') {
        handleCommit();
        return;
      }
      if (trimmed === '/rollback') {
        handleRollback();
        return;
      }

      // 其他命令交给 commandHandler
      commandHandlerRef.current?.handleCommand(trimmed);
    } else {
      // 执行 SQL
      executeSql(trimmed);
    }
  }, [addOutput, addCommandToHistory, exit, configManager, connectionManager]);

  // 连接处理
  const handleConnect = async (instanceName: string) => {
    setIsProcessing(true);
    try {
      await connectionManager.connect(instanceName);
      addOutput(`✓ 已连接到 ${instanceName}\n`, 'success');
      refreshTables();
    } catch (error) {
      addOutput(`连接失败：${error instanceof Error ? error.message : '未知错误'}\n`, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  // 列出表
  const handleList = async () => {
    if (!connectionManager.isConnected) {
      addOutput('错误：未连接数据库\n', 'error');
      return;
    }
    try {
      const tableList = await connectionManager.getTables();
      const dbName = connectionManager.connection?.database;
      const lines = [`Tables in ${dbName}:`];
      for (const table of tableList) {
        lines.push(`  ${table}`);
      }
      addOutput(lines.join('\n') + '\n', 'output');
      setTables(tableList);
    } catch (error) {
      addOutput(`错误：${error instanceof Error ? error.message : '未知错误'}\n`, 'error');
    }
  };

  // 查看表结构
  const handleDesc = async (tableName: string) => {
    if (!connectionManager.isConnected) {
      addOutput('错误：未连接数据库\n', 'error');
      return;
    }
    try {
      const schema = await connectionManager.getTableSchema(tableName);
      showTableSchema(schema);
    } catch (error) {
      addOutput(`错误：${error instanceof Error ? error.message : '未知错误'}\n`, 'error');
    }
  };

  // 显示表结构
  const showTableSchema = (schema: TableSchema) => {
    const lines: string[] = [`表结构：${schema.tableName}`, '='.repeat(80)];
    lines.push(`${'字段'.padEnd(25)} ${'类型'.padEnd(20)} ${'空'.padEnd(6)} ${'默认值'.padEnd(15)} ${'额外'.padEnd(10)}`);
    lines.push('-'.repeat(80));

    for (const col of schema.columns) {
      const nullable = col.nullable ? 'YES' : 'NO';
      const defaultVal = col.default ?? '-';
      const extra: string[] = [];
      if (col.primaryKey) extra.push('PK');
      if (col.autoIncrement) extra.push('AUTO');
      const extraStr = extra.length > 0 ? extra.join(',') : '-';
      lines.push(
        `${col.name.padEnd(25)} ${col.type.padEnd(20)} ${nullable.padEnd(6)} ${String(defaultVal).padEnd(15)} ${extraStr.padEnd(10)}`
      );
    }

    lines.push('-'.repeat(80));

    if (schema.primaryKeys.length > 0) {
      lines.push(`主键：${schema.primaryKeys.join(', ')}`);
    }

    if (schema.indexes.length > 0) {
      lines.push('索引:');
      for (const idx of schema.indexes) {
        const unique = idx.unique && !idx.primary ? 'UNIQUE ' : '';
        const cols = idx.columns.join(', ');
        lines.push(`  - ${unique}${idx.name} (${cols})`);
      }
    }

    lines.push('='.repeat(80));
    addOutput(lines.join('\n') + '\n', 'output');
  };

  // 执行 SQL
  const executeSql = async (sql: string) => {
    if (!connectionManager.isConnected) {
      addOutput('错误：未连接数据库。请先使用 /connect 连接。\n', 'error');
      return;
    }

    setIsProcessing(true);
    try {
      const result = await connectionManager.execute(sql);
      formatResult(result);
    } catch (error) {
      addOutput(`错误：${error instanceof Error ? error.message : '未知错误'}\n`, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  // 格式化结果
  const formatResult = (result: QueryResult) => {
    switch (outputFormat) {
      case 'json':
        formatResultJson(result);
        break;
      case 'csv':
        formatResultCsv(result);
        break;
      case 'markdown':
        formatResultMarkdown(result);
        break;
      default:
        formatResultTable(result);
    }
  };

  const formatResultTable = (result: QueryResult) => {
    if (!result.rows || result.rows.length === 0) {
      addOutput(`✓ 执行成功 - 影响 ${result.affectedRows} 行\n`, 'success');
      return;
    }

    const lines: string[] = [];
    const colWidths = result.columns.map((col, i) => {
      const maxWidth = result.rows!.reduce((max, row) => {
        const cell = row[i] ?? '';
        return Math.max(max, String(cell).length);
      }, col.length);
      return Math.min(maxWidth, 100);
    });

    const topBorder = '┌─' + colWidths.map(w => '─'.repeat(w)).join('─┬─') + '─┐';
    const header = '│ ' + result.columns.map((col, i) => col.padEnd(colWidths[i])).join(' │ ') + ' │';
    const separator = '├─' + colWidths.map(w => '─'.repeat(w)).join('─┼─') + '─┤';
    const bottomBorder = '└─' + colWidths.map(w => '─'.repeat(w)).join('─┴─') + '─┘';

    lines.push(topBorder);
    lines.push(header);
    lines.push(separator);

    const maxRows = configManager.settings.maxDisplayRows;
    const displayed = Math.min(result.rows.length, maxRows);

    for (let i = 0; i < displayed; i++) {
      const row = result.rows[i];
      const rowStr = '│ ' + row.map((cell, i) => {
        const str = cell === null || cell === undefined ? 'NULL' : String(cell);
        return str.padEnd(colWidths[i]);
      }).join(' │ ') + ' │';
      lines.push(rowStr);
    }

    lines.push(bottomBorder);

    let stats = `${displayed} rows in ${result.executionTimeMs.toFixed(2)}ms`;
    if (result.rows.length > maxRows) {
      stats += ` (共 ${result.rows.length} 行，仅显示前 ${maxRows} 行)`;
    }
    lines.push(stats);

    addOutput(lines.join('\n') + '\n', 'output');
  };

  const formatResultJson = (result: QueryResult) => {
    if (!result.rows || result.rows.length === 0) {
      addOutput(`✓ 执行成功 - 影响 ${result.affectedRows} 行\n`, 'success');
      return;
    }

    if (!result.columns) {
      addOutput('[]\n', 'output');
      return;
    }

    const data = result.rows.map(row => {
      const obj: Record<string, unknown> = {};
      result.columns.forEach((col, i) => {
        obj[col] = row[i];
      });
      return obj;
    });

    addOutput(JSON.stringify(data, null, 2) + '\n', 'output');
  };

  const formatResultCsv = (result: QueryResult) => {
    if (!result.rows || result.rows.length === 0) {
      addOutput(`✓ 执行成功 - 影响 ${result.affectedRows} 行\n`, 'success');
      return;
    }

    const escapeCsv = (value: unknown): string => {
      const str = String(value ?? '');
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const lines: string[] = [];
    lines.push(result.columns.map(escapeCsv).join(','));
    for (const row of result.rows) {
      lines.push(row.map(v => escapeCsv(v === null ? '' : v)).join(','));
    }

    addOutput(lines.join('\n') + '\n', 'output');
  };

  const formatResultMarkdown = (result: QueryResult) => {
    if (!result.rows || result.rows.length === 0) {
      addOutput(`✓ 执行成功 - 影响 ${result.affectedRows} 行\n`, 'success');
      return;
    }

    if (!result.columns) {
      return;
    }

    const lines: string[] = [];
    lines.push('| ' + result.columns.join(' | ') + ' |');
    lines.push('| ' + result.columns.map(() => '---').join(' | ') + ' |');

    for (const row of result.rows) {
      lines.push('| ' + row.map(v => String(v === null ? '' : v)).join(' | ') + ' |');
    }

    addOutput(lines.join('\n') + '\n', 'output');
  };

  // 处理格式设置
  const handleFormat = (args: string[]) => {
    if (args.length === 0) {
      addOutput(`当前输出格式：${outputFormat}\n`, 'dim');
      addOutput('用法：/format <格式>\n支持的格式：table, json, csv, markdown\n', 'dim');
      return;
    }

    const fmt = args[0].toLowerCase() as typeof outputFormat;
    if (!['table', 'json', 'csv', 'markdown'].includes(fmt)) {
      addOutput(`错误：不支持的格式 '${fmt}'\n`, 'error');
      return;
    }

    setOutputFormat(fmt);
    addOutput(`✓ 输出格式已设置为：${fmt}\n`, 'success');
  };

  // 处理历史命令
  const handleHistory = (args: string[]) => {
    const maxItems = args[0] && /^\d+$/.test(args[0]) ? parseInt(args[0]) : 20;
    const recent = commandHistory.slice(-maxItems);

    if (recent.length === 0) {
      addOutput('暂无历史记录\n', 'dim');
      return;
    }

    const lines = [`最近 ${recent.length} 条命令:`];
    lines.push('-'.repeat(40));
    recent.forEach((cmd, i) => {
      lines.push(`  ${i + 1}.  ${cmd}`);
    });
    lines.push('-'.repeat(40));
    lines.push(`共 ${commandHistory.length} 条历史记录`);
    lines.push('提示：使用 ↑/↓ 键快速导航历史命令');

    addOutput(lines.join('\n') + '\n', 'output');
  };

  // 处理事务
  const handleBegin = async () => {
    if (!connectionManager.isConnected) {
      addOutput('错误：未连接数据库\n', 'error');
      return;
    }
    if (connectionManager.inTransactionState) {
      addOutput('警告：当前已有活动的事务\n', 'warning');
      return;
    }
    try {
      await connectionManager.beginTransaction();
      addOutput('✓ 事务已开始\n', 'success');
    } catch (error) {
      addOutput(`错误：${error instanceof Error ? error.message : '未知错误'}\n`, 'error');
    }
  };

  const handleCommit = async () => {
    if (!connectionManager.isConnected) {
      addOutput('错误：未连接数据库\n', 'error');
      return;
    }
    if (!connectionManager.inTransactionState) {
      addOutput('错误：当前没有活动的事务\n', 'error');
      return;
    }
    try {
      await connectionManager.commitTransaction();
      addOutput('✓ 事务已提交\n', 'success');
    } catch (error) {
      addOutput(`错误：${error instanceof Error ? error.message : '未知错误'}\n`, 'error');
    }
  };

  const handleRollback = async () => {
    if (!connectionManager.isConnected) {
      addOutput('错误：未连接数据库\n', 'error');
      return;
    }
    if (!connectionManager.inTransactionState) {
      addOutput('错误：当前没有活动的事务\n', 'error');
      return;
    }
    try {
      await connectionManager.rollbackTransaction();
      addOutput('✓ 事务已回滚\n', 'success');
    } catch (error) {
      addOutput(`错误：${error instanceof Error ? error.message : '未知错误'}\n`, 'error');
    }
  };

  // 显示增强帮助 - 简化版，由 EnhancedHelp 组件负责渲染
  const renderEnhancedHelp = (filter?: string) => {
    // 帮助组件会自动渲染，这里只需添加提示
    if (filter) {
      addOutput(`搜索：${filter}\n\n`, 'dim');
    }
  };

  // 配置选择处理
  const handleConfigSelect = useCallback((option: SelectOption) => {
    handleConnect(option.value);
    setShowConfigSelect(false);
    setIsFocused(true);
  }, []);

  // 键盘快捷键
  useInput((input, key) => {
    // 处理帮助模式 - ESC 退出
    if (helpFilter !== undefined) {
      if (key.escape) {
        setHelpFilter(undefined);
        setOutputLines([]);
        showWelcome();
        return;
      }
      // 帮助模式下不处理其他输入
      return;
    }

    // 处理命令面板模式
    if (showCommandPalette) {
      // 命令面板内部处理键盘事件
      return;
    }

    // 处理配置选择模式
    if (showConfigSelect) {
      if (key.escape) {
        setShowConfigSelect(false);
        setIsFocused(true);
        return;
      }
      // 其他按键全部交给 SelectInput 处理
      return;
    }

    // Ctrl+C 取消
    if (key.ctrl && input === 'c') {
      setInputValue('');
      return;
    }

    // Ctrl+D 退出
    if (key.ctrl && input === 'd') {
      if (!inputValue) {
        addOutput('再见!\n', 'dim');
        exit();
      } else {
        setInputValue('');
      }
      return;
    }

    // Ctrl+L 清屏
    if (key.ctrl && input === 'l') {
      setOutputLines([]);
      showWelcome();
      return;
    }

    // Ctrl+P 打开命令面板
    if (key.ctrl && input === 'p') {
      setShowCommandPalette(true);
      setIsFocused(false);
      return;
    }

    // 上箭头 - 上一条历史命令
    if (key.upArrow) {
      if (commandHistory.length > 0 && historyIndex < commandHistory.length - 1) {
        const newIndex = historyIndex + 1;
        setHistoryIndex(newIndex);
        setInputValue(commandHistory[commandHistory.length - 1 - newIndex]);
      }
      return;
    }

    // 下箭头 - 下一条历史命令
    if (key.downArrow) {
      if (commandHistory.length > 0 && historyIndex >= 0) {
        const newIndex = historyIndex - 1;
        setHistoryIndex(newIndex);
        if (newIndex < 0) {
          setInputValue('');
        } else {
          setInputValue(commandHistory[commandHistory.length - 1 - newIndex]);
        }
      }
      return;
    }

    // Tab 补全 - 增强版（popup 未显示时触发）
    if (key.tab && !showCompletionPopup) {
      handleCompletionEnhanced();
      return;
    }

    // Escape 取消补全
    if (key.escape) {
      setShowCompletionPopup(false);
      setCompletionItems([]);
      return;
    }

    // 补全popup 导航
    if (showCompletionPopup && completionItems.length > 0) {
      if (key.upArrow) {
        setCompletionIndex((prev) => (prev > 0 ? prev - 1 : prev));
        return;
      }
      if (key.downArrow) {
        setCompletionIndex((prev) => (prev < completionItems.length - 1 ? prev + 1 : prev));
        return;
      }
      if (key.return) {
        applyCompletion(completionItems[completionIndex]);
        return;
      }
      // Tab 键在 popup 显示时也用于选择
      if (key.tab) {
        applyCompletion(completionItems[completionIndex]);
        return;
      }
    }
  });

  // 处理自动补全 - 增强版
  const handleCompletionEnhanced = () => {
    const words = inputValue.split(/\s+/);
    const lastWord = words[words.length - 1].toLowerCase();

    // SQL 关键字补全
    const sqlKeywords = [
      'select', 'from', 'where', 'and', 'or', 'not', 'in', 'is', 'null',
      'like', 'between', 'exists', 'case', 'when', 'then', 'else', 'end',
      'join', 'inner', 'left', 'right', 'outer', 'on', 'as', 'group', 'by',
      'having', 'order', 'asc', 'desc', 'limit', 'offset', 'union', 'all',
      'insert', 'into', 'values', 'update', 'set', 'delete', 'create', 'drop',
      'alter', 'table', 'index', 'view', 'trigger', 'database', 'schema',
      'primary', 'key', 'foreign', 'references', 'unique', 'check', 'default',
      'constraint', 'add', 'modify', 'change', 'rename', 'column', 'if',
    ];

    // 命令补全（从注册表获取）
    const commands = CommandRegistry.getAllCommands().map(cmd => cmd.name);

    // 表名补全
    const tableNames = tables.map(t => t.toLowerCase());

    let candidates: CompletionItem[] = [];

    if (inputValue.startsWith('/')) {
      // 命令补全
      const matchingCommands = CommandRegistry.getAllCommands().filter(cmd =>
        `/${cmd.name}`.startsWith(lastWord) ||
        cmd.aliases.some(a => `/${a}`.startsWith(lastWord))
      );
      candidates = matchingCommands.map(cmd => ({
        label: `/${cmd.name}`,
        type: 'command' as const,
        description: cmd.description,
      }));

      // 子命令补全
      if (lastWord.startsWith('/config')) {
        const subCommands = ['add', 'list', 'remove', 'test', 'edit'];
        const parts = inputValue.split(/\s+/);
        if (parts.length === 2) {
          const matchingSub = subCommands.filter(s => s.startsWith(parts[1] || ''));
          candidates = matchingSub.map(s => ({
            label: s,
            type: 'command' as const,
            description: `配置子命令：${s}`,
          }));
        }
      }
    } else if (words.length === 1) {
      // 第一个单词可能是 SQL 关键字或命令
      const matchingKeywords = sqlKeywords.filter(k => k.startsWith(lastWord));
      const matchingCommands = CommandRegistry.getAllCommands().filter(cmd =>
        `/${cmd.name}`.startsWith(lastWord)
      );

      candidates = [
        ...matchingKeywords.map(k => ({ label: k, type: 'keyword' as const, description: 'SQL 关键字' })),
        ...matchingCommands.map(cmd => ({
          label: `/${cmd.name}`,
          type: 'command' as const,
          description: cmd.description,
        })),
      ];
    } else {
      // 表名补全
      const matchingTables = tableNames.filter(t => t.startsWith(lastWord));
      candidates = matchingTables.map(t => ({
        label: t,
        type: 'table' as const,
        description: '数据表',
      }));
    }

    if (candidates.length > 0) {
      setCompletionItems(candidates);
      setCompletionIndex(0);
      setShowCompletionPopup(true);
    }
  };

  // 处理补全选择
  const applyCompletion = (item: CompletionItem) => {
    const words = inputValue.split(/\s+/);
    words[words.length - 1] = item.label;
    setInputValue(words.join(' '));
    setShowCompletionPopup(false);
    setCompletionItems([]);
  };

  // 获取提示符
  const prompt = connectionManager.isConnected ? (
    <Text color="green">sql&gt; </Text>
  ) : (
    <Text color="cyan">sql&gt; </Text>
  );

  return (
    <Box flexDirection="column" minWidth={80}>
      <WelcomeBanner version={VERSION} />

      {/* 输出区域 */}
      <Box flexDirection="column" flexGrow={1} marginBottom={1}>
        {/* 命令面板 - 悬浮显示 */}
        {showCommandPalette && (
          <Box marginBottom={1}>
            <CommandPalette
              isOpen={showCommandPalette}
              onClose={() => {
                setShowCommandPalette(false);
                setIsFocused(true);
              }}
              onExecute={(cmd) => {
                setInputValue(cmd + ' ');
                setShowCommandPalette(false);
                setIsFocused(true);
              }}
            />
          </Box>
        )}

        {/* 帮助模式显示 */}
        {helpFilter !== undefined && (
          <Box marginBottom={1}>
            <EnhancedHelp filter={helpFilter} />
          </Box>
        )}

        <OutputDisplay lines={outputLines} />
        {isProcessing && (
          <Box flexDirection="row">
            <Spinner type="dots" />
            <Text color="gray"> 执行中...</Text>
          </Box>
        )}
      </Box>

      {/* 配置选择器 */}
      {showConfigSelect && (
        <Box flexDirection="column" marginBottom={1}>
          <Text color="cyan">选择要连接的实例 (ESC 取消):</Text>
          <SelectInput
            items={configOptions}
            onSelect={handleConfigSelect}
            isFocused={true}
          />
        </Box>
      )}

      {/* 增强的补全弹窗 */}
      {showCompletionPopup && completionItems.length > 0 && (
        <Box flexDirection="column">
          <CompletionPopup
            items={completionItems}
            selectedIndex={completionIndex}
            maxVisible={8}
          />
        </Box>
      )}

      {/* 分隔线 */}
      <Box>
        <Text color="gray">────────────────────────────────────────────────────────</Text>
      </Box>

      {/* 输入行 */}
      <Box marginTop={1}>
        {prompt}
        <TextInput
          value={inputValue}
          onChange={handleInput}
          onSubmit={handleSubmit}
          focus={isFocused}
        />
      </Box>

      {/* 状态栏 */}
      <Box marginTop={1}>
        <StatusBar
          connected={connectionManager.isConnected}
          inTransaction={connectionManager.inTransactionState}
          dbType={connectionManager.connection?.dbType}
          host={connectionManager.connection?.host}
          port={connectionManager.connection?.port}
          database={connectionManager.connection?.database}
          outputFormat={outputFormat}
          mode={appMode}
        />
      </Box>
    </Box>
  );
};
