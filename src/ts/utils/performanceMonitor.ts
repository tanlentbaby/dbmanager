/**
 * 性能监控工具
 * v0.8.0 Phase 1 - 性能优化
 * 
 * 功能:
 * - 执行时间测量
 * - 内存使用监控
 * - 性能基准测试
 * - 性能报告生成
 */

export interface PerformanceMetric {
  name: string;
  duration: number;
  timestamp: number;
  memory?: number;
}

export interface BenchmarkResult {
  name: string;
  iterations: number;
  totalDuration: number;
  avgDuration: number;
  minDuration: number;
  maxDuration: number;
  opsPerSecond: number;
}

export class PerformanceMonitor {
  private metrics: Map<string, PerformanceMetric[]>;
  private startTime: number;
  private startMemory: number;

  constructor() {
    this.metrics = new Map();
    this.startTime = Date.now();
    this.startMemory = process.memoryUsage().heapUsed;
  }

  /**
   * 开始计时
   */
  start(name: string): void {
    (this as any)[`_${name}_start`] = Date.now();
    (this as any)[`_${name}_memory`] = process.memoryUsage().heapUsed;
  }

  /**
   * 结束计时并记录
   */
  end(name: string): number {
    const start = (this as any)[`_${name}_start`];
    const startMemory = (this as any)[`_${name}_memory`];
    
    if (!start) {
      console.warn(`PerformanceMonitor: 未找到 "${name}" 的开始时间`);
      return 0;
    }

    const duration = Date.now() - start;
    const memory = process.memoryUsage().heapUsed - startMemory;

    const metric: PerformanceMetric = {
      name,
      duration,
      timestamp: Date.now(),
      memory,
    };

    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }
    this.metrics.get(name)!.push(metric);

    return duration;
  }

  /**
   * 运行基准测试
   */
  async benchmark(
    name: string,
    fn: () => Promise<void> | void,
    iterations: number = 100
  ): Promise<BenchmarkResult> {
    const durations: number[] = [];

    // 预热
    await Promise.resolve(fn());

    // 正式测试
    for (let i = 0; i < iterations; i++) {
      const start = Date.now();
      await Promise.resolve(fn());
      durations.push(Date.now() - start);
    }

    const totalDuration = durations.reduce((a, b) => a + b, 0);
    const avgDuration = totalDuration / iterations;
    const minDuration = Math.min(...durations);
    const maxDuration = Math.max(...durations);
    const opsPerSecond = 1000 / avgDuration;

    return {
      name,
      iterations,
      totalDuration,
      avgDuration,
      minDuration,
      maxDuration,
      opsPerSecond,
    };
  }

  /**
   * 获取指标统计
   */
  getStats(name?: string): Record<string, any> {
    if (name) {
      const metrics = this.metrics.get(name);
      if (!metrics || metrics.length === 0) {
        return {};
      }

      const durations = metrics.map(m => m.duration);
      return {
        name,
        count: metrics.length,
        avgDuration: durations.reduce((a, b) => a + b, 0) / durations.length,
        minDuration: Math.min(...durations),
        maxDuration: Math.max(...durations),
        totalDuration: durations.reduce((a, b) => a + b, 0),
      };
    }

    const allStats: Record<string, any> = {};
    for (const [name] of this.metrics) {
      allStats[name] = this.getStats(name);
    }
    return allStats;
  }

  /**
   * 获取内存使用
   */
  getMemoryUsage(): { heapUsed: number; heapTotal: number; external: number; rss: number } {
    return process.memoryUsage();
  }

  /**
   * 获取自启动以来的内存变化
   */
  getMemoryDelta(): number {
    return process.memoryUsage().heapUsed - this.startMemory;
  }

  /**
   * 获取运行时间
   */
  getUptime(): number {
    return Date.now() - this.startTime;
  }

  /**
   * 清除指标
   */
  clear(name?: string): void {
    if (name) {
      this.metrics.delete(name);
    } else {
      this.metrics.clear();
    }
  }

  /**
   * 格式化输出报告
   */
  formatReport(): string {
    const lines: string[] = [];

    lines.push('⚡ 性能报告');
    lines.push('═══════════════════════════════════════');

    // 运行时间
    const uptime = this.getUptime();
    lines.push(`运行时间：${(uptime / 1000).toFixed(2)}s`);

    // 内存使用
    const memory = this.getMemoryUsage();
    lines.push(`内存使用：${(memory.heapUsed / 1024 / 1024).toFixed(2)} MB`);
    lines.push(`内存变化：${(this.getMemoryDelta() / 1024 / 1024).toFixed(2)} MB`);

    // 性能指标
    lines.push('\n📊 性能指标:');
    for (const [name, stats] of Object.entries(this.getStats())) {
      const s = stats as any;
      if (s.count > 0) {
        lines.push(`\n  ${name}:`);
        lines.push(`    调用次数：${s.count}`);
        lines.push(`    平均耗时：${s.avgDuration.toFixed(2)}ms`);
        lines.push(`    最小耗时：${s.minDuration.toFixed(2)}ms`);
        lines.push(`    最大耗时：${s.maxDuration.toFixed(2)}ms`);
        lines.push(`    总耗时：${s.totalDuration.toFixed(2)}ms`);
      }
    }

    return lines.join('\n');
  }

  /**
   * 格式化基准测试结果
   */
  formatBenchmark(result: BenchmarkResult): string {
    const lines: string[] = [];

    lines.push(`📈 基准测试：${result.name}`);
    lines.push('═══════════════════════════════════════');
    lines.push(`迭代次数：${result.iterations}`);
    lines.push(`总耗时：${result.totalDuration.toFixed(2)}ms`);
    lines.push(`平均耗时：${result.avgDuration.toFixed(2)}ms`);
    lines.push(`最小耗时：${result.minDuration.toFixed(2)}ms`);
    lines.push(`最大耗时：${result.maxDuration.toFixed(2)}ms`);
    lines.push(`操作/秒：${result.opsPerSecond.toFixed(2)}`);

    return lines.join('\n');
  }
}

export default PerformanceMonitor;
