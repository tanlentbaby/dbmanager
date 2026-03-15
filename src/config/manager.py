"""
配置管理器 - 管理数据库连接配置
"""

import json
import os
from pathlib import Path
from typing import Any, Optional
from cryptography.fernet import Fernet


# 配置目录路径
CONFIG_DIR = Path.home() / ".dbmanager"
CONFIG_FILE = CONFIG_DIR / "config.json"
HISTORY_FILE = CONFIG_DIR / "history.json"


class ConfigManager:
    """配置管理器"""

    def __init__(self):
        self.config_dir = CONFIG_DIR
        self.config_file = CONFIG_FILE
        self._encryption_key: Optional[bytes] = None
        self._cipher: Optional[Fernet] = None

        # 确保配置目录存在
        self._ensure_config_dir()

        # 加载配置
        self._config = self._load_config()

    def _ensure_config_dir(self):
        """确保配置目录存在"""
        if not self.config_dir.exists():
            self.config_dir.mkdir(parents=True, mode=0o700)

    def _load_config(self) -> dict:
        """加载配置文件"""
        if not self.config_file.exists():
            return self._default_config()

        try:
            with open(self.config_file, "r", encoding="utf-8") as f:
                return json.load(f)
        except (json.JSONDecodeError, IOError):
            return self._default_config()

    def _default_config(self) -> dict:
        """返回默认配置"""
        return {
            "version": "1.0",
            "default_instance": None,
            "instances": {},
            "settings": {
                "max_display_rows": 100,
                "output_format": "table",
                "show_execution_time": True,
                "syntax_highlight": True,
                "history_size": 1000,
                "connect_timeout": 10,
            },
        }

    def _get_encryption_key(self) -> bytes:
        """获取或生成加密密钥"""
        if self._encryption_key is None:
            key_file = self.config_dir / ".key"
            if key_file.exists():
                with open(key_file, "rb") as f:
                    self._encryption_key = f.read()
            else:
                self._encryption_key = Fernet.generate_key()
                with open(key_file, "wb") as f:
                    f.write(self._encryption_key)
                # 设置密钥文件权限
                os.chmod(key_file, 0o600)
        return self._encryption_key

    def _get_cipher(self) -> Fernet:
        """获取加密器"""
        if self._cipher is None:
            key = self._get_encryption_key()
            self._cipher = Fernet(key)
        return self._cipher

    def encrypt(self, value: str) -> str:
        """加密敏感值"""
        cipher = self._get_cipher()
        encrypted = cipher.encrypt(value.encode())
        return f"enc:{encrypted.decode()}"

    def decrypt(self, value: str) -> str:
        """解密敏感值"""
        if not value.startswith("enc:"):
            return value
        cipher = self._get_cipher()
        encrypted = value[4:]
        decrypted = cipher.decrypt(encrypted.encode())
        return decrypted.decode()

    def save_config(self):
        """保存配置到文件"""
        with open(self.config_file, "w", encoding="utf-8") as f:
            json.dump(self._config, f, indent=2, ensure_ascii=False)
        # 设置配置文件权限
        os.chmod(self.config_file, 0o600)

    def list_configs(self) -> dict[str, dict]:
        """列出所有配置（不包含解密后的密码）"""
        return self._config.get("instances", {})

    def get_config(self, name: str) -> Optional[dict]:
        """获取指定配置"""
        instances = self._config.get("instances", {})
        config = instances.get(name)
        if config:
            # 解密密码
            config = config.copy()
            if "password" in config:
                config["password"] = self.decrypt(config["password"])
        return config

    def add_config(
        self,
        name: str,
        db_type: str,
        host: str,
        port: int,
        username: str,
        password: str,
        database: str = "",
        **kwargs: Any,
    ) -> bool:
        """添加配置"""
        if name in self._config.get("instances", {}):
            return False

        # 加密密码
        encrypted_password = self.encrypt(password)

        config = {
            "type": db_type,
            "host": host,
            "port": port,
            "username": username,
            "password": encrypted_password,
            "database": database,
            **kwargs,
        }

        self._config.setdefault("instances", {})[name] = config
        self.save_config()
        return True

    def update_config(self, name: str, **updates: Any) -> bool:
        """更新配置"""
        instances = self._config.get("instances", {})
        if name not in instances:
            return False

        config = instances[name]

        # 如果更新了密码，需要加密
        if "password" in updates:
            updates["password"] = self.encrypt(updates["password"])

        config.update(updates)
        self.save_config()
        return True

    def remove_config(self, name: str) -> bool:
        """删除配置"""
        instances = self._config.get("instances", {})
        if name not in instances:
            return False

        del instances[name]
        self.save_config()
        return True

    def get_default_instance(self) -> Optional[str]:
        """获取默认实例名"""
        return self._config.get("default_instance")

    def set_default_instance(self, name: str) -> bool:
        """设置默认实例"""
        if name not in self._config.get("instances", {}):
            return False
        self._config["default_instance"] = name
        self.save_config()
        return True

    @property
    def settings(self) -> dict:
        """获取设置"""
        return self._config.get("settings", {})

    def update_settings(self, **updates: Any):
        """更新设置"""
        self._config.setdefault("settings", {}).update(updates)
        self.save_config()
