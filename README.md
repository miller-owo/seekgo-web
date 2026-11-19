<div align="center">
  <img src="src/assets/seekgo-mark.png" width="96" alt="SeekGo logo" />
  <h1>SeekGo</h1>
  <p><strong>An unofficial mod web client for DeepSeek.</strong></p>
  <p>Based on the official <a href="https://github.com/deepseek-ai/chat-demo">Chat Demo</a>, modified and rebranded.</p>
  <p>Local-first conversations, streaming answers, search and link reading, custom tools, long-context compression, image generation, and cost analysis — with no backend to run.</p>
  <p>
    <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-2ea44f.svg" alt="MIT license" /></a>
    <img src="https://img.shields.io/badge/TypeScript-strict-3178c6.svg" alt="TypeScript strict" />
    <img src="https://img.shields.io/badge/React-18-61dafb.svg" alt="React 18" />
    <img src="https://img.shields.io/badge/backend-none-2ea44f.svg" alt="No backend" />
  </p>
  <p>English · <a href="README.zh-CN.md">简体中文</a></p>
</div>

> SeekGo is an independent client for the DeepSeek API. It is not an official DeepSeek product.

## Why SeekGo

Most AI chat clients need a server to hold API keys, proxy requests, or store conversations. SeekGo takes a different route:

- **No backend.** It is a static site. The browser talks directly to the API service you configure.
- **Local-first.** Conversations and attachments live in IndexedDB; settings live in localStorage. Nothing is uploaded to a SeekGo server because there isn't one.
- **DeepSeek-native.** Streaming, deep thinking, server-side search, link reading, and citations are wired into the chat flow.
- **A complete workspace.** Custom HTTP tools, model-driven long-context compression, multi-provider image generation, and a usage/cost analysis panel are built in.
- **Small, polished details.** English and Chinese, light and dark themes, mobile layouts, full enter/exit motion, and reduced-motion support.

## Features

### Chat workspace

- Multiple conversations with automatic titles, rename, and delete.
- Streaming replies, deep thinking, stop, continue, edit, regenerate, and message branches.
- Upload, paste, and drag-and-drop attachments; voice input and read-aloud replies.
- Markdown, syntax highlighting, KaTeX math, and Mermaid diagrams.

### Search and tools

- **Smart search** and **link reading** with source citations. The Tools switches disable the tools; the input toggle only closes search for current use. Search requires link reading; disabling link reading disables the search switch while keeping its state.
- **Custom HTTP tools**: describe an endpoint with JSON Schema, and let the model call it. GET parameters become a query string; other methods send JSON. Results are clipped before they reach the model.
- **Image generation** through OpenAI, Google Gemini, Seedream (Volcengine Ark), DashScope, xAI Grok, Zhipu GLM, or any OpenAI-compatible endpoint.

### Long context and insight

- **Model-driven compression**: the model folds older complete conversation rounds into summaries it writes, while the original messages stay in local storage and can be restored.
- **Analysis panel**: context usage, token breakdown, compressed blocks and payback, cache-hit trend, tool/media counts, and estimated spend / saved / equivalent cost at DeepSeek's official CNY prices.
- **Fixed 1M context target.** The UI does not ask you to choose a window; compression is managed against the model's 1M window.

### Platform

- Simplified Chinese and English.
- Light and dark themes, mobile layouts, and location settings.
- History import/export as portable ZIP archives.
- Consistent motion across dialogs, menus, tooltips, drawers, messages, toasts, search results, and theme switching; `prefers-reduced-motion` is respected everywhere.

## Quick start

### Requirements

- Node.js **22.12+** (the GitHub Pages workflow uses Node 24)
- pnpm (the workflow uses pnpm 12.6)
- A DeepSeek API key, or a compatible API endpoint with the required capabilities

### Run locally

From a checkout of this repository:

```sh
pnpm install
pnpm dev
```

Open <http://127.0.0.1:3040>. On first use, open **Settings** and enter your API key.

### Build a static site

```sh
pnpm build
```

