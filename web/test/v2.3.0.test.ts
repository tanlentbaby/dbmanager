/**
 * v2.3.0 第三方插件支持测试
 */

import { describe, it, expect } from 'vitest'
import {
  getThirdPartyMarketplace,
  submitPlugin,
  getDeveloperInfo,
  submitPluginReview,
  validatePluginPackage,
  getPluginSDKInfo,
} from '../../web/src/lib/thirdPartyPlugins'
import {
  getPluginTemplates,
  createPluginProject,
  generatePluginDocumentation,
  validatePluginProject,
  packagePlugin,
  getDeveloperDocumentation,
} from '../../web/src/lib/pluginDevTools'

describe('v2.3.0 第三方插件支持', () => {
  // ==================== 第三方插件测试 ====================
  describe('第三方插件', () => {
    it '获取第三方市场数据', async () => {
      const plugins = await getThirdPartyMarketplace()
      expect(plugins.length).toBeGreaterThan(0)
      expect(plugins.every((p) => p.id)).toBe(true)
      expect(plugins.every((p) => p.name)).toBe(true)
    })

    it '提交插件', async () => {
      const submission = await submitPlugin({
        pluginId: 'plugin_test',
        name: 'Test Plugin',
        version: '1.0.0',
        author: 'Test Author',
        authorEmail: 'test@example.com',
        description: 'Test description',
        category: '工具',
        tags: ['test'],
        downloadUrl: 'https://example.com/plugin',
        license: 'MIT',
      })

      expect(submission.id).toBeDefined()
      expect(submission.status).toBe('pending')
    })

    it '获取开发者信息', async () => {
      const developer = await getDeveloperInfo('dev_123')
      expect(developer).toBeDefined()
      expect(developer?.name).toBeDefined()
      expect(developer?.email).toBeDefined()
    })

    it '提交插件评价', async () => {
      const review = await submitPluginReview({
        pluginId: 'plugin_test',
        reviewer: 'User123',
        rating: 5,
        comment: 'Great plugin!',
      })

      expect(review.id).toBeDefined()
      expect(review.rating).toBe(5)
    })

    it '验证插件包', async () => {
      const result = await validatePluginPackage('/path/to/plugin.zip')
      expect(result).toBeDefined()
      expect('valid' in result).toBe(true)
    })

    it '获取 SDK 信息', () => {
      const sdk = getPluginSDKInfo()
      expect(sdk.version).toBeDefined()
      expect(sdk.apis.length).toBeGreaterThan(0)
      expect(sdk.hooks.length).toBeGreaterThan(0)
    })
  })

  // ==================== 开发者工具测试 ====================
  describe('开发者工具', () => {
    it '获取插件模板', () => {
      const templates = getPluginTemplates()
      expect(templates.length).toBeGreaterThan(0)
      expect(templates.every((t) => t.id)).toBe(true)
      expect(templates.every((t) => t.files)).toBe(true)
    })

    it '创建插件项目', () => {
      const project = createPluginProject('template_basic', 'MyPlugin', 'Test Author')
      expect(project.name).toBe('MyPlugin')
      expect(project.version).toBe('1.0.0')
      expect(project.author).toBe('Test Author')
    })

    it '生成插件文档', () => {
      const project = createPluginProject('template_basic', 'MyPlugin', 'Test Author')
      const doc = generatePluginDocumentation(project)

      expect(doc).toContain('# MyPlugin')
      expect(doc).toContain('## 概述')
      expect(doc).toContain('## 安装')
    })

    it '验证插件项目', () => {
      const validProject = createPluginProject('template_basic', 'MyPlugin', 'Test Author')
      const validResult = validatePluginProject(validProject)
      expect(validResult.valid).toBe(true)

      const invalidProject = { ...validProject, name: '', version: 'invalid' }
      const invalidResult = validatePluginProject(invalidProject)
      expect(invalidResult.valid).toBe(false)
      expect(invalidResult.errors.length).toBeGreaterThan(0)
    })

    it '打包插件', async () => {
      const project = createPluginProject('template_basic', 'MyPlugin', 'Test Author')
      const result = await packagePlugin(project)

      expect(result.success).toBe(true)
      expect(result.packagePath).toBeDefined()
    })

    it '获取开发文档', () => {
      const doc = getDeveloperDocumentation()
      expect(doc).toContain('# DBManager 插件开发文档')
      expect(doc).toContain('## SDK 版本')
      expect(doc).toContain('## APIs')
    })
  })

  // ==================== 集成测试 ====================
  describe('集成测试', () => {
    it '完整开发者流程', async () => {
      // 1. 获取模板
      const templates = getPluginTemplates()
      expect(templates.length).toBeGreaterThan(0)

      // 2. 创建项目
      const project = createPluginProject(templates[0].id, 'TestPlugin', 'Developer')
      expect(project.name).toBe('TestPlugin')

      // 3. 验证项目
      const validation = validatePluginProject(project)
      expect(validation.valid).toBe(true)

      // 4. 生成文档
      const doc = generatePluginDocumentation(project)
      expect(doc).toContain('TestPlugin')

      // 5. 打包
      const packaged = await packagePlugin(project)
      expect(packaged.success).toBe(true)

      // 6. 发布
      expect(packaged.packagePath).toBeDefined()
    })

    it '完整用户流程', async () => {
      // 1. 浏览市场
      const plugins = await getThirdPartyMarketplace()
      expect(plugins.length).toBeGreaterThan(0)

      // 2. 查看插件详情
      const plugin = plugins[0]
      expect(plugin.name).toBeDefined()

      // 3. 获取评价
      const reviews = await getPluginReviews(plugin.id)
      expect(Array.isArray(reviews)).toBe(true)

      // 4. 提交评价
      const review = await submitPluginReview({
        pluginId: plugin.id,
        reviewer: 'User',
        rating: 5,
      })
      expect(review.rating).toBe(5)
    })
  })
})

console.log('✅ v2.3.0 测试框架就绪')
