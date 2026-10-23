# FDE Playbook

中文优先、中英文切换的 FDE 学习与实践平台。定位：从理解 FDE，到交付真实 AI 项目。原生 JavaScript / ES Modules，无前端运行依赖，继续使用 Hash 路由与 GitHub Pages。

公开站点：https://juanlijackie2020-crypto.github.io/FDE-Playbook-for-Newbies/

## 使用与预览

- 首页进入知识库、在线书籍、网站与社区、FDE 案例库和客户需求访谈模拟器。
- 右上角切换中文 / English；保留当前页面、筛选、笔记草稿和访谈上下文，语言选择保存在当前浏览器。
- 公开内容包括平台原创双语导读、官方课程链接、书籍与资源元信息、明确标注的虚构教学案例。不公开原四章 PDF 或解密后的内容。
- AI 未配置时显示真实状态。访谈可选择“规则演示 · 非 AI”；演示依关键词展示固定信息，不是语言模型或正式能力评估。
- “个人学习工具”在页脚：知识自测、综合自测、题目核验、错题复盘、私有资料及数据备份。
- 首次访问联网缓存后，可离线查看公开内容和本机资料。外部来源、尚未缓存的文件和 AI 调用需要网络。

本机预览需要 Node.js 22+：

```sh
npm start
```

在**运行此命令的同一台电脑**打开 `http://127.0.0.1:4173`。云环境里的 `127.0.0.1` 不是你的 Windows 电脑；远程访问请用公开站点或环境提供的端口转发。也可以在 Windows 安装 Node.js 后运行 `start-windows.cmd`。

## 数据与兼容

保持原 `fde-state-v1` localStorage、`fde-files` IndexedDB 和文件 ID，不进行清库。旧 `#course`、`#library`、`#review`、`#practice`、`#mistakes`、`#exam`、`#cases`、`#settings` 链接继续可用。旧首页换为公众平台；不再读取或展示备考日期与每日任务。

个人文件、笔记、案例和作答只保存在当前浏览器，不公开、不自动跨设备同步。访谈和 AI 问答只在页面内存里，刷新清除；不会自动写入备份。完整私有备份可以转移资料与笔记，恢复前请先备份当前数据。

PDF 继续由浏览器原生阅读器显示，实际支持取决于设备浏览器；手机可用“保存原文件”在本机阅读器打开。知识库可按来源类型同时浏览公开条目与当前浏览器的私有资料；私有卡片不向其他访问者公开。全文搜索覆盖平台导读、TXT / Markdown 以及私有学习包已提取的 PDF 正文。新导入普通 PDF 不自动提取；扫描件、截图和图表需另行 OCR / 校对。明确展示提取状态，不将文件名搜索称为全文搜索。

原四章 PDF 可以在“官方课程目录”或“我的私有资料”解锁原有加密学习包。解锁仅在本机进行；保留既有的 98 道练习题、6 个私有改编案例和笔记，不自动把题目标为已核验。综合自测仍支持包含待核验参考题、严格核验模式、完整与短时自测、计时、刷新恢复和作答记录。

`study-pack.enc.json` 是此前已获授权的公开密文包。密钥由完全相同的四份 PDF 派生；拥有相同原件者均可解密，不是账号权限或 DRM。公开构建不包含任何原 PDF、私有明文、模型密钥或 AI 服务代码。

## 维护内容

阅读 [内容维护指南](docs/CONTENT.md)。常用文件：

| 文件 | 用途 |
| --- | --- |
| `content/taxonomy.json` | 独立的主题、来源类型、阶段与资源分类 |
| `content/knowledge.json` | 双语导读、来源元信息及章节正文 |
| `content/books.json` | 书籍、作者、理由与合法外链 |
| `content/resources.json` | 人工维护的资源目录与核验日期 |
| `content/cases.json` | 公开案例、类型、分析标识、关联与场景 |
| `content/scenarios.json` | 虚构客户场景与演示提问维度 |
| `content/home.json` | 学习路径与精选内容 ID |
| `i18n.js` | 统一的中英文界面文案 |

原始课程与 PDF 保留原语言，没有译文时明确提示。平台原创导读与案例的中英文版本共用内容 ID，不声称为腾讯官方翻译。

## AI 服务（可选）

GitHub Pages 只部署静态应用。当前 `config.json` 中 `apiBase` 为空，因此未启用真实 AI。

[AI 服务部署指南](docs/AI-DEPLOYMENT.md) 介绍可选的独立 Node.js 服务、模型服务环境变量、CORS、TLS、输入限制、速率和预算控制。API Key 只通过服务端环境变量读取，绝不放入前端、Git 仓库或浏览器存储。

问答当前仅检索本项目公开导读正文，按章节提供核验原文引用；不向模型发送私有 PDF、笔记或解密题库。私有 PDF 全文问答与通用 OCR 尚未实现。真实模型的质量与成本需要部署后再验收；现有自动测试使用明确的模拟模型响应。

## 检查与发布

```sh
npm test                 # 逻辑、内容约束、来源核验和 AI HTTP 接口测试
npm run build           # 显式白名单构建 _site，发布时过滤 draft 内容
npm start               # 本机预览
```

浏览器验收需另有 Playwright 与 Chromium（当前云环境已安装，不是产品运行依赖）：

```sh
TEST_BASE=http://127.0.0.1:4173 npm run test:browser
FDE_PRIVATE_DIR=/path/to/private/official-materials TEST_BASE=http://127.0.0.1:4173 npm run test:private
```

`CHROMIUM_PATH` 可指定浏览器路径。私有测试需要原资料目录，原件不随仓库或测试发布。浏览器截图保存在被忽略的 `test-results/` 中；未宣称通过实体手机、Windows 原生浏览器或真实模型验收。

推送到 `main` 后沿用 `.github/workflows/pages.yml`：运行单元测试、白名单构建、上传并部署 Pages。Pages 来源保持 GitHub Actions。部署后用 Ctrl+Shift+R 刷新；离线服务工作线程使用新版本缓存，保留原本机学习数据。

旧单文件打包方式不再适用于模块化公开内容版本；`FDE-standalone.html` 保留为明确的在线入口，不再冒充新版离线单文件应用。离线使用请先访问 HTTPS 站点并等待缓存就绪。
