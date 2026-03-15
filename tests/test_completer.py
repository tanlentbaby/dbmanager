"""
测试 SQL 补全器
"""

import pytest
from unittest.mock import Mock
from prompt_toolkit.document import Document
from src.cli.completer import SQLCompleter


class TestSQLCompleter:
    """测试 SQLCompleter"""

    def setup_method(self):
        """测试前准备"""
        self.mock_connection_manager = Mock()
        self.mock_config_manager = Mock()
        self.completer = SQLCompleter(
            self.mock_connection_manager,
            self.mock_config_manager,
        )

    def test_command_completion(self):
        """测试命令补全"""
        doc = Document(text="/con", cursor_position=4)
        completions = list(self.completer.get_completions(doc, None))

        assert len(completions) > 0
        assert any(c.text == "connect" for c in completions)
        assert any(c.text == "config" for c in completions)

    def test_command_completion_empty(self):
        """测试空命令补全"""
        doc = Document(text="/", cursor_position=1)
        completions = list(self.completer.get_completions(doc, None))

        assert len(completions) > 0

    def test_keyword_completion(self):
        """测试关键字补全"""
        doc = Document(text="SEL", cursor_position=3)
        completions = list(self.completer.get_completions(doc, None))

        assert any(c.text == "SELECT" for c in completions)

    def test_keyword_completion_from(self):
        """测试 FROM 关键字补全"""
        doc = Document(text="WHE", cursor_position=3)
        completions = list(self.completer.get_completions(doc, None))

        assert any(c.text == "WHERE" for c in completions)

    def test_get_word_before_cursor(self):
        """测试获取光标前单词"""
        text = "SELECT * FROM users"
        assert self.completer._get_word_before_cursor(text, 7) == "*"
        assert self.completer._get_word_before_cursor(text, 14) == "FROM"
        assert self.completer._get_word_before_cursor(text, 21) == "users"

    def test_is_command_context(self):
        """测试命令上下文判断"""
        assert self.completer._is_command_context("/config", 5) is True
        assert self.completer._is_command_context("SELECT", 6) is False
        assert self.completer._is_command_context("  /help", 6) is True


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
