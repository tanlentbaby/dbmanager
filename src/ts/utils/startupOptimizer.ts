/**
 * 启动性能优化器
 * v0.8.0 Phase 2 - 启动速度优化
 * 
 * 功能:
 * - 懒加载模块管理
 * - 并行初始化
 * - 启动时间分析
 * - 预加载策略
 */

export interface ModuleInfo {
  name: string;
  path: string;
  loaded: boolean;
  loadTime?: number;
  size?: number;
  dependencies: string[];
}

export interface StartupMetrics {
  totalTime: number;
  moduleLoadTime: number;
  configLoadTime: number;
  connectionTime: number;
  lazyModules: number;
  eagerModules: number;
}

export class StartupOptimizer {
  private modules: Map<string, ModuleInfo>;
  private startTime: number;
  private metrics: Partial<StartupMetrics>;
  private lazyLoadQueue: string[];
  private isLazyMode: boolean;

  constructor() {
    this.modules = new Map();
    this.startTime = Date.now();
    this.metrics = {};
    this.lazyLoadQueue = [];
    this.isLazyMode = true;
  }

  /**
   * 注册模块
   */
  registerModule(name: string, path: string, dependencies: string[] = []): void {
    this.modules.set(name, {
      name,
      path,
      loaded: false,
      dependencies,
    });
  }

  /**
   * 懒加载模块
   */
  async loadModule(name: string): Promise<any> {
    const module = this.modules.get(name);
    if (!module) {
      throw new Error(`模块 "${name}" 未注册`);
    }

    if (module.loaded) {
      return module;
    }

    const start = Date.now();

    try {
      // 动态导入
      const imported = await import(module.path);
      
      module.loaded = true;
      module.loadTime = Date.now() - start;
      
      return imported;
    } catch (error) {
      console.error(`加载模块 "${name}" 失败:`, error);
      throw error;
    }
  }

  /**
   * 预加载模块（后台加载）
   */
  async preloadModules(names: string[]): Promise<void> {
    const promises = names.map(name => this.loadModule(name));
    await Promise.all(promises);
  }

  /**
   * 并行初始化
   */
  async parallelInit(tasks: Array<() => Promise<any>>): Promise<any[]> {
    return Promise.all(tasks.map(task => task()));
  }

  /**
   * 设置懒加载模式
   */
  setLazyMode(enabled: boolean): void {
    this.isLazyMode = enabled;
  }

  /**
   * 获取启动指标
   */
  getMetrics(): StartupMetrics {
    const loadedModules = Array.from(this.modules.values()).filter(m => m.loaded);
    const unloadedModules = Array.from(this.modules.values()).filter(m => !m.loaded);

    return {
      totalTime: Date.now() - this.startTime,
      moduleLoadTime: loadedModules.reduce((sum, m) => sum + (m.loadTime || 0), 0),
      configLoadTime: this.metrics.configLoadTime || 0,
      connectionTime: this.metrics.connectionTime || 0,
      lazyModules: unloadedModules.length,
      eagerModules: loadedModules.length,
    };
  }

  /**
   * 记录配置加载时间
   */
  recordConfigLoad(time: number): void {
    this.metrics.configLoadTime = time;
  }

  /**
   * 记录连接时间
   */
  recordConnectionTime(time: number): void {
    this.metrics.connectionTime = time;
  }

  /**
   * 获取未加载的模块
   */
  getUnloadedModules(): ModuleInfo[] {
    return Array.from(this.modules.values()).filter(m => !m.loaded);
  }

  /**
   * 获取已加载的模块
   */
  getLoadedModules(): ModuleInfo[] {
    return Array.from(this.modules.values()).filter(m => m.loaded);
  }

  /**
   * 分析启动瓶颈
   */
  analyzeBottlenecks(): string[] {
    const bottlenecks: string[] = [];
    const metrics = this.getMetrics();

    if (metrics.totalTime > 2000) {
      bottlenecks.push('总启动时间超过 2 秒');
    }

    if (metrics.moduleLoadTime > 1000) {
      bottlenecks.push('模块加载时间过长');
    }

    if (metrics.connectionTime > 500) {
      bottlenecks.push('数据库连接时间过长');
    }

    if (metrics.lazyModules > 10) {
      bottlenecks.push('懒加载模块过多，考虑预加载');
    }

    return bottlenecks;
  }

  /**
   * 生成优化建议
   */
  generateRecommendations(): string[] {
    const recommendations: string[] = [];
    const metrics = this.getMetrics();
    const unloaded = this.getUnloadedModules();

    if (metrics.totalTime > 1000) {
      recommendations.push('启用懒加载模式以减少初始加载时间');
    }

    if (unloaded.length > 5) {
      const popularModules = unloaded.slice(0, 3).map(m => m.name);
      recommendations.push(`预加载常用模块：${popularModules.join(', ')}`);
    }

    if (metrics.connectionTime > 300) {
      recommendations.push('使用连接池加速数据库连接');
    }

    return recommendations;
  }

  /**
   * 格式化输出启动报告
   */
  formatStartupReport(): string {
    const metrics = this.getMetrics();
    const bottlenecks = this.analyzeBottlenecks();
    const recommendations = this.generateRecommendations();

    const lines: string[] = [];

    lines.push('🚀 启动性能报告');
    lines.push('═══════════════════════════════════════');
    lines.push(`总启动时间：${metrics.totalTime}ms`);
    lines.push(`模块加载：${metrics.moduleLoadTime}ms`);
    lines.push(`配置加载：${metrics.configLoadTime}ms`);
    lines.push(`数据库连接：${metrics.connectionTime}ms`);
    lines.push(`\n模块统计:`);
    lines.push(`  已加载：${metrics.eagerModules}`);
    lines.push(`  未加载：${metrics.lazyModules}`);

    if (bottlenecks.length > 0) {
      lines.push('\n⚠️ 瓶颈:');
      bottlenecks.forEach(b => lines.push(`  • ${b}`));
    }

    if (recommendations.length > 0) {
      lines.push('\n💡 建议:');
      recommendations.forEach(r => lines.push(`  • ${r}`));
    }

    return lines.join('\n');
  }

  /**
   * 重置指标
   */
  reset(): void {
    this.startTime = Date.now();
    this.metrics = {};
    this.modules.forEach(m => {
      m.loaded = false;
      m.loadTime = undefined;
    });
  }
}

export default StartupOptimizer;
