#!/usr/bin/env python3
"""
DBManager setup script
"""

from setuptools import setup, find_packages

# 读取版本
def get_version():
    with open("src/__init__.py", "r", encoding="utf-8") as f:
        for line in f:
            if line.startswith("__version__"):
                return line.split("=")[1].strip().strip('"')
    return "0.0.0"

# 读取 README
def get_long_description():
    try:
        with open("README.md", "r", encoding="utf-8") as f:
            return f.read()
    except:
        return ""

# 读取依赖
def get_requirements():
    try:
        with open("requirements.txt", "r", encoding="utf-8") as f:
            return [
                line.strip()
                for line in f
                if line.strip() and not line.startswith("#")
            ]
    except:
        return []

setup(
    name="dbmanager",
    version=get_version(),
    author="DBManager Team",
    author_email="team@dbmanager.dev",
    description="交互式数据库管理命令行工具",
    long_description=get_long_description(),
    long_description_content_type="text/markdown",
    url="https://github.com/xxx/dbmanager",
    packages=find_packages(),
    classifiers=[
        "Development Status :: 3 - Alpha",
        "Environment :: Console",
        "Intended Audience :: Developers",
        "Intended Audience :: System Administrators",
        "License :: OSI Approved :: MIT License",
        "Operating System :: OS Independent",
        "Programming Language :: Python :: 3",
        "Programming Language :: Python :: 3.9",
        "Programming Language :: Python :: 3.10",
        "Programming Language :: Python :: 3.11",
        "Programming Language :: Python :: 3.12",
        "Topic :: Database",
        "Topic :: Database :: Front-Ends",
    ],
    python_requires=">=3.9",
    install_requires=get_requirements(),
    entry_points={
        "console_scripts": [
            "dbmanager=src.main:main",
            "dbm=src.main:main",  # 简写
        ],
    },
    keywords="database cli mysql postgresql sqlite admin",
)