The output is written to `dist/`. Serve it from any static host.

### One-command launcher

Register the bundled launcher once:

```sh
npm link
```

Then `dsgo` starts the development server from any directory and opens the browser:

```sh
dsgo              # http://127.0.0.1:3040, opens the browser
dsgo --no-open    # start only
dsgo --port 4000  # use another port
dsgo --host 0.0.0.0
```

## Configuration

All user configuration lives in **Settings**. It is stored in localStorage under the `seekgo:*` namespace unless noted otherwise.

| Area        | What you configure                                                        |
| ----------- | ------------------------------------------------------------------------- |
| **General** | Language, theme, read-aloud voice, location, and long-context compression |
| **Tools**   | Smart search, link reading, custom HTTP tools, and image generation       |
| **Data**    | Import/export history and delete all local conversations                  |
| **About**   | Version, credits, and third-party license information                     |

### API key and origin

- The API key is sent only to the configured API origin and to any tool/image endpoints you explicitly configure.
- The default origin is `https://api.deepseek.com`.
- To point the app at a compatible gateway, build with a custom origin:

```ts
// rspack.config.ts
export default defineConfig(createConfig({ apiOrigin: 'https://your-gateway.example.com' }))
```

- The chat model is `deepseek-flash`; it is used for normal replies and deep thinking.
- Search, link reading, and other server-tool capabilities must be supported by the API service you use.

### Tools

| Setting              | Behavior                                                                                                                                                                  |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Smart search**     | Declares the server-side search tool when enabled. The input toggle can also close it for current use. Link reading is a prerequisite; disabling it disables this switch. |
| **Read links**       | Declares the server-side link reader; disabling it disables the search switch while keeping its state.                                                                    |
| **Custom tools**     | Each tool has a name, description, method, URL, optional headers, and a JSON Schema for parameters. CORS must be allowed by the endpoint.                                 |
| **Image generation** | Per-provider API key, endpoint, model, and output defaults. See the provider table below.                                                                                 |

Image generation providers and defaults:

| Provider                  | Default model                    | Output controls                                |
| ------------------------- | -------------------------------- | ---------------------------------------------- |
| OpenAI                    | `gpt-image-2.6-flare`            | Pixel size, quality                            |
| Google Gemini             | `gemini-3.1-flash-image`         | Aspect ratio, 1K/2K/4K resolution              |
| Seedream (Volcengine Ark) | `doubao-seedream-5-0-pro-260628` | Size tier, output format, watermark            |
| DashScope (Qwen)          | `qwen-image-3.0`                 | Pixel size                                     |
| xAI Grok                  | `grok-imagine-image-2.0`         | Aspect ratio, 1k/2k resolution                 |
| Zhipu GLM                 | `glm-image`                      | Recommended sizes, HD quality                  |
| OpenAI-compatible         | Any model ID                     | Pixel size, quality, extra JSON request fields |

The model can override the provider, model, size, aspect ratio, resolution, and quality for a single generation when you explicitly ask for it.

> Image endpoints and custom tools must allow **cross-origin browser requests**. SeekGo has no proxy.

### Long-context compression

Enable compression in **Settings → General**. The model decides when to fold older, consumed conversation rounds into summaries using built-in `compress`, `decompress`, `search_context`, and `acp_status` tools.

- Originals are never discarded locally; they can be restored from the compression banner or the analysis panel.
- The target window is fixed at **1M tokens**.
- Compression applies from the next message; the current turn keeps its original history.

### Analysis panel

Open the analysis panel from the session header. It shows:

- Context usage and token composition.
- Active compression blocks and their payback.
- Cache-hit rate and a short trend.
- Tool, image, and attachment counts.
- Estimated spend, cache discount, compression savings, and equivalent cost.

Cost figures are **estimates** based on DeepSeek's published CNY prices (idle base, 2× peak; peak/idle is judged per request and public holidays are not included). Your actual bill is authoritative.

## Usage

