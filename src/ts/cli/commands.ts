/**
 * 命令处理器 - TypeScript 版本
 */

import { ConnectionManager } from '../database/connection.js';
import { ConfigManager } from '../config/manager.js';
import { TableFormatter } from '../utils/formatter.js';
import { ExportManager, ExportFormat } from '../utils/export.js';

type OutputStyle = 'output' | 'error' | 'success' | 'warning' | 'dim' | 'bold' | 'command';
type AddOutputFn = (text: string, style?: OutputStyle) => void;

export class CommandHandler {
  private configManager: ConfigManager;
  private connectionManager: ConnectionManager;
  private addOutput: AddOutputFn;
  private tableFormatter: TableFormatter;
  private exportManager: ExportManager;

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
   * /explain 命令 - 查看查询计划
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
      
      this.addOutput('查询计划:\n', 'bold');
      this.addOutput('='.repeat(80) + '\n', 'dim');
      
      // 格式化 EXPLAIN 输出
      const table = this.tableFormatter.formatTable(result.columns, result.rows);
      this.addOutput(table + '\n', 'output');
      
      this.addOutput('='.repeat(80) + '\n', 'dim');
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
}
