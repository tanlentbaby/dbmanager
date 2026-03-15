/**
 * Web UI 服务器框架
 * 提供 HTTP API 和 Web 界面
 */

import http from 'http';
import { ConfigManager } from '../config/manager.js';
import { ConnectionManager } from '../database/connection.js';
import { TabManager, handleTabsApi } from './api/tabs.js';
import { handleExportApi, cleanupExpiredFiles } from './api/export.js';
import { handleConfigsApi } from './api/configs.js';

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
  private tabManager: TabManager;
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
    this.tabManager = new TabManager(50);
    this.port = options.port || 3000;
    this.host = options.host || 'localhost';
    this.enableCors = options.enableCors ?? true;
    
    // 启动时清理过期文件
    cleanupExpiredFiles();
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

    try {
      const path = url.pathname.replace('/api/', '');
      let response: ApiResponse;

      // 健康检查
      if (path === 'health') {
        response = { success: true, data: { status: 'ok', version: '0.4.0-dev' } };
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(response));
        return;
      }

      // 标签管理 API
      if (path.startsWith('tabs') || path.startsWith('tabs/')) {
        res.setHeader('Content-Type', 'application/json');
        response = await handleTabsApi(path, method, req, res, this.tabManager, this.readBody.bind(this));
        
        // 检查是否是直接响应（下载）
        if (response.error !== 'DIRECT_RESPONSE') {
          res.end(JSON.stringify(response));
        }
        return;
      }

      // 导出 API
      if (path.startsWith('export') || path.startsWith('export/')) {
        res.setHeader('Content-Type', 'application/json');
        try {
          response = await handleExportApi(path, method, req, res, this.readBody.bind(this));
          if (response.error !== 'DIRECT_RESPONSE') {
            res.end(JSON.stringify(response));
          }
        } catch (error) {
          if (error instanceof Error && error.message === 'DIRECT_RESPONSE') {
            return;
          }
          throw error;
        }
        return;
      }

      // 配置管理 API
      if (path.startsWith('configs') || path.startsWith('configs/')) {
        res.setHeader('Content-Type', 'application/json');
        response = await handleConfigsApi(
          path, method, req, res,
          this.configManager,
          this.connectionManager,
          this.readBody.bind(this)
        );
        res.end(JSON.stringify(response));
        return;
      }

      // 原有 API 处理
      res.setHeader('Content-Type', 'application/json');

      switch (path) {
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
  private async serveWebUi(res: http.ServerResponse): Promise<void> {
    const fs = await import('fs');
    const path = await import('path');
    const { fileURLToPath } = await import('url');
    
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const indexPath = path.join(__dirname, 'public', 'index.html');
    
    try {
      const content = fs.readFileSync(indexPath, 'utf8');
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.writeHead(200);
      res.end(content);
    } catch (error) {
      res.setHeader('Content-Type', 'text/html');
      res.writeHead(500);
      res.end('<h1>500 - Internal Server Error</h1><p>Could not load Web UI</p>');
    }
  }
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
