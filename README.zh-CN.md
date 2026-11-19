# SeekGo

[English](README.md) | 简体中文

SeekGo 是一款由 DeepSeek API 驱动的静态 AI 对话应用，不需要自建后端：浏览器直接请求配置的 API 服务，对话数据保留在本机，除非主动导出。

界面基于 [deepseek-ai/chat-demo](https://github.com/deepseek-ai/chat-demo)（MIT）改造：SeekGo 重做了品牌标识，并补全了整套动效——弹窗、菜单、提示气泡、侧边栏抽屉、消息入场、轻提示、搜索结果面板与主题切换都有统一的进出场动画，且尊重系统的「减少动态效果」设置。

## 运行

准备 Node.js 22.12+ 和 pnpm：

```sh
pnpm install
pnpm dev
```

打开 http://127.0.0.1:3040 。首次使用时，请在设置中填写 API Key。

生成静态产物：

```sh
pnpm build
```

### 一行命令启动

首次在项目目录注册一次启动器：

```sh
npm link
```

之后在任意目录执行 `dsgo`，都会启动同一个开发服务器并自动打开浏览器：

```sh
dsgo              # http://127.0.0.1:3040，并自动打开浏览器
dsgo --no-open    # 只启动服务器，不打开浏览器
dsgo --port 4000  # 换一个端口
dsgo --host 0.0.0.0
```

产物位于 `dist/`，可部署到静态服务器，也可直接打开 `dist/index.html`。直接打开时，浏览器和 API 服务需允许 `file://` 页面的存储与跨域请求。

## 功能

- 多会话、自动标题、重命名与删除；编辑提问、重新生成和切换消息分支。
- 流式回答、深度思考、智能搜索、链接阅读与来源引用；支持停止和符合条件的继续生成。
- 附件上传、粘贴与拖拽，语音输入和回复朗读；移动端录音时输入框首行显示实时频谱。
- Markdown、代码高亮、KaTeX 公式和 Mermaid 图表。
- 简体中文与英文、浅色与深色主题、移动端布局、位置设置、历史导入导出。
- 完整动效层：弹窗与抽屉进出场、锚定菜单与提示气泡、侧边栏收起、消息入场、搜索面板滑入、轻提示退场，主题切换时整体交叉淡入。

## 动效与品牌

动效变量集中在 [`src/app/theme.css`](src/app/theme.css)（`--ds-motion-*`），通用的「保留挂载播放退场」逻辑在 [`src/app/motion.ts`](src/app/motion.ts)：浮层先在退场时长内保持挂载，动画结束后再交还给调用方卸载。「减少动态效果」的全局规则在 [`src/app/global.css`](src/app/global.css)。

SeekGo 的品牌标识（一只举着放大镜的抽象蓝鲸娘）是 [`src/assets/seekgo-mark.png`](src/assets/seekgo-mark.png)，用于侧边栏和新对话空状态；favicon 由 [`src/assets/seekgo-favicon.png`](src/assets/seekgo-favicon.png) 在构建时注入。页面元信息在 [`src/index.html`](src/index.html)。

## 数据

API Key 和设置保存在浏览器 localStorage（`seekgo:*`），会话及附件原件保存在 IndexedDB（`seekgo` 数据库）。本地数据按浏览器用户配置和站点源（origin）隔离。发送对话、上传附件和使用语音功能时，相应内容会提交给配置的 API 服务。

设置中的历史导入导出使用 ZIP 格式，导出文件名为 `seekgo_data-日期.zip`。导入会在确认并校验成功后替换全部本地会话和附件；导出包含会话与本地可用的图片原件，不包含 API Key、设置或非图片附件原件。格式与保留范围见[历史导入导出](src/services/chat/history/README.md)。

设置 → 数据管理 → 删除所有对话，会在确认后清空全部本地会话、附件原件和未发送的草稿，停止正在生成的回复并回到新对话。API Key 和其他设置保留，已上传到 API 服务的文件不受影响。

## 开发

| 命令          | 用途                |
| ------------- | ------------------- |
| `pnpm dev`    | 启动开发服务器      |
| `dsgo`        | 任意目录启动（需先 `npm link`） |
| `pnpm build`  | 构建到 `dist/`      |
| `pnpm type`   | TypeScript 类型检查 |
| `pnpm lint`   | oxlint 检查         |
| `pnpm format` | oxfmt 格式化        |

[rspack.config.ts](rspack.config.ts) 默认连接 `https://api.deepseek.com`。`createConfig({ apiOrigin, devServer })` 支持自定义 API 地址和开发服务器代理。

聊天默认使用 `deepseek-flash`，通过 Anthropic 兼容的 Messages / Files API 通信；语音使用 ASR / TTS 接口。请求使用搜索、链接阅读、标题和 `latest_reminder` 等扩展，接入服务需支持相应能力。附件实际支持的格式以服务端校验为准。

```text
src/
  app/                 应用布局、主题、动效变量与全局样式
  components/          聊天、设置、Markdown 等界面组件
  i18n/                中英文文案
  services/
    api/               API 请求、SSE 与协议类型
    chat/              会话、消息分支、本地存储与历史导入导出
    markdown/          Markdown 解析、代码高亮与图表
    speech/            录音与朗读
  utils/               通用工具
```

## 许可证

[MIT](LICENSE)。界面源自 [deepseek-ai/chat-demo](https://github.com/deepseek-ai/chat-demo)（同为 MIT）。构建会将许可证复制到 `dist/LICENSE`，分发时请一并保留；第三方依赖遵循各自的许可证。
