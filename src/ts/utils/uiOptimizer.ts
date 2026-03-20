/**
 * UI 响应优化器
 * v0.8.0 Phase 3 - UI 响应优化
 * 
 * 功能:
 * - 虚拟滚动
 * - 防抖节流
 * - 渲染优化
 * - 加载状态管理
 */

export interface ScrollState {
  visibleStart: number;
  visibleEnd: number;
  totalItems: number;
  itemHeight: number;
  containerHeight: number;
}

export interface LoadingState {
  isLoading: boolean;
  progress?: number;
  message?: string;
  startTime?: number;
}

export class UIOptimizer {
  private scrollState?: ScrollState;
  private loadingState: Map<string, LoadingState>;
  private debounceTimers: Map<string, NodeJS.Timeout>;
  private throttleTimers: Map<string, NodeJS.Timeout>;
  private throttleLastCall: Map<string, number>;

  constructor() {
    this.loadingState = new Map();
    this.debounceTimers = new Map();
    this.throttleTimers = new Map();
    this.throttleLastCall = new Map();
  }

  /**
   * 计算虚拟滚动可见范围
   */
  calculateVisibleRange(
    scrollTop: number,
    containerHeight: number,
    itemHeight: number,
    totalItems: number,
    overscan: number = 5
  ): ScrollState {
    const visibleStart = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const visibleCount = Math.ceil(containerHeight / itemHeight) + overscan * 2;
    const visibleEnd = Math.min(totalItems, visibleStart + visibleCount);

    this.scrollState = {
      visibleStart,
      visibleEnd,
      totalItems,
      itemHeight,
      containerHeight,
    };

    return this.scrollState;
  }

  /**
   * 获取虚拟滚动样式
   */
  getVirtualScrollStyles(): { paddingTop: number; paddingBottom: number } {
    if (!this.scrollState) {
      return { paddingTop: 0, paddingBottom: 0 };
    }

    const { visibleStart, totalItems, itemHeight } = this.scrollState;
    const paddingTop = visibleStart * itemHeight;
    const paddingBottom = (totalItems - this.scrollState.visibleEnd) * itemHeight;

    return { paddingTop, paddingBottom };
  }

  /**
   * 防抖函数
   */
  debounce<T extends (...args: any[]) => any>(
    key: string,
    fn: T,
    delay: number = 300
  ): (...args: Parameters<T>) => void {
    return (...args: Parameters<T>) => {
      // 清除之前的定时器
      const existingTimer = this.debounceTimers.get(key);
      if (existingTimer) {
        clearTimeout(existingTimer);
      }

      // 设置新定时器
      const timer = setTimeout(() => {
        fn(...args);
        this.debounceTimers.delete(key);
      }, delay);

      this.debounceTimers.set(key, timer);
    };
  }

  /**
   * 节流函数
   */
  throttle<T extends (...args: any[]) => any>(
    key: string,
    fn: T,
    limit: number = 100
  ): (...args: Parameters<T>) => void {
    return (...args: Parameters<T>) => {
      const now = Date.now();
      const lastCall = this.throttleLastCall.get(key) || 0;

      if (now - lastCall >= limit) {
        this.throttleLastCall.set(key, now);
        fn(...args);
      } else {
        // 清除之前的定时器
        const existingTimer = this.throttleTimers.get(key);
        if (existingTimer) {
          clearTimeout(existingTimer);
        }

        // 设置在限制时间后执行
        const timer = setTimeout(() => {
          this.throttleLastCall.set(key, Date.now());
          fn(...args);
          this.throttleTimers.delete(key);
        }, limit - (now - lastCall));

        this.throttleTimers.set(key, timer);
      }
    };
  }

  /**
   * 开始加载
   */
  startLoading(key: string, message?: string): void {
    this.loadingState.set(key, {
      isLoading: true,
      message,
      startTime: Date.now(),
    });
  }

  /**
   * 结束加载
   */
  stopLoading(key: string): number {
    const state = this.loadingState.get(key);
    if (!state) return 0;

    const duration = Date.now() - (state.startTime || Date.now());
    
    this.loadingState.set(key, {
      isLoading: false,
      progress: 100,
    });

    // 延迟清除状态，让用户看到完成状态
    setTimeout(() => {
      this.loadingState.delete(key);
    }, 500);

    return duration;
  }

  /**
   * 更新加载进度
   */
  updateProgress(key: string, progress: number): void {
    const state = this.loadingState.get(key);
    if (state) {
      state.progress = progress;
      this.loadingState.set(key, state);
    }
  }

  /**
   * 获取加载状态
   */
  getLoadingState(key: string): LoadingState | undefined {
    return this.loadingState.get(key);
  }

  /**
   * 是否正在加载
   */
  isLoading(key?: string): boolean {
    if (key) {
      return this.loadingState.get(key)?.isLoading || false;
    }
    return Array.from(this.loadingState.values()).some(s => s.isLoading);
  }

  /**
   * 批量更新（合并多次更新）
   */
  batchUpdates<T>(updates: Array<() => T>): T[] {
    const results: T[] = [];
    
    // 简化实现：直接执行所有更新
    // 在 React/Ink 中可以使用 batch 或 requestAnimationFrame
    for (const update of updates) {
      results.push(update());
    }

    return results;
  }

  /**
   * 请求空闲时执行（低优先级任务）
   */
  requestIdleCallback(fn: () => void, timeout?: number): void {
    const ric = (globalThis as any).requestIdleCallback;
    if (typeof ric === 'function') {
      ric(fn, { timeout });
    } else {
      // 降级处理
      setTimeout(fn, 1);
    }
  }

  /**
   * 清理定时器
   */
  cleanup(): void {
    this.debounceTimers.forEach(timer => clearTimeout(timer));
    this.throttleTimers.forEach(timer => clearTimeout(timer));
    this.debounceTimers.clear();
    this.throttleTimers.clear();
    this.throttleLastCall.clear();
  }

  /**
   * 格式化加载状态
   */
  formatLoadingState(key: string): string {
    const state = this.loadingState.get(key);
    if (!state) {
      return '无加载任务';
    }

    const lines: string[] = [];
    
    if (state.isLoading) {
      lines.push(`⏳ ${state.message || '加载中...'}`);
      if (state.progress !== undefined) {
        const bar = this.createProgressBar(state.progress);
        lines.push(`   ${bar} ${state.progress}%`);
      }
      if (state.startTime) {
        const elapsed = Date.now() - state.startTime;
        lines.push(`   已用时：${elapsed}ms`);
      }
    } else {
      lines.push('✅ 加载完成');
    }

    return lines.join('\n');
  }

  /**
   * 创建进度条
   */
  private createProgressBar(progress: number, width: number = 20): string {
    const filled = Math.round((progress / 100) * width);
    const empty = width - filled;
    return '█'.repeat(filled) + '░'.repeat(empty);
  }
}

export default UIOptimizer;
