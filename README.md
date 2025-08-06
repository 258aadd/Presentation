# 文件管理系统

这是一个基于Vue 3的文件管理系统，支持用户上传和浏览视频文件及Markdown文档。

## 功能特性

### 🏠 主页面
- 清晰的功能导航
- 现代化的UI设计
- 响应式布局

### 📤 文件上传
- 支持视频文件上传（最大50MB）
- 支持Markdown文档上传（最大1MB）
- 文件类型验证
- 实时文件信息显示
- 重复标题检测

### 📁 文件浏览
- 按用户ID查看文件
- 动态加载用户标题列表
- 快速内容预览

### 📄 内容展示
- 视频播放器
- Markdown文档渲染
- 优雅的内容布局

### 💾 存储管理
- IndexedDB存储统计
- 用户数据管理
- 批量删除功能
- 存储空间监控

## 技术栈

- **前端框架**: Vue 3 + TypeScript
- **构建工具**: Vite
- **数据存储**: IndexedDB
- **样式**: 原生CSS + 渐变设计
- **文件处理**: FileReader API
- **Markdown渲染**: 自定义解析器

## 开发和运行

### 安装依赖
```bash
npm install
```

### 开发模式
```bash
npm run dev
```

### 构建生产版本
```bash
npm run build
```

### 类型检查
```bash
npm run type-check
```

### 代码检查
```bash
npm run lint
```

## 项目结构

```
src/
├── components/          # Vue组件
│   ├── HomePage.vue     # 主页面
│   ├── UploadPage.vue   # 上传页面
│   ├── BrowsePage.vue   # 浏览页面
│   ├── ContentPage.vue  # 内容展示页面
│   └── StoragePage.vue  # 存储管理页面
├── utils/               # 工具模块
│   ├── database.ts      # IndexedDB管理
│   ├── fileUtils.ts     # 文件处理工具
│   └── markdownRenderer.ts # Markdown渲染
├── App.vue              # 主应用组件
└── main.ts              # 应用入口
```

## 使用说明

1. **上传文件**: 
   - 输入用户ID和标题
   - 选择视频文件和Markdown文档
   - 点击上传按钮

2. **浏览文件**: 
   - 输入用户ID
   - 点击"加载标题"获取该用户的所有文件
   - 选择标题查看内容

3. **存储管理**: 
   - 查看存储使用情况
   - 管理用户数据
   - 删除不需要的文件

## 浏览器支持

- Chrome/Edge 58+
- Firefox 55+
- Safari 11+

需要支持IndexedDB和FileReader API的现代浏览器。

## 迁移说明

本项目从原生HTML/JavaScript应用成功迁移至Vue 3，主要改进：

- ✅ 组件化架构
- ✅ TypeScript类型安全
- ✅ 响应式数据管理
- ✅ 更好的代码组织
- ✅ 现代化开发体验
- ✅ 保持原有功能完整性

## 原Vue模板信息

### IDE设置推荐

[VSCode](https://code.visualstudio.com/) + [Volar](https://marketplace.visualstudio.com/items?itemName=Vue.volar) (禁用Vetur)。

### TypeScript支持

TypeScript默认无法处理`.vue`导入的类型信息，因此我们使用`vue-tsc`替代默认的`tsc`CLI进行类型检查。在编辑器中，我们需要[Volar](https://marketplace.visualstudio.com/items?itemName=Vue.volar)来让TypeScript语言服务识别`.vue`类型。

### 自定义配置

查看 [Vite配置参考](https://vite.dev/config/)。