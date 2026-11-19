# SeekGo

English | [简体中文](README.zh-CN.md)

SeekGo is a static AI chat app powered by the DeepSeek API. There is no application backend: the browser talks to the configured API service directly, and conversations stay in the browser unless you export them.

The interface is built on [deepseek-ai/chat-demo](https://github.com/deepseek-ai/chat-demo) (MIT). SeekGo re-brands it and completes the motion design: dialogs, menus, tooltips, the sidebar drawer, messages, toasts, search results, and theme switching all have consistent enter/exit animation, and everything respects `prefers-reduced-motion`.

## Getting started

Install Node.js 22.12+ and pnpm, then run:

```sh
pnpm install
pnpm dev
```

Open http://127.0.0.1:3040. Enter your API key in Settings before your first chat.

To build the static site:

```sh
pnpm build
```

### One-command start

Register the launcher once from the project directory:

```sh
npm link
```

Afterwards `dsgo` starts the same dev server from any directory and opens the browser:

```sh
dsgo              # http://127.0.0.1:3040, opens the browser
dsgo --no-open    # start only, keep the browser closed
dsgo --port 4000  # use another port
dsgo --host 0.0.0.0

The output is written to `dist/`. Deploy it to a static web server or open `dist/index.html` directly. Opening the file directly requires browser support for storage on `file://` pages and an API service that permits their cross-origin requests.

## Features

- Multiple conversations with automatic titles, renaming, and deletion; edit prompts, regenerate replies, and switch between message branches.
- Streaming replies, deep thinking, smart search, link reading, and source citations; stop generation or continue eligible replies.
- Upload, paste, or drag and drop attachments; use voice input and read replies aloud. A live audio spectrum appears in the first row of the input area while recording on mobile.
- Markdown, syntax highlighting, KaTeX math, and Mermaid diagrams.
- Simplified Chinese and English, light and dark themes, mobile layouts, location settings, and chat history import and export.
- A complete motion layer: animated dialog/drawer enter and exit, anchored menus and tooltips, sidebar collapse, message entrance, search panel slide-in, toast exit, and a cross-fade when switching themes.

## Motion and branding

Motion tokens live in [`src/app/theme.css`](src/app/theme.css) (`--ds-motion-*`), and the shared presence helper lives in [`src/app/motion.ts`](src/app/motion.ts). Overlay components keep themselves mounted for the exit duration and then hand control back to the caller. The reduced-motion rule is global in [`src/app/global.css`](src/app/global.css).

The SeekGo mark (an abstract blue whale-girl holding a magnifier) lives in [`src/assets/seekgo-mark.png`](src/assets/seekgo-mark.png) and is used by the sidebar and the empty state; the favicon is generated from [`src/assets/seekgo-favicon.png`](src/assets/seekgo-favicon.png) and injected by the build. Page metadata lives in [`src/index.html`](src/index.html).

## Data and storage

Your API key and settings are stored in the browser's localStorage (`seekgo:*` keys). Conversations and original attachments are stored in IndexedDB (`seekgo` database). Local data is isolated by browser profile and site origin. Sending messages, uploading attachments, and using speech features sends the relevant content to the configured API service.

History import and export in Settings use ZIP archives named `seekgo_data-YYYY-MM-DD.zip`. After confirmation and successful validation, importing replaces all local conversations and attachments. Exports include conversations and locally available original images, but exclude API keys, settings, and original non-image attachments. See the [history import/export documentation (Chinese)](src/services/chat/history/README.md) for the archive format and preservation details.

Settings → Data → Delete all chats clears all local conversations, original attachments, and unsent drafts after confirmation. It stops ongoing replies and returns to a new chat. Your API key and settings are preserved; files already uploaded to the API service are not deleted.

## Development

| Command       | Description                  |
| ------------- | ---------------------------- |
| `pnpm dev`    | Start the development server |
| `dsgo`        | Start from any directory (after `npm link`) |
| `pnpm build`  | Build into `dist/`           |
| `pnpm type`   | Run TypeScript type checks   |
| `pnpm lint`   | Lint with oxlint             |
| `pnpm format` | Format with oxfmt            |

[rspack.config.ts](rspack.config.ts) uses `https://api.deepseek.com` by default. Use `createConfig({ apiOrigin, devServer })` to customize the API origin and development server proxy.

Chat uses `deepseek-flash` by default through Anthropic-compatible Messages / Files APIs. Speech features use ASR / TTS endpoints. Requests include extensions for search, link reading, titles, and `latest_reminder`, so the configured service must support the corresponding capabilities. Supported attachment formats are determined by server-side validation.

```text
src/
  app/                 Application layout, themes, motion tokens, and global styles
  components/          Chat, settings, Markdown, and other UI components
  i18n/                English and Chinese translations
  services/
    api/               API requests, SSE, and protocol types
    chat/              Conversations, message branches, storage, and history import/export
    markdown/          Markdown parsing, syntax highlighting, and diagrams
    speech/            Audio recording and read-aloud playback
  utils/               Shared utilities
```

## License

[MIT](LICENSE). The UI originates from [deepseek-ai/chat-demo](https://github.com/deepseek-ai/chat-demo), also MIT. The build copies the license to `dist/LICENSE`; include it when distributing the app. Third-party dependencies are subject to their own licenses.
