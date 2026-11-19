# AGENTS.md

Project instructions for coding agents. Human-facing docs: [README.md](README.md) / [README.zh-CN.md](README.zh-CN.md).

## What this is

SeekGo is a static, browser-only AI chat app powered by the DeepSeek API (Anthropic-compatible Messages / Files endpoints). There is no application backend: the browser calls the configured API origin directly and keeps conversations in IndexedDB/localStorage unless the user exports them.

The UI derives from [deepseek-ai/chat-demo](https://github.com/deepseek-ai/chat-demo) (MIT). SeekGo re-brands it and completes the motion design.

Stack: React 18 · TypeScript (strict) · rspack 2 (SWC + lightningcss) · zustand · CSS Modules · IndexedDB (`idb`) · KaTeX / Mermaid / Prism.

## Commands

| Command        | What it does                                                                 |
| -------------- | ---------------------------------------------------------------------------- |
| `pnpm install` | Install dependencies (Node 22.12+, pnpm)                                     |
| `pnpm dev`     | Dev server on http://127.0.0.1:3040 with HMR                                 |
| `pnpm type`    | `tsc --noEmit`; strict, including `noUnusedLocals` / `noUnusedParameters`    |
| `pnpm lint`    | `oxlint src rspack.config.ts`; should report 0 warnings                        |
| `pnpm build`   | Production build into `dist/` (`cross-env` sets `NODE_ENV=production`)       |
| `pnpm format`  | `oxfmt --write .` over the **whole repo** — see the formatting caveat below  |
| `dsgo`         | Global launcher after `npm link`: starts the dev server and opens the browser |

`dsgo` flags: `--no-open` (do not open the browser), `--port <n>`, `--host <addr>`. It is a thin wrapper around `rspack serve` (`bin/dsgo.mjs`) and passes `DSGO_PORT` / `DSGO_HOST` / `DSGO_OPEN` to `rspack.config.ts`.

Definition of done for a change: `pnpm type` and `pnpm lint` pass; run `pnpm build` for build-affecting work; verify UI behavior in the browser when behavior or visuals change. There is no test suite.

## Repo map

```text
bin/dsgo.mjs          one-command launcher (spawns the rspack CLI)
rspack.config.ts      build/dev config, __API_ORIGIN__ define, asset rules, favicon
src/app/              layout, theme.css tokens, global.css, motion.ts, viewport.ts
src/components/       base UI, chat input, messages, markdown, search, session, settings, sider
src/i18n/             zh.ts (source of truth) and en.ts (typed against zh)
src/services/         api (SSE/client), chat (store, db, history ZIP), markdown, speech
src/utils/            small helpers
src/assets/           SeekGo mark and favicon
```

Key files:

- `src/services/chat/store.ts` — chat state machine: send / regenerate / edit / continue / stop, streaming, system prompt, model.
- `src/services/chat/db.ts` — IndexedDB schema (database `seekgo`, version 11).
- `src/services/settings.ts` — localStorage settings (`seekgo:*` keys, legacy `chat-demo:*` migration).
- `src/app/motion.ts` — `usePresence` (exit animations) and reduced-motion helper.
- `src/services/chat/history/README.md` — ZIP history archive format (v3, Chinese).

## Conventions

- **Imports** of local TypeScript files use explicit `.js` extensions (`tsconfig` is `NodeNext`; rspack has `extensionAlias`). Keep this pattern.
- **Styles** are CSS Modules only, imported as `import styles from './X.module.css'`; class names are camelCase and nested selectors are allowed. Some modules have a sibling `*.module.css.d.ts`; when you add or remove classes there, update that declaration too (no repo script generates it).
- **Copy / i18n**: never hardcode user-visible strings. Add keys to `src/i18n/zh.ts` first, then `src/i18n/en.ts` (its type requires every zh key). Use `useTranslate()` in components and `translate()` outside React.
- **State**: zustand stores. Chat state lives in `services/chat/store.ts`; don’t introduce parallel copies or prop-drilled duplicates.
- **Comments** in the codebase are Chinese. Keep new comments short and focused on “why”, consistent with the surrounding code.
- **Design tokens**: colors and surfaces come from `--dsw-*`; motion comes from `--ds-motion-*` in `src/app/theme.css`. Don’t hardcode durations or easing curves.
- **Animations**:
  - Enter animations are plain CSS animations on mount.
  - Elements that must animate out stay mounted for the exit duration via `usePresence(open, ms)` from `src/app/motion.ts` plus a `closing` class; the presence timer must match the CSS duration.
  - New motion must respect reduced motion: `prefersReducedMotion()` in JS and the global rule in `src/app/global.css`.
- **Branding**: product name is “SeekGo”; logo is `src/assets/seekgo-mark.png`; the favicon is injected by `HtmlRspackPlugin`. Storage namespace is `seekgo` (localStorage keys, IndexedDB database). Export archives are named `seekgo_data-YYYY-MM-DD.zip` and still import DeepSeek exports.
- **API**: requests go to `__API_ORIGIN__` (compile-time define, default `https://api.deepseek.com`) under `/anthropic/v1`. The API key is entered by the user and kept in localStorage only. Do not add a backend or a proxy.
- **The assistant system prompt is upstream text** (`该助手为DeepSeek，由深度求索公司创造。` in `store.ts`). Don’t rebrand it unless explicitly asked.

## Gotchas

- Changing `rspack.config.ts` or `src/index.html` requires restarting the dev server; HMR covers source modules only.
- `pnpm build` uses `cross-env` on purpose. Don’t rewrite it as `NODE_ENV=...` (fails on Windows).
- `pnpm format` rewrites the entire repo; on Windows it writes LF line endings into a CRLF checkout and touches many untouched files. Prefer formatting only what you changed: `pnpm exec oxfmt --write <paths>`. If `git status` lists files you didn’t edit, check `git diff` first — it is often stat/EOL noise, not content.
- Without an API key the app opens Settings on load. A fake key lets you exercise the UI, but chat requests will fail (401) and render an error reply.
- `dist/` and `node_modules/` are gitignored. Never commit build output.
- Keep existing accessibility semantics: dialogs/overlays manage Esc, roles and aria labels; treat them as part of the feature, not decoration.

## Common tasks

- **Add a UI string**: add to `src/i18n/zh.ts`, then `src/i18n/en.ts`, then use `t('key')`.
- **Add an animation**: reuse `--ds-motion-*`; entry animation in CSS, exit via `usePresence`; check the reduced-motion path.
- **Rename / rebrand**: `src/index.html`, `src/i18n/*`, `src/assets/*`, `package.json`, both READMEs, storage keys in `services/settings.ts` and `db.ts`, archive name in `services/chat/backup.ts`.
- **Change history archive format**: keep `export_format_version` handling in `src/services/chat/history/` consistent (`format.ts`, `schema.ts`, `toArchive.ts`, `toLocal.ts`, `paths.ts`) and update its README.