1. **Add your API key** in Settings and start a new chat.
2. **Ask normally**, attach files, or use the microphone. Markdown, code, math, and diagrams render inline.
3. **Use the search toggle** in the input to close or reopen search for current use. Disabling smart search in Settings removes the tool; disabling link reading disables the search switch.
4. **Add tools** in Settings → Tools when you want the model to call your own HTTP services.
5. **Generate images** by asking for one; the active image provider is used unless you name another.
6. **Long chats** can be folded into summaries automatically; restore originals whenever you need them.
7. **Export** your history from Settings → Data as a ZIP archive for backup or migration.

## Architecture

SeekGo is a static single-page app. There is no application server, proxy, database, or telemetry service.

| Layer   | Choice                                                      |
| ------- | ----------------------------------------------------------- |
| UI      | React 18, TypeScript, zustand, CSS Modules                  |
| Build   | rspack 2, SWC, Lightning CSS                                |
| Content | Markdown, Prism, KaTeX, Mermaid                             |
| Storage | IndexedDB via `idb`; localStorage for settings              |
| API     | DeepSeek Anthropic-compatible Messages / Files API over SSE |
| Tests   | No automated suite yet; verify behavior manually            |

```text
Browser
  │
  ├─ React UI + zustand stores
  ├─ services/api ────────────────► DeepSeek API
  ├─ custom tools / image APIs ───► endpoints you configure
  └─ IndexedDB + localStorage
```

```text
src/
  app/                 Layout, themes, motion tokens, global styles
  components/          Chat, settings, Markdown, search, analysis, and base UI
  i18n/                Chinese and English strings
  services/
    api/               API client, SSE parsing, protocol types
    chat/              Sessions, branches, storage, history import/export,
                       compression, custom tools, image generation
    markdown/          Markdown parsing, highlighting, diagrams
    speech/            Recording, ASR, and TTS
  utils/               Shared utilities
bin/dsgo.mjs           Optional one-command dev launcher
rspack.config.ts       Build, dev server, and API origin configuration
```

## Data and privacy

| Data                                             | Where it lives                | When it leaves the browser                                                                         |
| ------------------------------------------------ | ----------------------------- | -------------------------------------------------------------------------------------------------- |
| API key                                          | localStorage                  | Sent to the configured API origin. Custom tools and image providers use their own keys or headers. |
| Conversations, messages, branches                | IndexedDB (`seekgo` database) | Included in chat requests to the API service                                                       |
| Attachments and generated images                 | IndexedDB / conversation data | Uploaded or referenced in requests when used                                                       |
| Settings, custom tool definitions, provider keys | localStorage (`seekgo:*`)     | Tool calls go directly to the endpoint you configure                                               |
| History exports                                  | Downloaded ZIP file           | Only when you choose to share the file                                                             |

- **No analytics or telemetry.** SeekGo does not include third-party tracking scripts.
- **API keys are not encrypted.** They are stored in browser storage; use a trusted device and browser profile.
- **Clearing site data deletes local chats and settings.** Export first if you need a backup.
- **External services see what you send them.** The API origin, custom tool endpoints, and image providers each receive the relevant prompt, file, or key.
- **Generated image URLs may expire.** Base64 results are stored with the conversation; URL results may stop loading later.
- **Files already uploaded to the API service are not deleted** when you delete local conversations.

## Deployment

The build output is a static site:

```sh
pnpm build
# deploy dist/
```

The repository includes a GitHub Pages workflow (`.github/workflows/pages.yml`) that runs type checks, lint, and build on every push to `main`, then deploys `dist/`. Enable **Settings → Pages → Source: GitHub Actions** in the repository to use it.

- To deploy under a subpath, configure the static host and the rspack `publicPath` accordingly.
- Opening `dist/index.html` directly via `file://` works only if the browser allows storage on file pages and the API service permits cross-origin requests. A local static server is more reliable.

## Development

### Commands

