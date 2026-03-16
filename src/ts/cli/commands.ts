/**
 * 命令处理器 - TypeScript 版本
 */

import { ConnectionManager } from '../database/connection.js';
import { ConfigManager } from '../config/manager.js';
import { TableFormatter } from '../utils/formatter.js';
import { ExportManager, ExportFormat } from '../utils/export.js';
import { SqlDiagnoser } from '../utils/sqlDiagnoser.js';
import { renderExplainReport } from '../utils/explain.js';
import { BookmarkManager } from '../utils/bookmarks.js';
import { QueryOptimizer } from '../utils/queryOptimizer.js';
import { NL2SQLConverter } from '../utils/nl2sql.js';

type OutputStyle = 'output' | 'error' | 'success' | 'warning' | 'dim' | 'bold' | 'command';
type AddOutputFn = (text: string, style?: OutputStyle) => void;

export class CommandHandler {
  private configManager: ConfigManager;
  private connectionManager: ConnectionManager;
  private addOutput: AddOutputFn;
  private tableFormatter: TableFormatter;
  private exportManager: ExportManager;
  private bookmarkManager: BookmarkManager;
  private queryOptimizer: QueryOptimizer;
  private nl2sqlConverter: NL2SQLConverter;

  constructor(
    configManager: ConfigManager,
    connectionManager: ConnectionManager,
    addOutput: AddOutputFn
  ) {
    this.configManager = configManager;
    this.connectionManager = connectionManager;
    this.addOutput = addOutput;
    this.tableFormatter = new TableFormatter();
    this.exportManager = new ExportManager();
    this.bookmarkManager = new BookmarkManager();
    this.queryOptimizer = new QueryOptimizer();
    this.nl2sqlConverter = new NL2SQLConverter();
  }

  /**
   * 处理命令
   */
  handleCommand(text: string): void {
    const parts = text.trim().split(/\s+/);
    if (parts.length === 0) return;

    const cmd = parts[0].substring(1).toLowerCase(); // 去掉 / 前缀
    const args = parts.slice(1);

    const handlers: Record<string, () => void> = {
      config: () => this.handleConfig(args),
      connect: () => this.handleConnect(args),
      co: () => this.handleConnect(args),
      disconnect: () => this.handleDisconnect(),
      list: () => this.handleList(),
      ls: () => this.handleList(),
      desc: () => this.handleDesc(args),
      describe: () => this.handleDesc(args),
      history: () => this.handleHistory(args),
      h: () => this.handleHistory(args),
      format: () => this.handleFormat(args),
      help: () => this.handleHelp(),
      quit: () => {}, // 由 app.tsx 处理
      exit: () => {},
      q: () => {},
      run: () => this.handleRun(args),
      batch: () => this.handleBatch(args),
      begin: () => this.handleBegin(),
      commit: () => this.handleCommit(),
      rollback: () => this.handleRollback(),
      explain: () => this.handleExplain(args),
      export: () => this.handleExport(args),
      use: () => this.handleUse(args),
      diagnose: () => this.handleDiagnose(args),
      bookmark: () => this.handleBookmark(args),
      bm: () => this.handleBookmark(args),
      optimize: () => this.handleOptimize(args),
      opt: () => this.handleOptimize(args),
      nl2sql: () => this.handleNL2SQL(args),
      nl: () => this.handleNL2SQL(args),
    };

    const handler = handlers[cmd];
    if (handler) {
      handler();
    } else {
      this.addOutput(`未知命令：/${cmd}\n输入 /help 查看帮助\n`, 'error');
    }
  }

  /**
   * /config 命令
   */
  private handleConfig(args: string[]): void {
    if (args.length === 0) {
      this.showConfigHelp();
      return;
    }

    const subcmd = args[0].toLowerCase();
    const subArgs = args.slice(1);

    switch (subcmd) {
      case 'add':
        this.configAdd(subArgs);
        break;
      case 'list':
        this.configList();
        break;
      case 'remove':
        this.configRemove(subArgs);
        break;
      case 'test':
        this.configTest(subArgs);
        break;
      default:
        this.showConfigHelp();
    }
  }

  private showConfigHelp(): void {
    this.addOutput(
      '配置管理命令:\n' +
      '  /config add      - 添加数据库配置\n' +
      '  /config list     - 列出所有配置\n' +
      '  /config remove   - 删除配置\n' +
      '  /config test     - 测试连接\n',
      'output'
    );
  }

  private async configAdd(args: string[]): Promise<void> {
    // 格式：/config add <name> <type> <host> <port> <user> <password> <database>
    if (args.length >= 5) {
      const name = args[0];
      const dbType = args[1].toLowerCase();
      const host = args[2];
      const port = parseInt(args[3]);
      const username = args[4];
      const password = args[5] || '';
      const database = args[6] || '';

      const configs = this.configManager.listConfigs();
      if (configs[name]) {
        this.addOutput(`错误：实例 '${name}' 已存在\n`, 'error');
        return;
      }

      await this.configManager.addConfig(name, dbType, host, port, username, password, database);
      this.addOutput(`✓ 配置已保存：${name}\n`, 'success');
      return;
    }

    this.addOutput('添加数据库配置\n', 'bold');
    this.addOutput('-'.repeat(40) + '\n', 'dim');
    this.addOutput('用法：/config add <名称> <类型> <主机> [端口] <用户> <密码> [数据库]\n', 'output');
  }

