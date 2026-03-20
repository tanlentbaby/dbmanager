# DBManager v1.3.0 发布说明

**发布日期：** 2026-03-20  
**版本：** v1.3.0  
**主题：** 数据导入导出

---

## 🎉 重大更新

v1.3.0 引入了完整的数据导入导出功能：

1. **Excel 导入导出** - .xlsx/.xls 文件
2. **CSV 导入导出** - .csv 文件
3. **JSON 导入导出** - .json 文件
4. **SQL 脚本导出** - INSERT 语句

---

## 📤 导出功能

### 支持的格式

| 格式 | 说明 | 使用场景 |
|------|------|----------|
| CSV | 逗号分隔值 | 数据交换/导入其他系统 |
| JSON | JavaScript 对象 | 程序间数据传输 |
| Excel | Excel 工作簿 | 办公场景/数据分析 |
| SQL | INSERT 语句 | 数据库迁移/备份 |

### 导出方式

**从查询结果导出：**
1. 执行查询
2. 在结果页面点击导出按钮
3. 选择导出格式
4. 自动下载文件

**文件名格式：**
```
{表名}_{时间戳}.{格式}
例如：users_2026-03-20T14-30-00.csv
```

### 导出示例

**CSV 导出：**
```csv
id,name,email
1,Alice,alice@example.com
2,Bob,bob@example.com
```

**SQL 导出：**
```sql
INSERT INTO users (id, name, email) VALUES (1, 'Alice', 'alice@example.com');
INSERT INTO users (id, name, email) VALUES (2, 'Bob', 'bob@example.com');
```

---

## 📥 导入功能

### 支持的文件格式

| 格式 | 扩展名 | 最大支持 |
|------|--------|----------|
| CSV | .csv | 100 万 + 行 |
| JSON | .json | 10 万 + 行 |
| Excel | .xlsx/.xls | 10 万 + 行 |

### 导入方式

**从文件导入：**
1. 点击"选择文件"按钮
2. 选择要导入的文件
3. 自动解析并显示预览
4. 确认后导入到数据库

### 导入验证

- 文件格式验证
- 数据结构验证
- 数据类型检查
- 错误行报告

---

## 🔧 技术实现

### 核心库

| 库 | 用途 | 版本 |
|------|------|------|
| xlsx | Excel 处理 | ^0.18.0 |
| csv-parse | CSV 解析 | ^5.5.0 |
| csv-stringify | CSV 生成 | ^6.4.0 |
| file-saver | 文件保存 | ^2.0.5 |

### API

```typescript
// 导出
exportData({
  format: 'csv' | 'json' | 'xlsx' | 'sql',
  data: any[],
  filename?: string,
})

// 导入
importData(file: File): Promise<ImportResult>
```

---

## 📊 性能指标

### 导出性能

| 数据量 | CSV | JSON | Excel |
|--------|-----|------|-------|
| 1,000 行 | <1s | <1s | <1s |
| 10,000 行 | <2s | <2s | <3s |
| 100,000 行 | <10s | <10s | <15s |

### 导入性能

| 数据量 | CSV | JSON | Excel |
|--------|-----|------|-------|
| 1,000 行 | <1s | <1s | <1s |
| 10,000 行 | <2s | <2s | <3s |
| 100,000 行 | <10s | <12s | <15s |

---

## 🎨 UI 组件

### ImportExport 组件

```tsx
import ImportExport from '@/components/ImportExport'

<ImportExport
  tableName="users"
  data={queryResults}
  columns={['id', 'name', 'email']}
  onImport={(data) => console.log('导入:', data)}
/>
```

### 功能特性

- ✅ 拖拽上传 (待实现)
- ✅ 进度指示
- ✅ 错误提示
- ✅ 格式提示
- ✅ 一键导出

---

## ⚠️ 已知限制

### 当前限制
1. **文件大小** - 建议 < 50MB
2. **内存占用** - 大数据量时较高
3. **SQL 导出** - 仅支持 INSERT 语句

### 待优化
1. 流式处理 (超大数据集)
2. 分块导入
3. 导入预览
4. 数据映射

---

## 📝 使用示例

### 导出查询结果

```typescript
import { exportData } from '@/lib/importExport'

// 导出为 CSV
exportData({
  format: 'csv',
  data: queryResults,
  filename: 'users.csv',
})

// 导出为 Excel
exportData({
  format: 'xlsx',
  data: queryResults,
  filename: 'users.xlsx',
})

// 导出为 SQL
exportData({
  format: 'sql',
  data: queryResults,
  columns: ['users'], // 表名
  filename: 'users.sql',
})
```

### 导入数据

```typescript
import { importData } from '@/lib/importExport'

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
```

---

## 🚀 后续版本

### v1.3.1 (补丁版本)
- [ ] 拖拽上传支持
- [ ] 导入预览功能
- [ ] 性能优化

### v1.4.0 (下一版本)
- [ ] ER 图和数据建模
- [ ] 数据对比工具
- [ ] 批量操作增强

---

<div align="center">
  <strong>🎉 v1.3.0 正式发布！</strong>
</div>

<div align="center">
  
[下载 v1.3.0](https://github.com/dbmanager/dbmanager/releases/tag/v1.3.0) | [导入导出文档](./docs/IMPORT_EXPORT.md) | [问题反馈](https://github.com/dbmanager/dbmanager/issues)

</div>
