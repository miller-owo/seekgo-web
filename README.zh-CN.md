<div align="center">
  <img src="src/assets/seekgo-mark.png" width="96" alt="SeekGo logo" />
  <h1>SeekGo</h1>
  <p><strong>一个非官方的 DeepSeek mod 网页客户端。</strong></p>
  <p>基于官方 <a href="https://github.com/deepseek-ai/chat-demo">Chat Demo</a> 制作修改而来。</p>
  <p>对话默认留在本机，支持流式回答、搜索与链接阅读、自定义工具、长上下文压缩、生图和费用分析，而且不需要自建后端。</p>
  <p>
    <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-2ea44f.svg" alt="MIT license" /></a>
    <img src="https://img.shields.io/badge/TypeScript-strict-3178c6.svg" alt="TypeScript strict" />
    <img src="https://img.shields.io/badge/React-18-61dafb.svg" alt="React 18" />
    <img src="https://img.shields.io/badge/backend-none-2ea44f.svg" alt="No backend" />
  </p>
  <p><a href="README.md">English</a> · 简体中文</p>
</div>

> SeekGo 是独立的 DeepSeek 客户端，不是 DeepSeek 官方产品。

## 为什么是 SeekGo

大多数 AI 对话客户端需要服务器来保管 API Key、代理请求或保存对话。SeekGo 走另一条路：

- **没有后端。** 它是一个静态站点，浏览器直接请求你配置的 API 服务。
- **本地优先。** 对话和附件保存在 IndexedDB，设置保存在 localStorage；没有 SeekGo 服务器，因此也不会上传到那里。
- **为 DeepSeek 定制。** 流式回答、深度思考、服务端搜索、链接阅读和来源引用都接入了对话流程。
- **完整的工作区。** 自定义 HTTP 工具、模型驱动的长上下文压缩、多 Provider 生图，以及用量/费用分析面板都内置。
- **细节完整。** 中英文、明暗主题、移动端布局、完整的进出场动效，并尊重系统的「减少动态效果」。

## 功能

### 对话工作区

- 多会话、自动标题、重命名和删除。
- 流式回答、深度思考、停止、继续、编辑提问、重新生成和消息分支。
- 上传、粘贴和拖拽附件；语音输入和回复朗读。
- Markdown、代码高亮、KaTeX 公式和 Mermaid 图表。

### 搜索与工具

- **智能搜索**与**阅读链接**，支持来源引用。智能搜索依赖阅读链接；任意一个关闭，搜索入口就会禁用。
- **自定义 HTTP 工具**：用 JSON Schema 描述参数，让模型调用你的接口。GET 参数会拼成查询串，其他方法发送 JSON；结果会先截断再交给模型。
- **图像生成**：支持 OpenAI、Google Gemini、Seedream（火山方舟）、DashScope、xAI Grok、智谱 GLM，以及任意 OpenAI 兼容接口。

### 长上下文与洞察

- **模型驱动的压缩**：模型把较早、已经消费完的完整对话轮次写成摘要，原文仍保留在本机，可随时恢复。
- **分析面板**：上下文用量、token 构成、压缩块与回本情况、缓存命中率趋势、工具/图片统计，以及按 DeepSeek 官方 CNY 价格估算的支出、节省与等效费用。
- **固定 1M 上下文目标。** 界面不要求选择窗口大小；压缩按模型的 1M 窗口管理。

### 平台

- 简体中文与英文。
- 明暗主题、移动端布局、位置设置。
- 历史记录以可移植的 ZIP 归档导入导出。
- 弹窗、菜单、提示气泡、抽屉、消息、轻提示、搜索结果和主题切换都有统一的动效；全局尊重 `prefers-reduced-motion`。

## 快速开始

### 环境要求

- Node.js **22.12+**（GitHub Pages 工作流使用 Node 24）
- pnpm（工作流使用 pnpm 12.6）
- 一个 DeepSeek API Key，或支持所需能力的兼容 API 服务

### 本地运行

在本仓库的检出目录中执行：

```sh
pnpm install
pnpm dev
```

打开 <http://127.0.0.1:3040>。首次使用时，在**设置**中填写 API Key。

### 构建静态站点

```sh
pnpm build
```

产物输出到 `dist/`，可部署到任意静态托管。

### 一行命令启动

