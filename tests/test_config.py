"""
测试配置管理器
"""

import pytest
from src.config.manager import ConfigManager


class TestConfigManager:
    """测试 ConfigManager"""

    def test_default_config(self):
        """测试默认配置"""
        manager = ConfigManager()
        assert manager.settings.get("max_display_rows") == 100
        assert manager.settings.get("output_format") == "table"

    def test_encrypt_decrypt(self):
        """测试加密解密"""
        manager = ConfigManager()
        password = "test_password_123"
        encrypted = manager.encrypt(password)
        decrypted = manager.decrypt(encrypted)
        assert decrypted == password

    def test_encrypt_prefix(self):
        """测试加密前缀"""
        manager = ConfigManager()
        encrypted = manager.encrypt("test")
        assert encrypted.startswith("enc:")

    def test_decrypt_non_encrypted(self):
        """测试解密非加密值"""
        manager = ConfigManager()
        value = "plain_text"
        assert manager.decrypt(value) == value


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
