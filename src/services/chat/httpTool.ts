import { translate } from '../../i18n/index.js'
import type { CustomTool } from '../customTools.js'

/** 单次工具调用的结果；错误也作为 tool_result 交给模型，让它决定怎么解释。 */
export type ToolRunResult = {
  content: string
  isError: boolean
}

/** 单次请求超时 */
const TIMEOUT_MS = 30_000
/** 工具结果上限，避免把上下文一次撑爆 */
const MAX_RESULT_CHARS = 20_000
/** 带 content-length 且明显过大时不读取响应体 */
const MAX_RESULT_BYTES = 2_000_000

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const queryValue = (value: unknown): string => {
  if (typeof value === 'string') {
    return value
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value)
  }
  return JSON.stringify(value) ?? ''
}

const hasHeader = (headers: Record<string, string>, name: string) =>
  Object.keys(headers).some((key) => key.toLowerCase() === name)

/** 前端工具的参数格式不固定，结果只保留前若干字符，并明确告知模型被截断。 */
const clipResult = (text: string) => {
  if (text.length <= MAX_RESULT_CHARS) {
    return text
  }
  return `${text.slice(0, MAX_RESULT_CHARS)}\n${translate('toolResultTruncated')}`
}

/**
 * 执行一次自定义 HTTP 工具：
 * - URL 里的 {{name}} 用同名参数替换；
 * - GET 把剩余参数拼到查询串，其余方法用参数作为 JSON 请求体；
 * - 配置的请求头原样带上，自动补 Content-Type / Accept；
 * - 网络、超时、非 2xx、空响应都返回可读文本，不向调用方抛错。
 */
export const runCustomTool = async (
  tool: CustomTool,
  input: unknown,
  signal: AbortSignal
): Promise<ToolRunResult> => {
  if (signal.aborted) {
    return { content: translate('toolRequestStopped'), isError: true }
  }
  const values = isRecord(input) ? input : {}
  const usedInPath = new Set<string>()
  let url: URL
  try {
    const template = tool.url.replace(
      /\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}/g,
      (placeholder, name: string) => {
        if (!Object.hasOwn(values, name)) {
          return placeholder
        }
        usedInPath.add(name)
        return encodeURIComponent(queryValue(values[name]))
      }
    )
    url = new URL(template)
  } catch {
    return { content: translate('toolUrlInvalid'), isError: true }
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return { content: translate('toolUrlInvalid'), isError: true }
  }

  const method = tool.method
  const headers: Record<string, string> = { ...tool.headers }
  let body: string | undefined
  if (method === 'GET') {
    for (const [key, value] of Object.entries(values)) {
      if (!usedInPath.has(key) && value !== undefined && value !== null) {
        url.searchParams.set(key, queryValue(value))
      }
    }
  } else {
    body = JSON.stringify(values)
    if (!hasHeader(headers, 'content-type')) {
      headers['Content-Type'] = 'application/json'
    }
  }
  if (!hasHeader(headers, 'accept')) {
    headers.Accept = 'application/json, text/plain, */*'
  }

  // 同时响应页面停止（streamReply 的 signal）和单次超时。
  const controller = new AbortController()
  const abort = () => controller.abort()
  signal.addEventListener('abort', abort, { once: true })
  const timer = window.setTimeout(abort, TIMEOUT_MS)
  let response: Response
  try {
    response = await fetch(url, {
      method,
      headers,
      body,
      signal: controller.signal,
      credentials: 'omit',
      cache: 'no-store',
    })
  } catch (error) {
    if (signal.aborted) {
      return { content: translate('toolRequestStopped'), isError: true }
    }
    if (controller.signal.aborted) {
      return { content: translate('toolRequestTimeout'), isError: true }
    }
    const message = error instanceof Error ? error.message : String(error)
    return {
      content: translate('toolRequestFailed', { message }),
      isError: true,
    }
  } finally {
    window.clearTimeout(timer)
    signal.removeEventListener('abort', abort)
  }

  const declaredLength = Number(response.headers.get('content-length') ?? 0)
  if (declaredLength > MAX_RESULT_BYTES) {
    return { content: translate('toolResultTooLarge'), isError: true }
  }
  const text = (await response.text().catch(() => '')).trim()
  if (!response.ok) {
    const detail = text ? `\n${clipResult(text)}` : ''
    return {
      content: `${translate('toolHttpError', { status: response.status })}${detail}`,
      isError: true,
    }
  }
  if (!text) {
    return { content: translate('toolEmptyResponse'), isError: false }
  }
  const contentType = response.headers.get('Content-Type') ?? ''
  if (contentType.includes('json')) {
    try {
      return { content: clipResult(JSON.stringify(JSON.parse(text), null, 2)), isError: false }
    } catch {
      // 声明为 JSON 但解析失败时按原文返回
    }
  }
  return { content: clipResult(text), isError: false }
}
