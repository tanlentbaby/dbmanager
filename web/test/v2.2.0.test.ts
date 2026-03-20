/**
 * v2.2.0 插件生态系统测试
 */

import { describe, it, expect } from 'vitest'
import {
  getPluginMarketplace,
  getInstalledPlugins,
  installPlugin,
  uninstallPlugin,
  togglePlugin,
  checkPluginUpdates,
  searchPlugins,
  getPluginStats,
} from '../../web/src/lib/pluginManager'

describe('v2.2.0 插件生态系统', () => {
  // ==================== 插件市场测试 ====================
  describe('插件市场', () => {
    it '获取市场数据', async () => {
      const marketplace = await getPluginMarketplace()
      expect(marketplace.plugins.length).toBeGreaterThan(0)
      expect(marketplace.categories.length).toBeGreaterThan(0)
      expect(marketplace.totalPlugins).toBeGreaterThan(0)
    })

    it '获取已安装插件', () => {
      const installed = getInstalledPlugins()
      expect(Array.isArray(installed)).toBe(true)
      expect(installed.every((p) => p.installed)).toBe(true)
    })

    it '获取插件统计', () => {
      const stats = getPluginStats()
      expect(stats.totalPlugins).toBeGreaterThan(0)
      expect(stats.installedPlugins).toBeGreaterThanOrEqual(0)
      expect(stats.enabledPlugins).toBeGreaterThanOrEqual(0)
      expect(stats.avgRating).toBeGreaterThan(0)
    })

    it '搜索插件', async () => {
      const results = await searchPlugins('导出')
      expect(Array.isArray(results)).toBe(true)
      
      if (results.length > 0) {
        expect(
          results.some(
            (p) =>
              p.name.toLowerCase().includes('导出') ||
              p.description.toLowerCase().includes('导出')
          )
        ).toBe(true)
      }
    })

    it '按分类搜索', async () => {
      const marketplace = await getPluginMarketplace()
      if (marketplace.categories.length > 0) {
        const results = await searchPlugins('', marketplace.categories[0])
        expect(results.every((p) => p.category === marketplace.categories[0])).toBe(true)
      }
    })
  })

  // ==================== 插件安装测试 ====================
  describe('插件安装', () => {
    it '安装插件', async () => {
      const marketplace = await getPluginMarketplace()
      const notInstalled = marketplace.plugins.find((p) => !p.installed)
      
      if (notInstalled) {
        const plugin = await installPlugin({ pluginId: notInstalled.id })
        expect(plugin.installed).toBe(true)
      }
    })

    it '卸载插件', async () => {
      const installed = getInstalledPlugins()
      if (installed.length > 0) {
        const result = await uninstallPlugin(installed[0].id)
        expect(result).toBe(true)
      }
    })

    it '切换插件状态', async () => {
      const installed = getInstalledPlugins()
      if (installed.length > 0) {
        const result = await togglePlugin(installed[0].id, !installed[0].enabled)
        expect(result).toBe(true)
      }
    })

    it '检查插件更新', async () => {
      const updates = await checkPluginUpdates()
      expect(Array.isArray(updates)).toBe(true)
      
      if (updates.length > 0) {
        const update = updates[0]
        expect(update.pluginId).toBeDefined()
        expect(update.currentVersion).toBeDefined()
        expect(update.newVersion).toBeDefined()
        expect(update.changelog).toBeDefined()
      }
    })
  })

  // ==================== 集成测试 ====================
  describe('集成测试', () => {
    it '完整插件管理流程', async () => {
      // 1. 获取市场数据
      const marketplace = await getPluginMarketplace()
      expect(marketplace.plugins.length).toBeGreaterThan(0)

      // 2. 搜索插件
      const searchResults = await searchPlugins('图表')
      expect(Array.isArray(searchResults)).toBe(true)

      // 3. 获取统计
      const stats = getPluginStats()
      expect(stats.totalPlugins).toBeGreaterThan(0)

      // 4. 检查更新
      const updates = await checkPluginUpdates()
      expect(Array.isArray(updates)).toBe(true)
    })

    it '插件分类过滤', async () => {
      const marketplace = await getPluginMarketplace()
      
      for (const category of marketplace.categories) {
        const results = await searchPlugins('', category)
        expect(results.every((p) => p.category === category)).toBe(true)
      }
    })
  })
})

console.log('✅ v2.2.0 测试框架就绪')
