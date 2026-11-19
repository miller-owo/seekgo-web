#!/usr/bin/env node
/**
 * dsgo —— SeekGo 一行命令启动器。
 * 在任意目录执行 dsgo，都会以本项目为工作目录启动 rspack 开发服务器。
 */
import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const rspackCli = path.join(root, 'node_modules', '@rspack', 'cli', 'bin', 'rspack.js')

const help = `SeekGo launcher

用法：
  dsgo                 启动开发服务器并打开浏览器（默认 http://127.0.0.1:3040）
  dsgo --no-open       启动服务器，不打开浏览器
  dsgo --port <端口>   指定端口
  dsgo --host <地址>   指定监听地址，例如 0.0.0.0
  dsgo --help          显示这份说明`

const args = process.argv.slice(2)
const options = { port: process.env.DSGO_PORT ?? '3040', host: '', open: true }

for (let i = 0; i < args.length; i++) {
  const arg = args[i]
  if (arg === '--port' || arg === '-p') {
    options.port = args[++i] ?? options.port
  } else if (arg === '--host' || arg === '-H') {
    options.host = args[++i] ?? ''
  } else if (arg === '--no-open') {
    options.open = false
  } else if (arg === '--help' || arg === '-h') {
    console.log(help)
    process.exit(0)
  } else {
    console.error(`未知参数：${arg}\n`)
    console.log(help)
    process.exit(1)
  }
}

if (!existsSync(rspackCli)) {
  console.error('还没有安装依赖，请先在项目目录运行：\n\n  pnpm install\n')
  process.exit(1)
}

const env = { ...process.env, DSGO_PORT: String(options.port), DSGO_OPEN: options.open ? '1' : '0' }
if (options.host) {
  env.DSGO_HOST = options.host
}

const shownHost = options.host || '127.0.0.1'
console.log(`\n  SeekGo\n  ➜  http://${shownHost}:${options.port}/\n`)

const child = spawn(process.execPath, [rspackCli, 'serve', '-c', 'rspack.config.ts'], {
  cwd: root,
  stdio: 'inherit',
  env,
})

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal)
  } else {
    process.exit(code ?? 0)
  }
})