  private configList(): void {
    const configs = this.configManager.listConfigs();
    if (Object.keys(configs).length === 0) {
      this.addOutput('暂无配置，请使用 /config add 添加\n', 'warning' as OutputStyle);
      return;
    }

    const current = this.connectionManager.currentInstanceName;
    const lines: string[] = ['配置列表:', '-'.repeat(60)];

    lines.push(
      `${'名称'.padEnd(20)} ${'类型'.padEnd(12)} ${'主机'.padEnd(15)} ${'端口'.padEnd(6)} ${'数据库'.padEnd(10)} ${'状态'.padEnd(6)}`
    );
    lines.push('-'.repeat(60));

    for (const [name, cfg] of Object.entries(configs)) {
      const status = name === current ? '●' : '○';
      lines.push(
        `${name.padEnd(20)} ${String(cfg.type).padEnd(12)} ${String(cfg.host).padEnd(15)} ` +
        `${String(cfg.port).padEnd(6)} ${String(cfg.database).padEnd(10)} ${status.padEnd(6)}`
      );
    }

    lines.push('-'.repeat(60));
    lines.push('图例：● 当前连接  ○ 未连接');

    this.addOutput(lines.join('\n') + '\n', 'output');
  }

  private async configRemove(args: string[]): Promise<void> {
    if (args.length === 0) {
      this.addOutput('用法：/config remove <实例名>\n', 'error');
      return;
    }

    const name = args[0];
    const configs = this.configManager.listConfigs();

    if (!configs[name]) {
      this.addOutput(`错误：配置 '${name}' 不存在\n`, 'error');
      return;
    }

    if (this.connectionManager.currentInstanceName === name) {
      this.addOutput('错误：不能删除当前连接的配置\n', 'error');
      return;
    }

    await this.configManager.removeConfig(name);
    this.addOutput(`✓ 配置已删除：${name}\n`, 'success');
  }

  private async configTest(args: string[]): Promise<void> {
    if (args.length === 0) {
      this.addOutput('用法：/config test <实例名>\n', 'error');
      return;
    }

    const name = args[0];
    const result = await this.connectionManager.testConnection(name);

    if (result.success) {
      this.addOutput(`✓ 连接成功：${name}\n`, 'success');
      this.addOutput(`  类型：${result.dbType}\n`, 'dim');
      this.addOutput(`  版本：${result.version}\n`, 'dim');
      this.addOutput(`  延迟：${result.latencyMs.toFixed(2)}ms\n`, 'dim');
    } else {
      this.addOutput(`✗ 连接失败：${name}\n`, 'error');
      this.addOutput(`  错误：${result.message}\n`, 'dim');
    }
  }

  /**
   * /connect 命令
   */
  async handleConnect(args: string[]): Promise<void> {
    if (args.length === 0) {
      this.listInstances();
      return;
    }

    const instanceName = args[0];
    try {
      await this.connectionManager.connect(instanceName);
      this.addOutput(`✓ 已连接到 ${instanceName}\n`, 'success');
    } catch (error) {
      this.addOutput(`连接失败：${error instanceof Error ? error.message : '未知错误'}\n`, 'error');
    }
  }

  private listInstances(): void {
    const configs = this.configManager.listConfigs();
    if (Object.keys(configs).length === 0) {
      this.addOutput('暂无配置，请使用 /config add 添加\n', 'warning' as OutputStyle);
      return;
    }

    const current = this.connectionManager.currentInstanceName;
    const lines = ['可连接的实例:'];

    for (const name of Object.keys(configs)) {
      const marker = name === current ? '→' : ' ';
      lines.push(`  ${marker} ${name}`);
    }

    this.addOutput(lines.join('\n') + '\n', 'output');
  }

  /**
   * /disconnect 命令
   */
  handleDisconnect(): void {
    this.connectionManager.disconnect();
    this.addOutput('已断开连接\n', 'dim');
  }

  /**
   * /list 命令 - 列出所有表
   */
  async handleList(): Promise<void> {
    if (!this.connectionManager.isConnected) {
      this.addOutput('错误：未连接数据库\n', 'error');
      return;
    }

    try {
      const tables = await this.connectionManager.getTables();
      const dbName = this.connectionManager.connection?.database;
      const lines = [`Tables in ${dbName}:`];

      for (const table of tables) {
        lines.push(`  ${table}`);
      }

      this.addOutput(lines.join('\n') + '\n', 'output');
    } catch (error) {
      this.addOutput(`错误：${error instanceof Error ? error.message : '未知错误'}\n`, 'error');
    }
  }