先注册项目自带的启动器：

```sh
npm link
```

之后在任意目录执行 `dsgo`，都会启动开发服务器并打开浏览器：

```sh
dsgo              # http://127.0.0.1:3040，并自动打开浏览器
dsgo --no-open    # 只启动服务器
dsgo --port 4000  # 换一个端口
dsgo --host 0.0.0.0
```

## 配置

所有用户配置都在**设置**中完成，默认保存在 localStorage 的 `seekgo:*` 命名空间下（另有说明的除外）。

| 区域         | 可以配置什么                                   |
| ------------ | ---------------------------------------------- |
| **通用设置** | 语言、主题、朗读音色、位置信息、长上下文压缩   |
| **工具配置** | 智能搜索、阅读链接、自定义 HTTP 工具、图像生成 |
| **数据管理** | 导入/导出历史、删除全部本地对话                |
| **关于**     | 版本、致谢和第三方许可证信息                   |

### API Key 与 API 地址

- API Key 只会发给你配置的 API 地址，以及你明确配置的自定义工具/生图接口。
- 默认 API 地址是 `https://api.deepseek.com`。
- 如果要连接兼容网关，在构建时指定自定义地址：

```ts
// rspack.config.ts
export default defineConfig(createConfig({ apiOrigin: 'https://your-gateway.example.com' }))
```

- 对话模型是 `deepseek-flash`，普通回答和深度思考都使用它。
- 你使用的 API 服务需要支持搜索、链接阅读等对应的服务端工具能力。

### 工具

| 设置           | 行为                                                                                  |
| -------------- | ------------------------------------------------------------------------------------- |
| **智能搜索**   | 声明服务端搜索工具，依赖阅读链接。                                                    |
| **阅读链接**   | 声明服务端链接阅读工具，同时启用智能搜索。                                            |
| **自定义工具** | 每个工具包含名称、描述、方法、URL、可选请求头和参数的 JSON Schema。接口必须允许跨域。 |
| **图像生成**   | 按 Provider 分别配置 API Key、接口地址、模型和输出默认值；见下表。                    |

生图 Provider 与默认值：

| Provider              | 默认模型                         | 输出参数                           |
| --------------------- | -------------------------------- | ---------------------------------- |
| OpenAI                | `gpt-image-2.6-flare`            | 像素尺寸、质量                     |
| Google Gemini         | `gemini-3.1-flash-image`         | 宽高比、1K/2K/4K 分辨率            |
| Seedream（火山方舟）  | `doubao-seedream-5-0-pro-260628` | 尺寸档位、输出格式、水印           |
| DashScope（通义万相） | `qwen-image-3.0`                 | 像素尺寸                           |
| xAI Grok              | `grok-imagine-image-2.0`         | 宽高比、1k/2k 分辨率               |
| 智谱 GLM              | `glm-image`                      | 推荐尺寸、hd 质量                  |
| OpenAI 兼容           | 任意模型 ID                      | 像素尺寸、质量、额外 JSON 请求字段 |

当你在对话中明确指定 Provider、模型、尺寸、宽高比、分辨率或质量时，模型可以为单次生成覆盖默认值。

> 生图接口和自定义工具必须允许**浏览器跨域请求**。SeekGo 没有代理。

### 长上下文压缩

在**设置 → 通用设置**中开启。模型通过内置的 `compress`、`decompress`、`search_context` 和 `acp_status` 工具，自行决定何时把较早、已经消费完的对话轮次折成摘要。

- 原文不会在本地被丢弃，可从压缩横幅或分析面板恢复。
- 目标窗口固定为 **1M tokens**。
- 压缩从下一条消息开始生效；当前轮仍使用原始历史。

### 分析面板

从会话标题栏打开分析面板，可以看到：

- 上下文用量与 token 构成。
- 活跃压缩块与回本情况。
- 缓存命中率和短期趋势。
- 工具、图片和附件统计。
- 估算支出、缓存优惠、压缩节省和等效费用。

费用是**估算值**：按 DeepSeek 公布的 CNY 价格计算（空闲价为基准、高峰 2 倍；按请求时间判断，法定节假日未计入）。实际扣费以账单为准。

## 使用

