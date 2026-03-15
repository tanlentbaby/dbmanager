#!/usr/bin/env node
/**
 * DBManager 验证脚本 - 第 1 轮验证
 * 验证 TypeScript 版本的核心功能
 */

import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = __dirname;  // 项目根目录是当前目录
const DBM_PATH = join(PROJECT_ROOT, 'dist/main.js');

console.log('╔══════════════════════════════════════════════════════════╗');
console.log('║         DBManager TypeScript 版本 - 第 1 轮验证           ║');
console.log('╚══════════════════════════════════════════════════════════╝\n');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`✓ ${name}`);
    passed++;
  } catch (error) {
    console.log(`✗ ${name}`);
    console.log(`  错误：${error.message}`);
    failed++;
  }
}

// 测试 1: 帮助命令
test('帮助命令 (--help)', () => {
  const output = execSync(`node ${DBM_PATH} --help`, { encoding: 'utf-8' });
  if (!output.includes('DBManager')) throw new Error('未包含 DBManager');
  if (!output.includes('/help')) throw new Error('未包含/help 命令');
});

// 测试 2: 版本命令
test('版本命令 (--version)', () => {
  const output = execSync(`node ${DBM_PATH} --version`, { encoding: 'utf-8' });
  if (!output.includes('v0.2.0')) throw new Error('版本号不正确');
});

// 测试 3: 构建验证
test('TypeScript 编译输出存在', () => {
  const files = [
    'dist/main.js',
    'dist/app.js',
    'dist/types.js',
    'dist/cli/commands.js',
    'dist/config/manager.js',
    'dist/database/connection.js',
    'dist/utils/formatter.js'
  ];
  for (const file of files) {
    const fullPath = join(PROJECT_ROOT, file);
    if (!fs.existsSync(fullPath)) {
      throw new Error(`文件不存在：${file}`);
    }
  }
});

// 测试 4: 类型定义存在
test('TypeScript 类型定义存在', () => {
  const files = [
    'dist/main.d.ts',
    'dist/app.d.ts',
    'dist/types.d.ts'
  ];
  for (const file of files) {
    const fullPath = join(PROJECT_ROOT, file);
    if (!fs.existsSync(fullPath)) {
      throw new Error(`类型文件不存在：${file}`);
    }
  }
});

// 测试 5: package.json 验证
test('package.json 配置正确', () => {
  const pkg = JSON.parse(fs.readFileSync(join(PROJECT_ROOT, 'package.json'), 'utf-8'));
  if (pkg.name !== 'dbmanager') throw new Error('name 不正确');
  if (!pkg.dependencies.ink) throw new Error('缺少 ink 依赖');
  if (!pkg.dependencies.react) throw new Error('缺少 react 依赖');
  if (pkg.type !== 'module') throw new Error('不是 ESM 模块');
});

// 测试 6: tsconfig.json 验证
test('tsconfig.json 配置正确', () => {
  const tsconfig = JSON.parse(fs.readFileSync(join(PROJECT_ROOT, 'tsconfig.json'), 'utf-8'));
  if (tsconfig.compilerOptions.jsx !== 'react-jsx') throw new Error('JSX 配置不正确');
  if (tsconfig.compilerOptions.module !== 'NodeNext') throw new Error('模块配置不正确');
});

console.log('\n' + '═'.repeat(60));
console.log(`验证结果：${passed} 通过，${failed} 失败`);
console.log('═'.repeat(60));

if (failed === 0) {
  console.log('\n✓ 第 1 轮验证通过！\n');
  process.exit(0);
} else {
  console.log(`\n✗ 第 1 轮验证失败\n`);
  process.exit(1);
}
