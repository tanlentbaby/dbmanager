# 数据导入导出指南

**版本：** v1.3.0+  
**最后更新：** 2026-03-20

---

## 📤 导出功能

### 快速开始

**从查询结果导出：**

1. 执行 SQL 查询
2. 在结果页面底部找到导入导出组件
3. 点击要导出的格式按钮
4. 文件自动下载

### 支持的导出格式

| 格式 | 扩展名 | 使用场景 | 示例 |
|------|--------|----------|------|
| CSV | .csv | 数据交换/导入其他系统 | `users.csv` |
| JSON | .json | 程序间数据传输 | `users.json` |
| Excel | .xlsx | 办公场景/数据分析 | `users.xlsx` |
| SQL | .sql | 数据库迁移/备份 | `users.sql` |

### 导出示例

#### CSV 导出

**数据：**
```json
[
  { "id": 1, "name": "Alice", "email": "alice@example.com" },
  { "id": 2, "name": "Bob", "email": "bob@example.com" }
]
```

**导出结果：**
```csv
id,name,email
1,Alice,alice@example.com
2,Bob,bob@example.com
```

#### JSON 导出

**导出结果：**
```json
[
  {
    "id": 1,
    "name": "Alice",
    "email": "alice@example.com"
  },
  {
    "id": 2,
    "name": "Bob",
    "email": "bob@example.com"
  }
]
```

#### Excel 导出

**导出结果：**
- 创建 Excel 工作簿
- 第一个工作表名为 "Data"
- 第一行为列名
- 后续行为数据

#### SQL 导出

**数据：**
```json
[
  { "id": 1, "name": "Alice" },
  { "id": 2, "name": "Bob" }
]
```

**导出结果 (表名：users)：**
```sql
INSERT INTO users (id, name) VALUES (1, 'Alice');
INSERT INTO users (id, name) VALUES (2, 'Bob');
```

---

## 📥 导入功能

### 快速开始

**导入数据：**

1. 点击"选择文件"按钮
2. 选择要导入的文件
3. 文件自动解析
4. 查看导入结果

### 支持的文件格式

| 格式 | 扩展名 | 最大支持 | 推荐大小 |
|------|--------|----------|----------|
| CSV | .csv | 100 万 + 行 | < 50MB |
| JSON | .json | 10 万 + 行 | < 50MB |
| Excel | .xlsx/.xls | 10 万 + 行 | < 50MB |

### 导入要求

**CSV 文件：**
- 第一行必须是列名
- UTF-8 编码
- 逗号分隔

**JSON 文件：**
- 必须是数组格式
- 每个元素是对象
- 有效的 JSON 语法

**Excel 文件：**
- 读取第一个工作表
- 第一行必须是列名
- 支持 .xlsx 和 .xls

### 导入示例

#### CSV 导入

**文件内容：**
```csv
id,name,email
1,Alice,alice@example.com
2,Bob,bob@example.com
```

**导入结果：**
```json
[
  { "id": 1, "name": "Alice", "email": "alice@example.com" },
  { "id": 2, "name": "Bob", "email": "bob@example.com" }
]
```

#### JSON 导入

**文件内容：**
```json
[
  { "id": 1, "name": "Alice", "email": "alice@example.com" },
  { "id": 2, "name": "Bob", "email": "bob@example.com" }
]
```

**导入结果：** 同上

---

## 🔧 编程使用

### 导入库

```typescript
import {
  exportData,
  importData,
  exportToCSV,
  exportToJSON,
  exportToExcel,
  exportToSQL,
  importFromCSV,
  importFromJSON,
  importFromExcel,
  getSupportedFormats,
  getExportFormats,
} from '@/lib/importExport'
```

### 导出示例

```typescript
// 导出为 CSV
exportToCSV(data, 'export.csv')

// 导出为 JSON
exportToJSON(data, 'export.json')

// 导出为 Excel
exportToExcel(data, 'export.xlsx')

// 导出为 SQL
exportToSQL(data, 'users', 'export.sql')

// 通用导出函数
exportData({
  format: 'csv',
  data,
  filename: 'export.csv',
})
```

### 导入示例

```typescript
// 从文件导入
const fileInput = document.querySelector('input[type="file"]')
fileInput?.addEventListener('change', async (e) => {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return

  try {
    const result = await importData(file)
    console.log('导入成功:', result.rowCount, '行')
    console.log('列:', result.columns)
    console.log('数据:', result.data)
  } catch (error) {
    console.error('导入失败:', error)
  }
})

// 特定格式导入
const csvResult = await importFromCSV(file)
const jsonResult = await importFromJSON(file)
const excelResult = await importFromExcel(file)
```

---

## ⚠️ 注意事项

### 性能建议

**大数据量导出：**
- 10 万行以内：直接导出
- 10 万 -100 万行：建议分批导出
- 100 万行以上：考虑服务器端导出

**大数据量导入：**
- 建议分批导入
- 注意内存占用
- 考虑使用事务

### 数据格式

**字符串转义：**
- SQL 导出会自动转义单引号
- CSV 导出会自动添加引号
- JSON 导出使用标准 JSON 转义

**NULL 值处理：**
- NULL 值导出为 `NULL` (SQL) 或空值 (其他格式)
- undefined 值会被跳过

**特殊字符：**
- 换行符、制表符会自动处理
- 中文等非 ASCII 字符使用 UTF-8 编码

### 错误处理

```typescript
try {
  exportData({ format: 'csv', data, filename: 'export.csv' })
} catch (error: any) {
  console.error('导出失败:', error.message)
}

try {
  const result = await importData(file)
} catch (error: any) {
  console.error('导入失败:', error.message)
}
```

---

## 📊 性能指标

### 导出性能

| 数据量 | CSV | JSON | Excel | SQL |
|--------|-----|------|-------|-----|
| 1,000 行 | <1s | <1s | <1s | <1s |
| 10,000 行 | <2s | <2s | <3s | <2s |
| 100,000 行 | <10s | <10s | <15s | <10s |

### 导入性能

| 数据量 | CSV | JSON | Excel |
|--------|-----|------|-------|
| 1,000 行 | <1s | <1s | <1s |
| 10,000 行 | <2s | <2s | <3s |
| 100,000 行 | <10s | <12s | <15s |

---

## 🐛 常见问题

### Q: 导出大文件时浏览器卡顿？

**A:** 建议：
1. 分批导出（每次 10 万行以内）
2. 使用 CSV 格式（性能最好）
3. 避免在导出时进行其他操作

### Q: 导入失败提示"文件格式错误"？

**A:** 检查：
1. 文件扩展名是否正确
2. CSV 第一行是否有列名
3. JSON 是否是有效格式
4. Excel 第一个工作表是否有数据

### Q: SQL 导出后导入失败？

**A:** 注意：
1. 确认表结构匹配
2. 确认表已存在
3. 注意主键冲突
4. 注意外键约束

### Q: 中文乱码？

**A:** 确保：
1. 文件使用 UTF-8 编码保存
2. 数据库连接使用 UTF-8
3. 网页使用 UTF-8 编码

---

## 📝 更新日志

### v1.3.0 (2026-03-20)
- ✅ CSV 导入导出
- ✅ JSON 导入导出
- ✅ Excel 导入导出
- ✅ SQL 脚本导出
- ✅ ImportExport 组件

---

<div align="center">
  <strong>📤 DBManager v1.3.0 - 数据导入导出指南</strong>
</div>