  /**
   * /desc 命令 - 查看表结构
   */
  async handleDesc(args: string[]): Promise<void> {
    if (args.length === 0) {
      this.addOutput('用法：/desc <表名>\n', 'error');
      return;
    }

    if (!this.connectionManager.isConnected) {
      this.addOutput('错误：未连接数据库\n', 'error');
      return;
    }

    const tableName = args[0];
    try {
      const schema = await this.connectionManager.getTableSchema(tableName);
      this.showTableSchema(schema);
    } catch (error) {
      this.addOutput(`错误：${error instanceof Error ? error.message : '未知错误'}\n`, 'error');
    }
  }

  private showTableSchema(schema: {
    tableName: string;
    columns: { name: string; type: string; nullable: boolean; default?: string; primaryKey: boolean; autoIncrement: boolean }[];
    primaryKeys: string[];
    indexes: { name: string; columns: string[]; unique: boolean; primary: boolean }[];
  }): void {
    const lines: string[] = [`表结构：${schema.tableName}`, '='.repeat(80)];

    // 表头
    lines.push(`${'字段'.padEnd(25)} ${'类型'.padEnd(20)} ${'空'.padEnd(6)} ${'默认值'.padEnd(15)} ${'额外'.padEnd(10)}`);
    lines.push('-'.repeat(80));

    // 列信息
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

    // 主键信息
    if (schema.primaryKeys.length > 0) {
      lines.push(`主键：${schema.primaryKeys.join(', ')}`);
    }

    // 索引信息
    if (schema.indexes.length > 0) {
      lines.push('索引:');
      for (const idx of schema.indexes) {
        const unique = idx.unique && !idx.primary ? 'UNIQUE ' : '';
        const cols = idx.columns.join(', ');
        lines.push(`  - ${unique}${idx.name} (${cols})`);
      }
    }

    lines.push('='.repeat(80));
    this.addOutput(lines.join('\n') + '\n', 'output');
  }

  /**
   * /history 命令
   */
  handleHistory(args: string[]): void {
    const maxItems = args[0] && /^\d+$/.test(args[0]) ? parseInt(args[0]) : 20;
    this.addOutput(`最近 ${maxItems} 条命令:\n`, 'output');
    this.addOutput('-'.repeat(40) + '\n', 'dim');
    this.addOutput('提示：使用 ↑/↓ 键快速导航历史命令\n', 'dim');
  }

  /**
   * /format 命令
   */
  handleFormat(args: string[]): void {
    if (args.length === 0) {
      const current = this.configManager.settings.outputFormat;
      this.addOutput(`当前输出格式：${current}\n`, 'dim');
      this.addOutput('用法：/format <格式>\n支持的格式：table, json, csv, markdown\n', 'dim');
      return;
    }

    const fmt = args[0].toLowerCase() as 'table' | 'json' | 'csv' | 'markdown';
    if (!['table', 'json', 'csv', 'markdown'].includes(fmt)) {
      this.addOutput(`错误：不支持的格式 '${fmt}'\n`, 'error');
      return;
    }

    this.configManager.updateSettings({ outputFormat: fmt });
    this.addOutput(`✓ 输出格式已设置为：${fmt}\n`, 'success');
  }

  /**
   * /help 命令
   */
  handleHelp(): void {
    const helpText = `
DBManager - 交互式数据库管理命令行工具

连接管理:
  /config            配置管理
  /connect <name>    连接数据库 (别名：/co, /check-out)
  /disconnect        断开当前连接
  /list, /ls         列出所有表

SQL 执行:
  直接输入 SQL 语句执行，以分号结束
  /desc <table>      查看表结构
  /run <file>        执行 SQL 文件
  /batch file <file> 批量执行 SQL 文件（事务中）
  /explain <SQL>     查看查询计划

事务管理:
  /begin             开始事务
  /commit            提交事务
  /rollback          回滚事务

其他:
  /history           查看历史
  /format <type>     设置格式 (table/json/csv/markdown)
  /help              此帮助
  /quit              退出 (快捷键：Ctrl+D, /q)
`;
    this.addOutput(helpText, 'output');
  }

  /**
   * /run 命令 - 执行 SQL 文件
   */
  async handleRun(args: string[]): Promise<void> {
    if (args.length === 0) {
      this.addOutput('用法：/run <文件路径>\n', 'error');
      return;
    }

    if (!this.connectionManager.isConnected) {
      this.addOutput('错误：未连接数据库\n', 'error');
      return;
    }

    const filePath = args[0];
    
    try {
      const fs = await import('fs/promises');
      const sql = await fs.readFile(filePath, 'utf-8');
      
      const startTime = Date.now();
      const result = await this.connectionManager.execute(sql);
      const endTime = Date.now();
      
      this.addOutput(`✓ 执行完成：${filePath}\n`, 'success');
      this.addOutput(`  耗时：${(endTime - startTime).toFixed(2)}ms\n`, 'dim');
      
      if (result.rows.length > 0) {
        const table = this.tableFormatter.formatTable(result.columns, result.rows);
        this.addOutput(table + '\n', 'output');
      }
      
      if (result.affectedRows !== undefined) {
        this.addOutput(`  影响行数：${result.affectedRows}\n`, 'dim');
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        this.addOutput(`错误：文件不存在：${filePath}\n`, 'error');
      } else {
        this.addOutput(`错误：${error instanceof Error ? error.message : '未知错误'}\n`, 'error');
      }
    }
  }