1. 在设置中**填写 API Key**，然后开始新对话。
2. 正常提问、添加附件或使用麦克风；Markdown、代码、公式和图表会直接渲染。
3. **打开智能搜索**，让模型联网查找并引用来源；搜索同时需要阅读链接。
4. 在设置 → 工具配置中**添加工具**，让模型调用你自己的 HTTP 服务。
5. **生成图片**时直接提出需求；默认使用当前 Provider，也可以明确指定其他 Provider。
6. 长对话可以自动**折叠成摘要**；需要时随时恢复原文。
7. 在设置 → 数据管理中**导出** ZIP 归档，用于备份或迁移。

## 架构

SeekGo 是一个静态单页应用，没有应用服务器、代理、数据库或遥测服务。

| 层   | 选型                                                         |
| ---- | ------------------------------------------------------------ |
| 界面 | React 18、TypeScript、zustand、CSS Modules                   |
| 构建 | rspack 2、SWC、Lightning CSS                                 |
| 内容 | Markdown、Prism、KaTeX、Mermaid                              |
| 存储 | IndexedDB（`idb`）；localStorage 保存设置                    |
| API  | DeepSeek Anthropic 兼容的 Messages / Files API，SSE 流式传输 |
| 测试 | 暂无自动化测试；需要手动验证相关行为                         |

```text
浏览器
  │
  ├─ React UI + zustand 状态
  ├─ services/api ────────────────► DeepSeek API
  ├─ 自定义工具 / 生图接口 ───────► 你配置的接口
  └─ IndexedDB + localStorage
```

```text
src/
  app/                 布局、主题、动效变量与全局样式
  components/          聊天、设置、Markdown、搜索、分析面板和基础 UI
  i18n/                中英文文案
  services/
    api/               API 客户端、SSE 解析、协议类型
    chat/              会话、分支、存储、历史导入导出、
                       压缩、自定义工具、图像生成
    markdown/          Markdown 解析、代码高亮与图表
    speech/            录音、ASR 与 TTS
  utils/               通用工具
bin/dsgo.mjs           可选的启动器
rspack.config.ts       构建、开发服务器与 API 地址配置
```

## 数据与隐私

| 数据                               | 保存位置                     | 何时离开浏览器                                                             |
| ---------------------------------- | ---------------------------- | -------------------------------------------------------------------------- |
| API Key                            | localStorage                 | 发给你配置的 API 地址；自定义工具和生图 Provider 使用各自的 Key 或请求头。 |
| 对话、消息、分支                   | IndexedDB（`seekgo` 数据库） | 随对话请求发送给 API 服务                                                  |
| 附件和生成的图片                   | IndexedDB / 会话数据         | 使用时上传或在请求中引用                                                   |
| 设置、自定义工具定义、Provider Key | localStorage（`seekgo:*`）   | 调用工具时直接发给你配置的接口                                             |
| 导出的历史 ZIP                     | 下载到本机                   | 只有你主动分享时才会离开                                                   |

- **没有分析或遥测。** SeekGo 不包含第三方跟踪脚本。
- **API Key 没有加密。** 它保存在浏览器存储中；请使用可信设备和浏览器配置。
- **清除站点数据会删除本地对话和设置。** 需要备份时请先导出。
- **外部服务会看到你发送的内容。** API 地址、自定义工具接口和生图 Provider 会分别收到相应的提示词、文件或 Key。
- **生成的图片 URL 可能过期。** base64 结果会随会话保存；URL 结果之后可能无法加载。
- **删除本地对话不会删除已上传到 API 服务的文件。**

## 部署

构建产物是静态站点：

```sh
pnpm build
# 部署 dist/
```

仓库包含 GitHub Pages 工作流（`.github/workflows/pages.yml`）：每次推送到 `main` 时执行类型检查、lint 和构建，然后部署 `dist/`。在仓库的 **Settings → Pages → Source** 中选择 **GitHub Actions** 即可使用。

- 部署到子路径时，需要同时配置静态托管和 rspack 的 `publicPath`。
- 直接用 `file://` 打开 `dist/index.html` 只在浏览器允许 file 页面存储、且 API 服务允许跨域时可用；本地静态服务器更可靠。

## 开发

### 命令

