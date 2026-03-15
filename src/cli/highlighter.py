"""
SQL 语法高亮器
"""

import re
from typing import List, Tuple
from prompt_toolkit.formatted_text import StyleAndTextTuples
from prompt_toolkit.lexers import Lexer


# SQL 关键字分类
SQL_KEYWORDS = {
    # 子句关键字 - 蓝色
    "blue": [
        "SELECT", "FROM", "WHERE", "GROUP", "BY", "HAVING", "ORDER",
        "LIMIT", "OFFSET", "UNION", "INTERSECT", "EXCEPT",
        "INSERT", "INTO", "VALUES", "UPDATE", "DELETE", "REPLACE",
        "CREATE", "ALTER", "DROP", "TRUNCATE",
        "TABLE", "INDEX", "VIEW", "DATABASE",
        "JOIN", "INNER", "LEFT", "RIGHT", "OUTER", "CROSS", "NATURAL",
        "ON", "USING",
    ],
    # 条件关键字 - 紫色
    "purple": [
        "AND", "OR", "NOT", "IN", "EXISTS", "BETWEEN", "LIKE", "ILIKE",
        "IS", "NULL", "TRUE", "FALSE",
        "REGEXP", "RLIKE", "SIMILAR", "TO",
    ],
    # 函数和聚合 - 青色
    "cyan": [
        "COUNT", "SUM", "AVG", "MAX", "MIN", "GROUP_CONCAT",
        "CAST", "CONVERT", "COALESCE", "NULLIF",
        "DISTINCT", "ALL", "ANY", "SOME",
        "ASC", "DESC",
    ],
    # 其他关键字 - 默认色
    "default": [
        "AS", "CASE", "WHEN", "THEN", "ELSE", "END",
        "DEFAULT", "PRIMARY", "KEY", "FOREIGN", "REFERENCES",
        "CONSTRAINT", "UNIQUE", "CHECK",
        "SET", "SHOW", "DESCRIBE", "EXPLAIN", "USE",
        "COMMIT", "ROLLBACK", "START", "TRANSACTION",
        "RETURNING", "CONFLICT", "DO", "NOTHING",
    ],
}

# 构建关键字正则
def _build_keyword_pattern() -> re.Pattern:
    """构建关键字匹配正则"""
    all_keywords = []
    for color, keywords in SQL_KEYWORDS.items():
        all_keywords.extend(keywords)

    # 按长度降序排序，优先匹配长的关键字
    all_keywords.sort(key=len, reverse=True)

    # 构建正则：\b(KEYWORD)\b
    pattern = r'\b(' + '|'.join(all_keywords) + r')\b'
    return re.compile(pattern, re.IGNORECASE)


KEYWORD_PATTERN = _build_keyword_pattern()

# 字符串模式（单引号、双引号）
STRING_PATTERN = re.compile(r"('[^']*'|\"[^\"]*\")")

# 数字模式
NUMBER_PATTERN = re.compile(r'\b\d+(\.\d+)?\b')

# 注释模式（单行 -- 和多行 /* */）
COMMENT_PATTERN = re.compile(r'(--[^\n]*|/\*.*?\*/)', re.DOTALL)

# 标识符（表名、列名）- 反引号或方括号包裹
IDENTIFIER_PATTERN = re.compile(r'(`[^`]+`|\[[^\]]+\])')


class SimpleSQLLexer(Lexer):
    """简化的 SQL 语法高亮器 - 用于性能敏感场景"""

    def __init__(self):
        # 构建关键字字典（用于快速查找）
        self._keyword_styles = {}
        for color, keywords in SQL_KEYWORDS.items():
            style = f"ansiblue" if color == "blue" else \
                    "ansimagenta" if color == "purple" else \
                    "ansicyan" if color == "cyan" else "ansiwhite"
            for kw in keywords:
                self._keyword_styles[kw.upper()] = style

    def lex_document(self, document):
        """返回一个函数，该函数给定行号返回该行的样式化文本"""
        def get_line(lineno):
            text = document.lines[lineno] if lineno < len(document.lines) else ""
            return self.lex(text)
        return get_line

    def lex(self, text: str) -> StyleAndTextTuples:
        """简单的词法分析"""
        result: List[Tuple[str, str]] = []

        # 使用正则分割文本
        tokens = re.split(r"(\s+|[(),=;<>!+\-*/])", text)

        for token in tokens:
            if not token:
                continue

            # 检查是否是字符串
            if (token.startswith("'") and token.endswith("'")) or \
               (token.startswith('"') and token.endswith('"')):
                result.append(('ansiyellow', token))

            # 检查是否是数字
            elif re.match(r'^\d+(\.\d+)?$', token):
                result.append(('ansigreen', token))

            # 检查是否是注释
            elif token.startswith('--'):
                result.append(('ansilightgray italic', token))

            # 检查是否是大写关键字
            elif token.upper() in self._keyword_styles:
                result.append((self._keyword_styles[token.upper()], token))

            # 其他（普通文本）
            else:
                result.append(('', token))

        return result
