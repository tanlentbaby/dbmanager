/**
 * REST API 服务
 * v0.9.0 Phase 5 - API 开放
 */

import express, { Request, Response } from 'express';
import cors from 'cors';

const app = express();
const PORT = process.env.DBMANAGER_API_PORT || 3000;

// 中间件
app.use(cors());
app.use(express.json());

// 模拟数据库
const databases: any[] = [];
const bookmarks: any[] = [];
const history: any[] = [];

/**
 * 健康检查
 */
app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    version: '0.9.0',
    timestamp: new Date().toISOString(),
  });
});

/**
 * 数据库相关 API
 */
app.get('/api/databases', (req: Request, res: Response) => {
  res.json({ databases });
});

app.post('/api/connect', (req: Request, res: Response) => {
  const { type, host, port, user, password, database } = req.body;
  // 模拟连接
  res.json({
    success: true,
    database: {
      id: `db_${Date.now()}`,
      name: database,
      type,
      host,
      port,
      connected: true,
    },
  });
});

app.post('/api/disconnect', (req: Request, res: Response) => {
  const { databaseId } = req.body;
  res.json({ success: true });
});

/**
 * 查询相关 API
 */
app.post('/api/query', (req: Request, res: Response) => {
  const { sql, databaseId } = req.body;
  // 模拟查询结果
  res.json({
    columns: ['id', 'name', 'email'],
    rows: [
      [1, 'Alice', 'alice@example.com'],
      [2, 'Bob', 'bob@example.com'],
    ],
    rowCount: 2,
    duration: 45,
  });
});

app.get('/api/history', (req: Request, res: Response) => {
  const limit = parseInt(req.query.limit as string) || 50;
  res.json({ history: history.slice(0, limit) });
});

/**
 * 书签相关 API
 */
app.get('/api/bookmarks', (req: Request, res: Response) => {
  res.json({ bookmarks });
});

app.post('/api/bookmarks', (req: Request, res: Response) => {
  const bookmark = req.body;
  const newBookmark = {
    ...bookmark,
    id: `bm_${Date.now()}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  bookmarks.push(newBookmark);
  res.json({ success: true, bookmark: newBookmark });
});

app.put('/api/bookmarks/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const updates = req.body;
  res.json({ success: true, bookmark: { id, ...updates } });
});

app.delete('/api/bookmarks/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  res.json({ success: true });
});

/**
 * AI 相关 API
 */
app.post('/api/ai/nl2sql', (req: Request, res: Response) => {
  const { query, tableSchema } = req.body;
  // 模拟 NL2SQL 结果
  res.json({
    result: {
      sql: 'SELECT * FROM users WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)',
      explanation: 'SQL 已生成',
      confidence: 0.85,
      tables: ['users'],
    },
  });
});

app.post('/api/ai/explain', (req: Request, res: Response) => {
  const { sql } = req.body;
  res.json({
    result: {
      summary: '查询用户表',
      breakdown: ['SELECT * - 选择所有列', 'FROM users - 从 users 表'],
      suggestions: ['考虑只选择需要的列'],
    },
  });
});

app.post('/api/ai/optimize', (req: Request, res: Response) => {
  const { sql } = req.body;
  res.json({
    optimized: sql,
    suggestions: ['添加索引', '避免 SELECT *'],
  });
});

/**
 * 插件相关 API
 */
app.get('/api/plugins', (req: Request, res: Response) => {
  res.json({
    plugins: [
      {
        id: 'export-plus',
        name: 'Export Plus',
        version: '1.0.0',
        description: '高级导出功能',
        enabled: true,
      },
    ],
  });
});

app.post('/api/plugins/:id/install', (req: Request, res: Response) => {
  const { id } = req.params;
  res.json({ success: true, message: `Plugin ${id} installed` });
});

app.post('/api/plugins/:id/uninstall', (req: Request, res: Response) => {
  const { id } = req.params;
  res.json({ success: true, message: `Plugin ${id} uninstalled` });
});

/**
 * 启动服务器
 */
export function startAPIServer() {
  app.listen(PORT, () => {
    console.log(`🚀 DBManager API Server running on port ${PORT}`);
    console.log(`📡 Health check: http://localhost:${PORT}/api/health`);
  });
}

export default app;
