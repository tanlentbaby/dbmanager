/**
 * 命令历史记录管理器
 * 支持持久化存储和导航
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import os from 'os';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export class HistoryManager {
  private history: string[] = [];
  private maxHistory: number;
  private historyFile: string;
  private dirty = false;

  constructor(maxHistory: number = 1000) {
    this.maxHistory = maxHistory;
    this.historyFile = path.join(os.homedir(), '.dbmanager', 'history.json');
  }

  /**
   * 初始化，加载历史记录
   */
  async init(): Promise<void> {
    try {
      const data = await fs.readFile(this.historyFile, 'utf-8');
      this.history = JSON.parse(data);
      // 限制历史大小
      if (this.history.length > this.maxHistory) {
        this.history = this.history.slice(-this.maxHistory);
        this.dirty = true;
      }
    } catch (error) {
      // 文件不存在或解析错误，使用空历史
      this.history = [];
    }
  }

  /**
   * 添加命令到历史
   */
  add(command: string): void {
    if (!command.trim()) return;
    
    // 避免重复添加相同的最后一条命令
    if (this.history[this.history.length - 1] === command) {
      return;
    }
    
    this.history.push(command);
    this.dirty = true;
    
    // 限制历史大小
    if (this.history.length > this.maxHistory) {
      this.history = this.history.slice(-this.maxHistory);
    }
  }

  /**
   * 获取历史命令（正向）
   */
  getHistory(index: number): string | undefined {
    if (index < 0 || index >= this.history.length) {
      return undefined;
    }
    return this.history[index];
  }

  /**
   * 获取上一条命令
   */
  getPrevious(currentIndex: number): { command: string | undefined; newIndex: number } {
    const newIndex = Math.min(currentIndex + 1, this.history.length - 1);
    return {
      command: this.history[newIndex],
      newIndex,
    };
  }

  /**
   * 获取下一条命令
   */
  getNext(currentIndex: number): { command: string | undefined; newIndex: number } {
    const newIndex = currentIndex <= 0 ? -1 : currentIndex - 1;
    return {
      command: newIndex >= 0 ? this.history[newIndex] : undefined,
      newIndex,
    };
  }

  /**
   * 获取最近 N 条命令
   */
  getRecent(count: number = 20): string[] {
    return this.history.slice(-count).reverse();
  }

  /**
   * 清空历史
   */
  clear(): void {
    this.history = [];
    this.dirty = true;
  }

  /**
   * 保存历史到文件
   */
  async save(): Promise<void> {
    if (!this.dirty) return;

    try {
      const dir = path.dirname(this.historyFile);
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(this.historyFile, JSON.stringify(this.history, null, 2), 'utf-8');
      this.dirty = false;
    } catch (error) {
      console.error('保存历史记录失败:', error);
    }
  }

  /**
   * 获取历史统计
   */
  getStats() {
    return {
      totalCommands: this.history.length,
      maxHistory: this.maxHistory,
      isDirty: this.dirty,
    };
  }
}
