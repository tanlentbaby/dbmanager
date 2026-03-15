/**
 * Web UI 服务器框架
 * 提供 HTTP API 和 Web 界面
 */

import http from 'http';
import { ConfigManager } from '../config/manager.js';
import { ConnectionManager } from '../database/connection.js';

export interface WebServerOptions {
  port?: number;
  host?: string;
  enableCors?: boolean;
}

export interface ApiResponse {
  success: boolean;
  data?: unknown;
  error?: string;
}

export class WebServer {
  private server?: http.Server;
  private configManager: ConfigManager;
  private connectionManager: ConnectionManager;
  private port: number;
  private host: string;
  private enableCors: boolean;

  constructor(
    configManager: ConfigManager,
    connectionManager: ConnectionManager,
    options: WebServerOptions = {}
  ) {
    this.configManager = configManager;
    this.connectionManager = connectionManager;
    this.port = options.port || 3000;
    this.host = options.host || 'localhost';
    this.enableCors = options.enableCors ?? true;
  }

  /**
   * 启动服务器
   */
  async start(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.server = http.createServer((req, res) => this.handleRequest(req, res));

      this.server.on('error', (error) => {
        reject(error);
      });

      this.server.listen(this.port, this.host, () => {
        console.log(`🌐 Web UI 服务器启动：http://${this.host}:${this.port}`);
        resolve();
      });
    });
  }

  /**
   * 停止服务器
   */
  async stop(): Promise<void> {
    return new Promise((resolve) => {
      if (this.server) {
        this.server.close(() => {
          console.log('Web UI 服务器已停止');
          resolve();
        });
      } else {
        resolve();
      }
    });
  }

  /**
   * 处理 HTTP 请求
   */
  private async handleRequest(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
    const url = new URL(req.url || '/', `http://${this.host}:${this.port}`);
    const method = req.method || 'GET';

    // CORS 预检请求
    if (this.enableCors && method === 'OPTIONS') {
      this.setCorsHeaders(res);
      res.writeHead(204);
      res.end();
      return;
    }

    // API 路由
    if (url.pathname.startsWith('/api/')) {
      await this.handleApiRequest(url, method, req, res);
      return;
    }

    // Web 界面
    if (url.pathname === '/') {
      this.serveWebUi(res);
      return;
    }

    // 404
    res.writeHead(404);
    res.end('Not Found');
  }

  /**
   * 处理 API 请求
   */
  private async handleApiRequest(
    url: URL,
    method: string,
    req: http.IncomingMessage,
    res: http.ServerResponse
  ): Promise<void> {
    this.setCorsHeaders(res);
    res.setHeader('Content-Type', 'application/json');

    try {
      const path = url.pathname.replace('/api/', '');
      let response: ApiResponse;

      switch (path) {
        case 'health':
          response = { success: true, data: { status: 'ok', version: '0.3.0' } };
          break;

        case 'configs':
          if (method === 'GET') {
            const configs = this.configManager.listConfigs();
            response = { success: true, data: configs };
          } else {
            response = { success: false, error: 'Method not allowed' };
          }
          break;

        case 'connect':
          if (method === 'POST') {
            const body = await this.readBody(req);
            const { name } = JSON.parse(body);
            await this.connectionManager.connect(name);
            response = { success: true, data: { connected: name } };
          } else {
            response = { success: false, error: 'Method not allowed' };
          }
          break;

        case 'query':
          if (method === 'POST') {
            const body = await this.readBody(req);
            const { sql } = JSON.parse(body);
            const result = await this.connectionManager.execute(sql);
            response = { success: true, data: result };
          } else {
            response = { success: false, error: 'Method not allowed' };
          }
          break;

        default:
          response = { success: false, error: 'Not found' };
          res.writeHead(404);
      }

      res.end(JSON.stringify(response));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      res.writeHead(500);
      res.end(JSON.stringify({ success: false, error: errorMessage }));
    }
  }

  /**
   * 提供 Web 界面
   */
  private serveWebUi(res: http.ServerResponse): void {
    res.setHeader('Content-Type', 'text/html');
    res.writeHead(200);
    res.end(`
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>DBManager Web UI</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
    .container { max-width: 1200px; margin: 0 auto; }
    .header { background: #007bff; color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
    .editor { background: white; border-radius: 8px; padding: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    textarea { width: 100%; height: 200px; font-family: monospace; font-size: 14px; padding: 10px; border: 1px solid #ddd; border-radius: 4px; resize: vertical; }
    button { background: #007bff; color: white; border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer; font-size: 14px; margin-top: 10px; }
    button:hover { background: #0056b3; }
    .results { margin-top: 20px; background: white; border-radius: 8px; padding: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    table { width: 100%; border-collapse: collapse; }
    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
    th { background: #f8f9fa; font-weight: 600; }
    .status { padding: 10px; border-radius: 4px; margin-bottom: 10px; }
    .status.success { background: #d4edda; color: #155724; }
    .status.error { background: #f8d7da; color: #721c24; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🚀 DBManager Web UI</h1>
      <p>交互式数据库管理工具</p>
    </div>
    
    <div class="editor">
      <h2>SQL 查询</h2>
      <textarea id="sqlEditor" placeholder="输入 SQL 查询...">SELECT * FROM users LIMIT 10;</textarea>
      <button onclick="executeQuery()">执行查询</button>
      <div id="status"></div>
    </div>
    
    <div class="results" id="results" style="display: none;">
      <h2>查询结果</h2>
      <div id="tableContainer"></div>
    </div>
  </div>
  
  <script>
    async function executeQuery() {
      const sql = document.getElementById('sqlEditor').value;
      const statusDiv = document.getElementById('status');
      const resultsDiv = document.getElementById('results');
      const tableContainer = document.getElementById('tableContainer');
      
      try {
        statusDiv.innerHTML = '<div class="status">执行中...</div>';
        
        const response = await fetch('/api/query', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sql })
        });
        
        const result = await response.json();
        
        if (result.success) {
          statusDiv.innerHTML = '<div class="status success">✓ 查询成功</div>';
          renderTable(result.data, tableContainer);
          resultsDiv.style.display = 'block';
        } else {
          statusDiv.innerHTML = '<div class="status error">✗ ' + result.error + '</div>';
          resultsDiv.style.display = 'none';
        }
      } catch (error) {
        statusDiv.innerHTML = '<div class="status error">✗ ' + error.message + '</div>';
        resultsDiv.style.display = 'none';
      }
    }
    
    function renderTable(data, container) {
      if (!data.columns || data.columns.length === 0) {
        container.innerHTML = '<p>无数据</p>';
        return;
      }
      
      let html = '<table><thead><tr>';
      data.columns.forEach(col => {
        html += '<th>' + col + '</th>';
      });
      html += '</tr></thead><tbody>';
      
      data.rows.forEach(row => {
        html += '<tr>';
        row.forEach(cell => {
          html += '<td>' + (cell === null ? 'NULL' : cell) + '</td>';
        });
        html += '</tr>';
      });
      
      html += '</tbody></table>';
      container.innerHTML = html;
    }
  </script>
</body>
</html>
    `);
  }

  /**
   * 设置 CORS 头
   */
  private setCorsHeaders(res: http.ServerResponse): void {
    if (this.enableCors) {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    }
  }

  /**
   * 读取请求体
   */
  private readBody(req: http.IncomingMessage): Promise<string> {
    return new Promise((resolve) => {
      let body = '';
      req.on('data', chunk => {
        body += chunk.toString();
      });
      req.on('end', () => {
        resolve(body);
      });
    });
  }

  /**
   * 获取服务器状态
   */
  getStatus(): { running: boolean; port: number; host: string } {
    return {
      running: !!this.server,
      port: this.port,
      host: this.host,
    };
  }
}