| Command       | Description                               |
| ------------- | ----------------------------------------- |
| `pnpm dev`    | Start the development server on port 3040 |
| `dsgo`        | Start from any directory after `npm link` |
| `pnpm build`  | Build the production site into `dist/`    |
| `pnpm type`   | Run TypeScript checks                     |
| `pnpm lint`   | Lint with oxlint                          |
| `pnpm format` | Format with oxfmt                         |

### Before opening a pull request

Run all three checks:

```sh
pnpm type
pnpm lint
pnpm build
```

There is no automated test suite yet, so also verify the relevant UI path manually.

### Project conventions

- Read [`AGENTS.md`](AGENTS.md) before making changes.
- Local imports use explicit `.js` extensions.
- Styles are CSS Modules; use `--dsw-*` and `--ds-motion-*` design tokens rather than hard-coded colors or durations.
- User-visible copy must be added to `src/i18n/zh.ts` first, then `src/i18n/en.ts`.
- New animations must respect `prefers-reduced-motion`.
- The assistant system prompt is upstream text; do not rebrand it.

### API origin

`rspack.config.ts` injects `__API_ORIGIN__` at build time. The default is `https://api.deepseek.com`; use `createConfig({ apiOrigin, devServer })` to customize the API origin and development proxy.

## Troubleshooting

| Symptom                            | Likely cause                                                                                                            |
| ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| API key is rejected                | The key is invalid, expired, or the API origin does not match the key's service.                                        |
| Search button is disabled          | Smart search is disabled in Tools, or link reading is disabled (the search switch is disabled while its state is kept). |
| Custom tool or image request fails | The endpoint does not allow cross-origin browser requests, the key is missing, or the endpoint path is wrong.           |
| Generated image link stops working | The provider returned a temporary URL; regenerate or use a provider that returns base64 data.                           |
| Chats disappeared                  | Site data or the browser profile was cleared; restore from an exported ZIP if available.                                |
| Cost panel differs from the bill   | The panel estimates list prices; peak/idle, cache behavior, and billing adjustments can differ.                         |

## Contributing

Contributions are welcome:

1. Open an issue for bugs, feature requests, or design proposals before large changes.
2. Keep the change focused and update both language files when adding user-visible text.
3. Run `pnpm type`, `pnpm lint`, and `pnpm build`.
4. Describe the behavior change and how you verified it in the pull request.

Please do not paste real API keys, tokens, or private conversation data into issues or pull requests.

## License

[MIT](LICENSE). The UI is based on [deepseek-ai/chat-demo](https://github.com/deepseek-ai/chat-demo), also MIT.

SeekGo also includes functional ports of:

- [dsh-image-gen](https://github.com/shanliuling/dsh-image-gen) — Apache License 2.0.
- [billion-context](https://github.com/ranxianglei/billion-context) — MIT with an additional attribution term.

See [NOTICE](NOTICE) and [`licenses/`](licenses/) for the full attributions and license texts. The production build copies `LICENSE`, `NOTICE`, and `licenses/` into `dist/`; keep them when redistributing the app. Third-party dependencies remain under their own licenses.

The SeekGo logo is based on the whale-girl character, was adapted and generated with GPT Image 2.5, and remains under the original [CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/) license. The MIT license above covers the source code, not the logo.

### Logo character attribution (CC BY-NC-SA 4.0)

The following attribution is provided under the CC BY-NC-SA 4.0 license. The whale-girl in the SeekGo logo is adapted from character designs and fan-created material by these creators; the original copyright remains with them.

- Bilibili ZipZipPipe — <https://space.bilibili.com/4168597>
- Bilibili 上善无形 — <https://space.bilibili.com/4456176>

## Acknowledgements

- [deepseek-ai/chat-demo](https://github.com/deepseek-ai/chat-demo) for the original interface.
- [shanliuling/dsh-image-gen](https://github.com/shanliuling/dsh-image-gen) for the image-generation design and provider model.
- [ranxianglei/billion-context](https://github.com/ranxianglei/billion-context) for the model-driven context-compression approach.
- The React, rspack, KaTeX, Mermaid, Prism, and idb communities.
