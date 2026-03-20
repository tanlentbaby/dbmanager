/**
 * API 配置
 */

export const API_CONFIG = {
  baseURL: 'http://localhost:3000/api',
  timeout: 10000,
};

export const ENDPOINTS = {
  // 数据库
  databases: '/databases',
  connect: '/connect',
  disconnect: '/disconnect',
  
  // 查询
  query: '/query',
  history: '/history',
  
  // 书签
  bookmarks: '/bookmarks',
  
  // AI
  nl2sql: '/ai/nl2sql',
  explain: '/ai/explain',
  optimize: '/ai/optimize',
  
  // 云同步
  sync: '/sync',
};