| 命令          | 说明                                   |
| ------------- | -------------------------------------- |
| `pnpm dev`    | 在 3040 端口启动开发服务器             |
| `dsgo`        | 执行过 `npm link` 后，可在任意目录启动 |
| `pnpm build`  | 构建生产站点到 `dist/`                 |
| `pnpm type`   | TypeScript 类型检查                    |
| `pnpm lint`   | 使用 oxlint 检查                       |
| `pnpm format` | 使用 oxfmt 格式化                      |

### 提交 PR 之前

运行全部三项检查：

```sh
pnpm type
pnpm lint
pnpm build
```

目前没有自动化测试，还需要手动验证相关的界面路径。

### 项目约定

- 动手前先读 [`AGENTS.md`](AGENTS.md)。
- 本地导入使用显式 `.js` 扩展名。
- 样式使用 CSS Modules；颜色和时长优先使用 `--dsw-*` 与 `--ds-motion-*` 设计变量，不要硬编码。
- 新增用户可见文案时，先加到 `src/i18n/zh.ts`，再加 `src/i18n/en.ts`。
- 新增动效必须尊重 `prefers-reduced-motion`。
- 助手的系统提示词是上游文本，不要随意替换品牌。

### API 地址

`rspack.config.ts` 在构建时注入 `__API_ORIGIN__`，默认是 `https://api.deepseek.com`；可用 `createConfig({ apiOrigin, devServer })` 自定义 API 地址和开发代理。

## 排障

| 现象                    | 可能原因                                                           |
| ----------------------- | ------------------------------------------------------------------ |
| API Key 被拒绝          | Key 无效、已过期，或 API 地址和 Key 所属服务不匹配。               |
| 搜索按钮不可点          | 智能搜索或阅读链接被关闭；搜索需要两者都开启。                     |
| 自定义工具/生图请求失败 | 接口不允许浏览器跨域、Key 未填写，或接口路径不正确。               |
| 生成的图片链接失效      | Provider 返回了临时 URL；重新生成，或改用返回 base64 的 Provider。 |
| 对话不见了              | 站点数据或浏览器配置被清除；如果有导出的 ZIP 可以恢复。            |
| 费用面板和账单不一致    | 面板按标价估算；高峰/空闲、缓存和实际计费调整可能不同。            |

## 参与贡献

欢迎贡献：

1. 对 bug、功能建议或较大的设计改动，先开 issue 讨论。
2. 保持改动聚焦；新增用户可见文案时同步更新中英文。
3. 运行 `pnpm type`、`pnpm lint` 和 `pnpm build`。
4. 在 PR 中说明行为变化和验证方式。

请不要在 issue 或 PR 中粘贴真实 API Key、Token 或私密对话数据。

## 许可证

[MIT](LICENSE)。界面基于 [deepseek-ai/chat-demo](https://github.com/deepseek-ai/chat-demo)（同为 MIT）。

SeekGo 还包含以下功能级移植：

- [dsh-image-gen](https://github.com/shanliuling/dsh-image-gen) — Apache License 2.0。
- [billion-context](https://github.com/ranxianglei/billion-context) — MIT + 附加署名条款。

完整署名和许可文本见 [NOTICE](NOTICE) 与 [`licenses/`](licenses/)。生产构建会把 `LICENSE`、`NOTICE` 和 `licenses/` 复制到 `dist/`；分发时请一并保留。第三方依赖遵循各自的许可证。

SeekGo 的 Logo 基于鲸鱼娘形象改编，使用 GPT Image 2.5 制作而来，保持原许可证 [CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/)；上述 MIT 许可证仅适用于源代码，不适用于 Logo。

### Logo 角色署名（CC BY-NC-SA 4.0）

以下署名依据 CC BY-NC-SA 4.0 的署名要求提供。SeekGo Logo 中的鲸鱼娘形象改编自以下创作者的角色设定与二创素材，原始著作权归原作者所有。

- B站 ZipZipPipe：<https://space.bilibili.com/4168597>
- B站 上善无形：<https://space.bilibili.com/4456176>

## 致谢

- [deepseek-ai/chat-demo](https://github.com/deepseek-ai/chat-demo)：原始界面。
- [shanliuling/dsh-image-gen](https://github.com/shanliuling/dsh-image-gen)：生图能力与 Provider 设计。
- [ranxianglei/billion-context](https://github.com/ranxianglei/billion-context)：模型驱动的上下文压缩思路。
- React、rspack、KaTeX、Mermaid、Prism 和 idb 社区。
