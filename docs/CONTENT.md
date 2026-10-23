# 内容维护指南 / Content maintenance

所有公开内容都使用稳定 ID。语言版本通过 `{ "zh": "中文", "en": "English" }` 放在同一条记录中；关联关系使用 ID，不使用翻译后的标题。内容文件是 UTF-8 JSON，不需要更改页面组件。

## 知识与来源

`content/taxonomy.json` 将 `sourceTypes` 和 `topics` 分开。来源类型包括 `tencent / personal / reference`，主题使用 `foundations / discovery / design / data / agents / delivery / operations`。可修改标签或扩展分类；保持已用 ID 稳定。

知识记录示意：

```json
{
  "id": "your-stable-id",
  "title": {"zh": "标题", "en": "Title"},
  "summary": {"zh": "摘要", "en": "Summary"},
  "sourceType": "reference",
  "source": {"zh": "作者、来源及版本", "en": "Author, source and version"},
  "sourceLanguage": "zh",
  "topics": ["discovery"],
  "tags": ["FDE"],
  "difficulty": "beginner",
  "stage": "discover",
  "updatedAt": "2026-10-23",
  "status": "draft",
  "url": "https://example.org/authorized-source",
  "file": null,
  "relatedCases": [],
  "sections": [{"id":"s1","title":{"zh":"小节","en":"Section"},"body":{"zh":"原创或获准公开的内容","en":"Original or authorized public text"}}]
}
```

- `published` 才会显示并进入发布构建；`draft` 在构建 `_site` 时过滤。草稿仍在仓库历史中，因此**私有或未获公开许可的内容不能写进公开仓库，即便标记 draft**。
- 暂无译文时可缺少对应语言字段，界面会显示原文与“暂无译文”提示。平台首批自编内容有双语版本；原始课程标题与 PDF 不自动翻译。若以后加入机器翻译，需在来源/摘要中明确标注翻译方式与非官方性质。
- 页面上的摘要不等于完整原文。外部官方课程保留链接、元信息和平台原创导读；不能把第三方教程的全文复制进 JSON。
- 当前 `file` 均为 `null`。站内阅读支持本机私有文件。新增公开 PDF 前须确认公开许可，并明确添加到构建白名单与本机服务器；仅设置 `file` 字段不会自动上传、公开或生成阅读器。
- 章节 ID 用作 AI 引用锚点。只有真实、核验过的 PDF 页码才可进入页码引用；公开导读使用章节定位，没有虚构页码。
- 维护私有 PDF 可通过 UI 导入、编辑来源与主题、保存笔记。若需要 OCR，先在授权的本地流程提取与校对，再导入 TXT/Markdown；不要将未经核验的 OCR 当作准确正文。

## 书籍与资源

在 `books.json` 增加书名、作者、摘要（推荐理由与适合读者）、主题、难度、阶段、原文语言、合法外链、访问方式 `free/purchase/unknown`、关联知识和案例。未持有可公开阅读文件时只提供合法外链。平台不托管完整书籍。

在 `resources.json` 增加名称、用途与适合读者的双语摘要、`category`、标签、主题、URL、语言、收费状态与 `verifiedAt`。核验日期只在人工打开目标内容并确认身份/用途后填写；仅获得 HTTP 200 或代理错误不算内容核验。未核验填写 `null`，不能把今天的日期当作已核验日期。第一版没有自动爬取或更新。

本次对首批 7 个书籍/资源链接尝试核验：多个域名被环境代理阻断，腾讯文档响应未取得可确认的页面标题，因此保持待核验。该状态不代表这些网站对普通用户不可用。

## 案例与学习路径

公开案例位于 `cases.json`，类型 `fictional / real / analysis`：

- 虚构案例必须明确标记，背景和练习设定用 `nature: premise`，建议/推断用 `nature: analysis`。
- 真实案例必须填写可核查来源 URL 与来源说明；不知道的信息写未知，不生成客户、结果或 ROI。
- 公开资料分析应标记分析类型，区分来源事实与平台推断。
- 九个章节 ID 由 `case-fields.json` 管理。按行业 `industry`、主题 `topics`、阶段 `stage` 和关键词（包含 `problem`）检索。
- `knowledge` 引用知识 ID，`scenario` 指向可用访谈场景。新增场景前先准备稳定背景、可透露事实与未知项。
- `home.json` 人工配置精选 ID 与学习路径，不维护虚假人数、课程数量或效果数据。

“我的私有案例”保留原来 13 字段格式及编辑/Markdown 导出，独立于公开九章节案例。旧资料的作者标签不能作为真实项目已经核验的证明。

## 场景与界面翻译

`scenarios.json` 包含 brief、opening、fallback，以及六个访谈维度。规则演示的 `pattern` 是关键词匹配，`reply` 是固定回应，`followup` 是建议追问。演示只揭示一个尚未讨论的匹配维度；不理解自由语言或提供认证分数。所有这些事实都是公开虚构练习材料，并非机密客户背景。

AI 接口把同一场景作为稳定背景，按所选练习语言回复。复盘用界面语言，原话引用保留原语言。不要在场景文件中放真实客户资料。界面文案新增到 `i18n.js`，避免在组件里直接写双语文本。

修改后执行 `npm test`、`npm run build`，并检查新增内容的中英文桌面/手机页面。提交时只暂存明确的公共文件，永远不要将 `private/`、完整备份、密钥或原 PDF 纳入 Git。
