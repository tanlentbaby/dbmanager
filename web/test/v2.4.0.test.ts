/**
 * v2.4.0 插件自动更新测试
 */

import { describe, it, expect } from 'vitest'
import {
  checkPluginUpdates,
  autoCheckUpdates,
  getAutoUpdateConfig,
  configureAutoUpdate,
  getUpdateHistory,
  getPluginDependencies,
  checkDependencies,
} from '../../web/src/lib/pluginAutoUpdate'
import {
  buildDependencyGraph,
  resolveDependencies,
  detectConflicts,
  getDependencyTree,
} from '../../web/src/lib/pluginDependencies'

describe('v2.4.0 插件自动更新', () => {
  // ==================== 自动更新测试 ====================
  describe('自动更新', () => {
    it '检查插件更新', async () => {
      const updates = await checkPluginUpdates(['plugin_chart_view', 'plugin_backup_pro'])
      expect(Array.isArray(updates)).toBe(true)
      expect(updates.every((u) => u.pluginId)).toBe(true)
      expect(updates.every((u) => 'hasUpdate' in u)).toBe(true)
    })

    it '自动检查所有插件更新', async () => {
      const updates = await autoCheckUpdates()
      expect(Array.isArray(updates)).toBe(true)
    })

    it '获取自动更新配置', () => {
      const config = getAutoUpdateConfig()
      expect('enabled' in config).toBe(true)
      expect('checkInterval' in config).toBe(true)
      expect('autoDownload' in config).toBe(true)
    })

    it '配置自动更新', async () => {
      const result = await configureAutoUpdate({
        enabled: true,
        checkInterval: 12,
        autoDownload: true,
        autoInstall: false,
        notifyOnly: false,
      })
      expect(result).toBe(true)
    })

    it '获取更新历史', async () => {
      const history = await getUpdateHistory()
      expect(Array.isArray(history)).toBe(true)
      if (history.length > 0) {
        expect(history[0].pluginId).toBeDefined()
        expect(history[0].fromVersion).toBeDefined()
        expect(history[0].toVersion).toBeDefined()
      }
    })
  })

  // ==================== 依赖管理测试 ====================
  describe('依赖管理', () => {
    it '获取插件依赖', async () => {
      const deps = await getPluginDependencies('plugin_chart_view')
      expect(Array.isArray(deps)).toBe(true)
      expect(deps.every((d) => d.name)).toBe(true)
      expect(deps.every((d) => d.version)).toBe(true)
    })

    it '检查依赖是否满足', async () => {
      const result = await checkDependencies('plugin_chart_view')
      expect('satisfied' in result).toBe(true)
      expect('missing' in result).toBe(true)
      expect('incompatible' in result).toBe(true)
    })

    it '构建依赖图', async () => {
      const graph = await buildDependencyGraph(['plugin_chart_view'])
      expect(Array.isArray(graph)).toBe(true)
      expect(graph.every((g) => g.pluginId)).toBe(true)
      expect(graph.every((g) => 'dependencies' in g)).toBe(true)
    })

    it '解析依赖', async () => {
      const resolution = await resolveDependencies('plugin_chart_view')
      expect(resolution.pluginId).toBe('plugin_chart_view')
      expect('resolved' in resolution).toBe(true)
      expect('dependencies' in resolution).toBe(true)
    })

    it '检测依赖冲突', async () => {
      const conflicts = await detectConflicts(['plugin_chart_view'])
      expect(Array.isArray(conflicts)).toBe(true)
    })

    it '获取依赖树', async () => {
      const tree = await getDependencyTree('plugin_chart_view')
      expect(tree.name).toBe('plugin_chart_view')
      expect('version' in tree).toBe(true)
      expect('children' in tree).toBe(true)
    })
  })

  // ==================== 集成测试 ====================
  describe('集成测试', () => {
    it '完整更新流程', async () => {
      // 1. 检查更新
      const updates = await autoCheckUpdates()
      expect(Array.isArray(updates)).toBe(true)

      // 2. 获取配置
      const config = getAutoUpdateConfig()
      expect(config.enabled).toBeDefined()

      // 3. 获取历史
      const history = await getUpdateHistory()
      expect(Array.isArray(history)).toBe(true)
    })

    it '完整依赖管理流程', async () => {
      // 1. 获取依赖
      const deps = await getPluginDependencies('plugin_chart_view')
      expect(Array.isArray(deps)).toBe(true)

      // 2. 检查依赖
      const check = await checkDependencies('plugin_chart_view')
      expect(check.satisfied).toBeDefined()

      // 3. 构建依赖图
      const graph = await buildDependencyGraph(['plugin_chart_view'])
      expect(Array.isArray(graph)).toBe(true)

      // 4. 解析依赖
      const resolution = await resolveDependencies('plugin_chart_view')
      expect(resolution.resolved).toBeDefined()
    })
  })
})

console.log('✅ v2.4.0 测试框架就绪')
