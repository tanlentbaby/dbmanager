# DBManager Web

Web 界面 - React + Tailwind CSS

## 快速开始

```bash
cd web
npm install
npm run dev
```

访问 http://localhost:3000

## 技术栈

- React 18
- TypeScript
- Tailwind CSS
- Vite
- React Router
- Zustand (状态管理)
- TanStack Query (数据获取)

## 项目结构

```
web/
├── src/
│   ├── components/     # 可复用组件
│   ├── pages/          # 页面组件
│   ├── hooks/          # 自定义 Hooks
│   ├── store/          # Zustand 状态
│   ├── lib/            # 工具库
│   └── App.tsx
├── index.html
├── vite.config.ts
├── tailwind.config.js
└── package.json
```

## 开发

```bash
# 开发模式
npm run dev

# 构建
npm run build

# 预览
npm run preview

# 测试
npm run test
```
