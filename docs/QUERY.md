# 高级查询功能使用指南

**版本：** v1.5.0+  
**最后更新：** 2026-03-20

---

## 🔍 查询构建器

### 什么是查询构建器

查询构建器是一个可视化的 SQL 生成工具，无需手写 SQL 即可构建复杂查询。

### 使用步骤

**1. 选择表**
- 点击要查询的表
- 自动加载表结构

**2. 选择列**
- 点击要查询的列
- 支持多选
- 支持 * (所有列)

**3. 添加 JOIN**
- 选择要 JOIN 的表
- 配置 JOIN 类型 (INNER/LEFT/RIGHT)
- 配置 JOIN 条件

**4. 添加条件**
- WHERE 条件
- GROUP BY 分组
- HAVING 分组过滤
- ORDER BY 排序

**5. 预览和执行**
- 实时预览生成的 SQL
- 一键执行查询
- 复制 SQL 到剪贴板

### 查询模板

**内置模板：**
- 📊 COUNT 统计 - 快速统计行数
- 📄 分页查询 - 带 LIMIT/OFFSET
- 🔍 条件查询 - 带 WHERE 条件
- 📈 排序查询 - 带 ORDER BY
- 📉 分组统计 - 带 GROUP BY

---

## 📥 查询历史

### 自动保存

**保存的内容：**
- SQL 语句
- 执行时间
- 返回行数
- 执行状态 (成功/失败)
- 错误信息

### 搜索历史

**搜索方式：**
- 按 SQL 内容搜索
- 按数据库搜索
- 按执行时间筛选

### 导出历史

**支持的格式：**
- JSON - 完整数据结构
- CSV - 表格格式
- SQL - 可执行的 SQL 脚本

**导出步骤：**
1. 点击"导出"按钮
2. 选择导出格式
3. 自动下载文件

### 清空历史

**清空所有历史：**
1. 点击"清空"按钮
2. 确认操作
3. 历史记录被清除

---

## ⭐ 查询收藏

### 添加收藏

**步骤：**
1. 点击"添加收藏"按钮
2. 填写收藏信息
   - 名称 (必填)
   - SQL (必填)
   - 分类 (可选)
   - 描述 (可选)
   - 标签 (可选，逗号分隔)
3. 点击"保存"

### 搜索收藏

**搜索方式：**
- 按名称搜索
- 按 SQL 内容搜索
- 按分类搜索
- 按标签搜索

### 使用收藏

**步骤：**
1. 找到要使用的收藏
2. 点击"使用"按钮
3. 自动跳转到查询页面并填充 SQL

### 导出收藏

**导出格式：**
- JSON - 可导入的格式

**导出步骤：**
1. 点击"导出"按钮
2. 下载 JSON 文件

### 导入收藏

**导入步骤：**
1. 准备 JSON 文件
2. 在查询页面执行导入 (待实现)

---

## 💡 使用技巧

### 构建复杂查询

**多表 JOIN：**
```sql
SELECT users.id, users.name, posts.title, comments.content
FROM users
LEFT JOIN posts ON users.id = posts.user_id
LEFT JOIN comments ON posts.id = comments.post_id
WHERE users.status = 'active'
ORDER BY posts.created_at DESC
LIMIT 100
```

**分组统计：**
```sql
SELECT user_id, COUNT(*) as count, AVG(amount) as avg
FROM orders
GROUP BY user_id
HAVING COUNT(*) > 5
ORDER BY count DESC
```

### 常用查询模式

**分页查询：**
```sql
SELECT * FROM users
ORDER BY created_at DESC
LIMIT 20 OFFSET 0
```

**条件查询：**
```sql
SELECT * FROM users
WHERE status = 'active'
  AND created_at >= '2026-01-01'
ORDER BY id DESC
```

**统计查询：**
```sql
SELECT 
  status,
  COUNT(*) as count,
  AVG(age) as avg_age
FROM users
GROUP BY status
```

---

## ⚠️ 注意事项

### 性能建议

**大数据量查询：**
- 使用 LIMIT 限制返回行数
- 添加 WHERE 条件过滤
- 使用索引列进行过滤
- 避免 SELECT *

**复杂 JOIN：**
- 确保 JOIN 列有索引
- 避免多表循环 JOIN
- 考虑使用子查询

### 安全建议

**SQL 注入防护：**
- 查询构建器自动转义值
- 手动编写 SQL 时注意转义
- 不要直接拼接用户输入

**权限控制：**
- 只查询有权限的表
- 避免执行 DROP/TRUNCATE
- 生产环境谨慎执行 UPDATE/DELETE

---

## 🐛 常见问题

### Q: 查询构建器生成的 SQL 执行失败？

**A:** 检查：
1. 表名和列名是否正确
2. JOIN 条件是否完整
3. 数据类型是否匹配
4. 权限是否足够

### Q: 历史记录找不到？

**A:** 检查：
1. 搜索关键词是否正确
2. 时间范围是否合适
3. 是否被清空

### Q: 收藏无法导出？

**A:** 确保：
1. 至少有一个收藏
2. 浏览器允许下载
3. 存储空间足够

---

## 📝 更新日志

### v1.5.0 (2026-03-20)
- ✅ 可视化查询构建器
- ✅ 查询历史记录
- ✅ 查询收藏功能
- ✅ 查询模板
- ✅ 导出功能

---

<div align="center">
  <strong>🔍 DBManager v1.5.0 - 高级查询功能使用指南</strong>
</div>
