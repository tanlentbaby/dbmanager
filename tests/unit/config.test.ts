/**
 * ConfigManager 单元测试
 * 注意：由于 keytar 需要系统密钥链，部分测试在 CI 环境中可能失败
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { ConfigManager } from '../../src/ts/config/manager.js';

describe('ConfigManager', () => {
  let configManager: ConfigManager;

  beforeEach(() => {
    configManager = new ConfigManager();
  });

  describe('listConfigs', () => {
    it('应该返回对象（可能包含之前的配置）', () => {
      const configs = configManager.listConfigs();
      expect(typeof configs).toBe('object');
    });
  });

  describe('getConfig', () => {
    it('应该返回 undefined 当配置不存在时', async () => {
      const config = await configManager.getConfig('nonexistent-config-test');
      expect(config).toBeUndefined();
    });
  });

  describe('removeConfig', () => {
    it('不应该删除不存在的配置', async () => {
      const result = await configManager.removeConfig('nonexistent-config-test-2');
      expect(result).toBe(false);
    });
  });
});
