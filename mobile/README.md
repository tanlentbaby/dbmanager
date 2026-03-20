# DBManager Mobile v0.9.0 POC

React Native 移动端应用 - 概念验证

## 🚀 快速开始

### 环境要求

- Node.js >= 18
- npm >= 9
- Expo CLI
- iOS Simulator (Mac) 或 Android Emulator

### 安装依赖

```bash
cd mobile
npm install
```

### 启动开发服务器

```bash
npm start
```

### 运行平台

```bash
# iOS
npm run ios

# Android
npm run android

# Web
npm run web
```

## 📱 功能特性

### 已完成

- ✅ 主页导航
- ✅ 查询执行界面
- ✅ 书签管理界面
- ✅ 历史记录界面
- ✅ 数据库连接界面
- ✅ 设置页面
- ✅ 主题切换 (深色/浅色/自动)
- ✅ API 客户端封装
- ✅ React Query 数据管理

### 待实现

- ⬜ 真实 API 集成
- ⬜ 离线缓存
- ⬜ 推送通知
- ⬜ 生物识别认证
- ⬜ 横屏适配

## 🏗️ 项目结构

```
mobile/
├── App.tsx                 # 应用入口
├── app.json               # Expo 配置
├── package.json           # 依赖配置
├── tsconfig.json          # TypeScript 配置
├── src/
│   ├── api/               # API 客户端
│   ├── config/            # 配置文件
│   ├── context/           # React Context
│   ├── navigation/        # 导航配置
│   ├── screens/           # 页面组件
│   └── components/        # 可复用组件
└── assets/                # 静态资源
```

## 🎨 技术栈

- **React Native** 0.73
- **Expo** ~50.0
- **TypeScript**
- **React Navigation** 6
- **React Query** 5
- **Axios**

## 📊 截图

### 主页
```
┌─────────────────────────┐
│   DBManager             │
│   移动端 v0.9.0         │
├─────────────────────────┤
│ 📝 执行查询             │
│    编写和执行 SQL 查询   │
├─────────────────────────┤
│ 🔖 书签                 │
│    管理常用查询         │
├─────────────────────────┤
│ 📜 历史记录             │
│    查看查询历史         │
├─────────────────────────┤
│ 🔌 连接数据库           │
│    添加数据库连接       │
├─────────────────────────┤
│ ⚙️ 设置                 │
│    应用配置             │
└─────────────────────────┘
```

## 🔧 开发

### 添加新页面

1. 在 `src/screens/` 创建新组件
2. 在 `src/navigation/AppNavigator.tsx` 添加路由
3. 在主页添加导航入口

### API 集成

编辑 `src/api/index.ts` 添加新的 API 方法

### 主题定制

编辑 `src/context/ThemeContext.tsx` 修改颜色配置

## 📝 注意事项

- 这是 POC 版本，用于验证技术可行性
- 部分功能使用模拟数据
- 生产环境需要完善错误处理和安全性

## 📄 许可证

MIT