  /**
   * /batch 命令 - 批量执行 SQL
   */
  async handleBatch(args: string[]): Promise<void> {
    if (args.length === 0) {
      this.addOutput('用法：/batch <file|run> [参数]\n', 'error');
      this.addOutput('  /batch file <文件路径>  - 从事务文件批量执行\n', 'dim');
      this.addOutput('  /batch run <SQL 语句>   - 批量执行 SQL 语句\n', 'dim');
      return;
    }

    if (!this.connectionManager.isConnected) {
      this.addOutput('错误：未连接数据库\n', 'error');
      return;
    }

    const subcmd = args[0].toLowerCase();

    if (subcmd === 'file') {
      const filePath = args[1];
      if (!filePath) {
        this.addOutput('用法：/batch file <文件路径>\n', 'error');
        return;
      }

      try {
        const fs = await import('fs/promises');
        const sql = await fs.readFile(filePath, 'utf-8');
        
        const startTime = Date.now();
        
        // 检查是否在事务中，不在则开启事务
        const wasInTransaction = this.connectionManager.inTransactionState;
        if (!wasInTransaction) {
          await this.connectionManager.beginTransaction();
          this.addOutput('✓ 事务已开始（批量执行）\n', 'dim');
        }

        const result = await this.connectionManager.execute(sql);
        const endTime = Date.now();
        
        this.addOutput(`✓ 批量执行完成：${filePath}\n`, 'success');
        this.addOutput(`  耗时：${(endTime - startTime).toFixed(2)}ms\n`, 'dim');
        
        if (!wasInTransaction) {
          this.addOutput('提示：使用 /commit 提交事务，或 /rollback 回滚\n', 'warning' as OutputStyle);
        }
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
          this.addOutput(`错误：文件不存在：${args[1]}\n`, 'error');
        } else {
          this.addOutput(`错误：${error instanceof Error ? error.message : '未知错误'}\n`, 'error');
          this.addOutput('提示：事务可能已回滚，请检查数据状态\n', 'warning' as OutputStyle);
        }
      }
    } else if (subcmd === 'run') {
      const sql = args.slice(1).join(' ');
      if (!sql) {
        this.addOutput('用法：/batch run <SQL 语句>\n', 'error');
        return;
      }

      try {
        const startTime = Date.now();
        const result = await this.connectionManager.execute(sql);
        const endTime = Date.now();
        
        this.addOutput(`✓ 执行完成\n`, 'success');
        this.addOutput(`  耗时：${(endTime - startTime).toFixed(2)}ms\n`, 'dim');
        
        if (result.rows.length > 0) {
          const table = this.tableFormatter.formatTable(result.columns, result.rows);
          this.addOutput(table + '\n', 'output');
        }
      } catch (error) {
        this.addOutput(`错误：${error instanceof Error ? error.message : '未知错误'}\n`, 'error');
      }
    } else {
      this.addOutput(`错误：未知的子命令 '${subcmd}'\n`, 'error');
      this.addOutput('用法：/batch <file|run> [参数]\n', 'dim');
    }
  }

  /**
   * /begin 命令
   */
  async handleBegin(): Promise<void> {
    if (!this.connectionManager.isConnected) {
      this.addOutput('错误：未连接数据库\n', 'error');
      return;
    }

    if (this.connectionManager.inTransactionState) {
      this.addOutput('警告：当前已有活动的事务\n', 'warning' as OutputStyle);
      return;
    }

    try {
      await this.connectionManager.beginTransaction();
      this.addOutput('✓ 事务已开始\n', 'success');
    } catch (error) {
      this.addOutput(`错误：${error instanceof Error ? error.message : '未知错误'}\n`, 'error');
    }
  }

  /**
   * /commit 命令
   */
  async handleCommit(): Promise<void> {
    if (!this.connectionManager.isConnected) {
      this.addOutput('错误：未连接数据库\n', 'error');
      return;
    }

    if (!this.connectionManager.inTransactionState) {
      this.addOutput('错误：当前没有活动的事务\n', 'error');
      return;
    }

    try {
      await this.connectionManager.commitTransaction();
      this.addOutput('✓ 事务已提交\n', 'success');
    } catch (error) {
      this.addOutput(`错误：${error instanceof Error ? error.message : '未知错误'}\n`, 'error');
    }
  }

  /**
   * /rollback 命令
   */
  async handleRollback(): Promise<void> {
    if (!this.connectionManager.isConnected) {
      this.addOutput('错误：未连接数据库\n', 'error');
      return;
    }

    if (!this.connectionManager.inTransactionState) {
      this.addOutput('错误：当前没有活动的事务\n', 'error');
      return;
    }

    try {
      await this.connectionManager.rollbackTransaction();
      this.addOutput('✓ 事务已回滚\n', 'success');
    } catch (error) {
      this.addOutput(`错误：${error instanceof Error ? error.message : '未知错误'}\n`, 'error');
    }
  }

  /**
   * /explain 命令 - 查看查询计划（v0.5.0 增强版）
   */
  async handleExplain(args: string[]): Promise<void> {
    if (args.length === 0) {
      this.addOutput('用法：/explain <SQL 语句>\n', 'error');
      return;
    }

    if (!this.connectionManager.isConnected) {
      this.addOutput('错误：未连接数据库\n', 'error');
      return;
    }

    const sql = args.join(' ');
    
    try {
      const result = await this.connectionManager.getExplainPlan(sql);
      
      // 转换行为 ExplainRow[] 类型
      const explainRows = result.rows.map(row => {
        const explainRow: Record<string, unknown> = {};
        result.columns.forEach((col, index) => {
          explainRow[col] = row[index];
        });
        return explainRow;
      });
      
      // 使用增强的报告格式
      const report = renderExplainReport(explainRows);
      this.addOutput(report, 'output');
    } catch (error) {
      this.addOutput(`错误：${error instanceof Error ? error.message : '未知错误'}\n`, 'error');
    }
  }

  /**
   * /export 命令 - 导出查询结果
   */
  async handleExport(args: string[]): Promise<void> {
    if (args.length === 0) {
      this.addOutput('用法：/export <格式> [文件路径]\n', 'error');
      this.addOutput('支持的格式：csv, json, markdown, table, sql\n', 'dim');
      this.addOutput('示例：/export csv output.csv\n', 'dim');
      return;
    }

    if (!this.connectionManager.isConnected) {
      this.addOutput('错误：未连接数据库\n', 'error');
      return;
    }

    const format = args[0].toLowerCase() as ExportFormat;
    const outputPath = args[1];

    const supportedFormats: ExportFormat[] = ['csv', 'json', 'markdown', 'table', 'sql'];
    
    if (!supportedFormats.includes(format)) {
      this.addOutput(`错误：不支持的格式 '${format}'\n`, 'error');
      this.addOutput(`支持的格式：${supportedFormats.join(', ')}\n`, 'dim');
      return;
    }

    // 演示导出功能（实际应该导出最后一条查询结果）
    // 这里创建一个示例数据集
    const demoColumns = ['id', 'name', 'email', 'created_at'];
    const demoRows = [
      [1, 'Alice', 'alice@example.com', '2024-01-01'],
      [2, 'Bob', 'bob@example.com', '2024-01-02'],
      [3, 'Charlie', 'charlie@example.com', '2024-01-03'],
    ];

    try {
      const result = await this.exportManager.export({
        format,
        outputPath,
        columns: demoColumns,
        rows: demoRows,
      });

      if (outputPath) {
        this.addOutput(`${result}\n`, 'success');
      } else {
        this.addOutput(result + '\n', 'output');
      }
    } catch (error) {
      this.addOutput(`导出失败：${error instanceof Error ? error.message : '未知错误'}\n`, 'error');
    }
  }

  /**
   * /use 命令 - 切换数据库
   */
  async handleUse(args: string[]): Promise<void> {
    if (args.length === 0) {
      this.addOutput('用法：/use <数据库名>\n', 'error');
      return;
    }

    if (!this.connectionManager.isConnected) {
      this.addOutput('错误：未连接数据库\n', 'error');
      return;
    }

    const dbName = args[0];
    
    try {
      await this.connectionManager.useDatabase(dbName);
      this.addOutput(`✓ 已切换到数据库：${dbName}\n`, 'success');
    } catch (error) {
      this.addOutput(`错误：${error instanceof Error ? error.message : '未知错误'}\n`, 'error');
    }
  }

  /**
   * /diagnose 命令 - 诊断 SQL 错误
   * v0.5.0 新功能 - 智能查询助手
   */
  handleDiagnose(args: string[]): void {
    if (args.length === 0) {
      this.addOutput(`
╔══════════════════════════════════════════════════════════╗
║  🔍 SQL 错误诊断工具 - v0.5.0                            ║
╚══════════════════════════════════════════════════════════╝

用法：
  /diagnose <错误消息>     诊断指定的错误消息
  /diagnose <错误代码>     根据错误代码诊断（如：1064, 42P01）

示例：
  /diagnose "table 'users' doesn't exist"
  /diagnose 1064
  /diagnose "syntax error near SELECT"

提示：
  - SQL 执行出错时会自动显示诊断结果
  - 支持 MySQL、PostgreSQL、SQLite 错误代码
  - 置信度评分帮助判断最可能的原因

`, 'output');
      return;
    }

    // 合并所有参数作为错误消息
    const errorMessage = args.join(' ');

    // 检查是否是纯数字（错误代码）
    if (/^\d+$/.test(errorMessage)) {
      // 错误代码诊断
      const diagnostic = SqlDiagnoser.diagnose({ code: errorMessage, name: `Error ${errorMessage}` });
      this.addOutput(SqlDiagnoser.formatResult(diagnostic), 'error');
    } else {
      // 错误消息诊断
      const diagnostic = SqlDiagnoser.diagnose(new Error(errorMessage));
      this.addOutput(SqlDiagnoser.formatResult(diagnostic), 'error');
    }
  }

  /**
   * /bookmark 命令 - 查询书签管理
   * v0.5.0 新功能 - CLI 体验增强
   */
  handleBookmark(args: string[]): void {
    if (args.length === 0) {
      this.showBookmarkHelp();
      return;
    }

    const subcmd = args[0].toLowerCase();
    const subArgs = args.slice(1);

    switch (subcmd) {
      case 'add':
        this.bookmarkAdd(subArgs);
        break;
      case 'list':
      case 'ls':
        this.bookmarkList(subArgs);
        break;
      case 'show':
      case 'get':
        this.bookmarkShow(subArgs);
        break;
      case 'run':
        this.bookmarkRun(subArgs);
        break;
      case 'remove':
      case 'rm':
        this.bookmarkRemove(subArgs);
        break;
      case 'search':
        this.bookmarkSearch(subArgs);
        break;
      case 'tags':
        this.bookmarkTags();
        break;
      case 'export':
        this.bookmarkExport();
        break;
      case 'import':
        this.bookmarkImport(subArgs);
        break;
      case 'stats':
        this.bookmarkStats();
        break;
      default:
        this.addOutput(`未知书签命令：${subcmd}\n`, 'error');
        this.showBookmarkHelp();
    }
  }

  /**
   * 显示书签帮助
   */
  private showBookmarkHelp(): void {
    this.addOutput(`
╔══════════════════════════════════════════════════════════╗
║  🔖 查询书签管理 - v0.5.0                                ║
╚══════════════════════════════════════════════════════════╝

用法：
  /bookmark add <名称> <SQL> [标签...]    添加书签
  /bookmark list [标签]                  列出书签
  /bookmark show <名称>                  查看书签详情
  /bookmark run <名称>                   运行书签查询
  /bookmark remove <名称>                删除书签
  /bookmark search <关键词>              搜索书签
  /bookmark tags                         查看所有标签
  /bookmark export                       导出书签
  /bookmark import <文件>                导入书签
  /bookmark stats                        查看统计

快捷命令：
  /bm add <名称> <SQL> [标签...]
  /bm ls [标签]
  /bm run <名称>

示例：
  /bookmark add "用户列表" "SELECT * FROM users" mysql users
  /bookmark list mysql
  /bookmark run "用户列表"
  /bookmark search user
  /bookmark tags

`, 'output');
  }

  /**
   * 添加书签
   */
  private bookmarkAdd(args: string[]): void {
    if (args.length < 2) {
      this.addOutput('用法：/bookmark add <名称> <SQL> [标签...]\n', 'error');
      return;
    }

    const name = args[0];
    const sql = args[1];
    const tags = args.slice(2);

    try {
      const bookmark = this.bookmarkManager.add(name, sql, tags);
      this.addOutput(`✓ 书签已添加：${bookmark.name}\n`, 'success');
      this.addOutput(`  ID: ${bookmark.id}\n`, 'dim');
      if (tags.length > 0) {
        this.addOutput(`  标签：${tags.join(', ')}\n`, 'dim');
      }
    } catch (error) {
      this.addOutput(`❌ ${error instanceof Error ? error.message : error}\n`, 'error');
    }
  }

  /**
   * 列出书签
   */
  private bookmarkList(args: string[]): void {
    const tag = args[0];
    const bookmarks = this.bookmarkManager.list(tag);

    if (bookmarks.length === 0) {
      this.addOutput(tag ? `标签 "${tag}" 下没有书签\n` : '暂无书签\n', 'warning');
      return;
    }

    const lines: string[] = [];
    lines.push('');
    lines.push(`📚 书签列表${tag ? ` (标签：${tag})` : ''}:`);
    lines.push('─'.repeat(60));

    bookmarks.forEach((b, index) => {
      const builtin = b.id.startsWith('builtin_') ? '📦' : '🔖';
      const tags = b.tags.length > 0 ? ` [${b.tags.join(', ')}]` : '';
      lines.push(`${index + 1}. ${builtin} ${b.name}${tags}`);
      const sqlPreview = b.sql.length > 50 ? b.sql.substring(0, 50) + '...' : b.sql;
      lines.push(`   ${sqlPreview}`);
      if (b.usageCount > 0) {
        lines.push(`   使用次数：${b.usageCount}`);
      }
    });

    lines.push('');
    lines.push(`共 ${bookmarks.length} 个书签`);
    lines.push('');

    this.addOutput(lines.join('\n'), 'output');
  }

  /**
   * 显示书签详情
   */
  private bookmarkShow(args: string[]): void {
    if (args.length === 0) {
      this.addOutput('用法：/bookmark show <名称>\n', 'error');
      return;
    }

    const bookmark = this.bookmarkManager.get(args[0]);
    if (!bookmark) {
      this.addOutput(`❌ 书签 "${args[0]}" 不存在\n`, 'error');
      return;
    }

    const lines: string[] = [];
    lines.push('');
    lines.push(`🔖 书签：${bookmark.name}`);
    lines.push('─'.repeat(60));
    lines.push(`ID: ${bookmark.id}`);
    lines.push(`SQL: ${bookmark.sql}`);
    if (bookmark.description) {
      lines.push(`说明：${bookmark.description}`);
    }
    if (bookmark.tags.length > 0) {
      lines.push(`标签：${bookmark.tags.join(', ')}`);
    }
    lines.push(`创建：${bookmark.createdAt}`);
    lines.push(`更新：${bookmark.updatedAt}`);
    lines.push(`使用次数：${bookmark.usageCount}`);
    if (bookmark.lastUsedAt) {
      lines.push(`最后使用：${bookmark.lastUsedAt}`);
    }
    lines.push('');

    this.addOutput(lines.join('\n'), 'output');
  }

  /**
   * 运行书签查询
   */
  private async bookmarkRun(args: string[]): Promise<void> {
    if (args.length === 0) {
      this.addOutput('用法：/bookmark run <名称>\n', 'error');
      return;
    }

    const bookmark = this.bookmarkManager.get(args[0]);
    if (!bookmark) {
      this.addOutput(`❌ 书签 "${args[0]}" 不存在\n`, 'error');
      return;
    }

    if (!this.connectionManager.isConnected) {
      this.addOutput('错误：未连接数据库\n', 'error');
      return;
    }

    // 增加使用次数
    this.bookmarkManager.incrementUsage(bookmark.id);

    this.addOutput(`▶ 运行书签：${bookmark.name}\n`, 'command');
    this.addOutput(`SQL: ${bookmark.sql}\n`, 'dim');
    this.addOutput('─'.repeat(60) + '\n', 'dim');

    try {
      const result = await this.connectionManager.execute(bookmark.sql);
      // 由 app.tsx 处理结果格式化
      this.addOutput('✓ 查询执行完成\n', 'success');
    } catch (error) {
      this.addOutput(`❌ ${error instanceof Error ? error.message : error}\n`, 'error');
    }
  }

  /**
   * 删除书签
   */
  private bookmarkRemove(args: string[]): void {
    if (args.length === 0) {
      this.addOutput('用法：/bookmark remove <名称>\n', 'error');
      return;
    }

    try {
      const removed = this.bookmarkManager.remove(args[0]);
      if (removed) {
        this.addOutput(`✓ 书签 "${args[0]}" 已删除\n`, 'success');
      } else {
        this.addOutput(`❌ 书签 "${args[0]}" 不存在\n`, 'error');
      }
    } catch (error) {
      this.addOutput(`❌ ${error instanceof Error ? error.message : error}\n`, 'error');
    }
  }

  /**
   * 搜索书签
   */
  private bookmarkSearch(args: string[]): void {
    if (args.length === 0) {
      this.addOutput('用法：/bookmark search <关键词>\n', 'error');
      return;
    }

    const query = args.join(' ');
    const results = this.bookmarkManager.search(query);

    if (results.length === 0) {
      this.addOutput(`未找到匹配 "${query}" 的书签\n`, 'warning');
      return;
    }

    const lines: string[] = [];
    lines.push('');
    lines.push(`🔍 搜索结果："${query}"`);
    lines.push('─'.repeat(60));

    results.forEach((b, index) => {
      lines.push(`${index + 1}. ${b.name} [${b.tags.join(', ')}]`);
      const sqlPreview = b.sql.length > 50 ? b.sql.substring(0, 50) + '...' : b.sql;
      lines.push(`   ${sqlPreview}`);
    });

    lines.push('');
    lines.push(`共 ${results.length} 个结果`);
    lines.push('');

    this.addOutput(lines.join('\n'), 'output');
  }

  /**
   * 查看所有标签
   */
  private bookmarkTags(): void {
    const tags = this.bookmarkManager.getTags();

    if (tags.length === 0) {
      this.addOutput('暂无标签\n', 'warning');
      return;
    }

    this.addOutput(`📑 标签列表 (${tags.length} 个):\n`, 'output');
    this.addOutput(`  ${tags.join(', ')}\n`, 'dim');
  }

  /**
   * 导出书签
   */
  private bookmarkExport(): void {
    const json = this.bookmarkManager.export();
    this.addOutput('📤 书签导出:\n', 'output');
    this.addOutput(json + '\n', 'dim');
    this.addOutput('\n💡 提示：将以上内容保存到文件，使用 /bookmark import 导入\n', 'dim');
  }

  /**
   * 导入书签
   */
  private bookmarkImport(args: string[]): void {
    if (args.length === 0) {
      this.addOutput('用法：/bookmark import <文件路径>\n', 'error');
      return;
    }

    const filePath = args[0];
    
    try {
      const fs = require('fs');
      const json = fs.readFileSync(filePath, 'utf-8');
      const count = this.bookmarkManager.import(json);
      this.addOutput(`✓ 成功导入 ${count} 个书签\n`, 'success');
    } catch (error) {
      this.addOutput(`❌ ${error instanceof Error ? error.message : error}\n`, 'error');
    }
  }

  /**
   * 显示书签统计
   */
  private bookmarkStats(): void {
    const stats = this.bookmarkManager.getStats();
    
    const lines: string[] = [];
    lines.push('');
    lines.push('📊 书签统计');
    lines.push('─'.repeat(40));
    lines.push(`总数：${stats.total}`);
    lines.push(`用户书签：${stats.user}`);
    lines.push(`内置书签：${stats.builtin}`);
    lines.push(`标签数：${stats.tags}`);
    lines.push('');

    this.addOutput(lines.join('\n'), 'output');
  }

  /**
   * /optimize 命令 - SQL 查询优化建议
   * v0.5.0 新功能 - 智能查询助手
   */
  handleOptimize(args: string[]): void {
    if (args.length === 0) {
      this.showOptimizeHelp();
      return;
    }

    const sql = args.join(' ');
    const analysis = this.queryOptimizer.analyze(sql);
    const report = this.queryOptimizer.generateReport(analysis);
    
    this.addOutput(report, 'output');
  }

  /**
   * 显示优化帮助
   */
  private showOptimizeHelp(): void {
    this.addOutput(`
╔══════════════════════════════════════════════════════════╗
║  ⚡ SQL 查询优化建议 - v0.5.0                             ║
╚══════════════════════════════════════════════════════════╝

用法：
  /optimize <SQL 语句>     分析查询并提供优化建议
  /opt <SQL 语句>          快捷命令

示例：
  /optimize SELECT * FROM users
  /optimize SELECT * FROM orders WHERE user_id IN (SELECT id FROM users)
  /opt UPDATE users SET status = 1

检测项：
  - SELECT * 使用
  - 缺少 WHERE/LIMIT 条件
  - LIKE 前缀通配符
  - 子查询优化
  - JOIN 条件
  - ORDER BY + LIMIT
  - OR 条件优化
  - 函数包裹列
  - NOT IN 优化

`, 'output');
  }

  /**
   * /nl2sql 命令 - 自然语言生成 SQL
   * v0.5.0 新功能 - 智能查询助手
   */
  handleNL2SQL(args: string[]): void {
    if (args.length === 0) {
      this.showNL2SQLHelp();
      return;
    }

    const naturalLanguage = args.join(' ');
    const result = this.nl2sqlConverter.convert(naturalLanguage);

    const lines: string[] = [];
    lines.push('');
    lines.push('╔══════════════════════════════════════════════════════════╗');
    lines.push('║  🗣️ 自然语言生成 SQL - v0.5.0                            ║');
    lines.push('╚══════════════════════════════════════════════════════════╝');
    lines.push('');

    lines.push(`📝 输入：${naturalLanguage}`);
    lines.push('');

    if (result.success && result.sql) {
      lines.push('┌─────────────────────────────────────────────────────────');
      lines.push('│ 生成的 SQL');
      lines.push('├─────────────────────────────────────────────────────────');
      lines.push(`│ ${result.sql}`);
      lines.push('└─────────────────────────────────────────────────────────');
      lines.push('');

      lines.push(`📊 置信度：${Math.round(result.confidence * 100)}%`);
      lines.push(`💡 说明：${result.explanation}`);

      if (result.warnings.length > 0) {
        lines.push('');
        lines.push('⚠️ 注意：');
        result.warnings.forEach(w => {
          lines.push(`   - ${w}`);
        });
      }

      lines.push('');
      lines.push('💡 提示：确认 SQL 正确后，可直接执行或使用 /bookmark 保存');
    } else {
      lines.push(`❌ ${result.explanation}`);
    }

    lines.push('');

    this.addOutput(lines.join('\n'), 'output');
  }

  /**
   * 显示 NL2SQL 帮助
   */
  private showNL2SQLHelp(): void {
    this.addOutput(`
╔══════════════════════════════════════════════════════════╗
║  🗣️ 自然语言生成 SQL - v0.5.0                            ║
╚══════════════════════════════════════════════════════════╝

用法：
  /nl2sql <自然语言描述>   将自然语言转换为 SQL
  /nl <自然语言描述>       快捷命令

示例：
  /nl 查询所有用户
  /nl 查找年龄大于 25 的用户
  /nl 统计订单数量
  /nl 显示前 10 个订单，按创建时间降序排序
  /nl 删除 id 等于 1 的用户

支持的操作：
  - 查询：查询、查找、搜索、显示、列出、查看
  - 统计：统计、计数、多少个
  - 条件：等于、大于、小于、包含
  - 排序：升序、降序、按...排序
  - 限制：前 N 条、限制 N 条

注意：
  - 当前版本为规则引擎，支持简单到中等复杂度查询
  - v0.6.0 将集成 LLM，支持更复杂的自然语言查询

`, 'output');
  }
}
