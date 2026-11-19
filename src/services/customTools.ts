import { create } from 'zustand'
import { createId } from '../utils/id.js'
import type { TranslationKey } from '../i18n/index.js'

/** 自定义 HTTP 工具的请求方法；非 GET 会把模型参数作为 JSON 请求体发送。 */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

/** 用户在「工具配置」里新增的客户端工具；声明给模型，由浏览器请求接口并回传结果。 */
export type CustomTool = {
  id: string
  /** 暴露给模型的唯一名称 */
  name: string
  description: string
  method: HttpMethod
  url: string
  /** 额外请求头，值只支持字符串 */
  headers: Record<string, string>
  /** 顶层 type 必须为 object 的 JSON Schema */
  inputSchema: Record<string, unknown>
  enabled: boolean
}

/** 编辑器里的原始文本，JSON 字段保留用户输入，保存时才解析。 */
export type CustomToolDraft = {
  name: string
  description: string
  method: HttpMethod
  url: string
  headers: string
  inputSchema: string
}

export const CUSTOM_TOOLS_KEY = 'seekgo:custom-tools'
export const CUSTOM_TOOL_NAME_PATTERN = /^[a-zA-Z0-9_-]{1,128}$/
export const DEFAULT_INPUT_SCHEMA = `{
  "type": "object",
  "properties": {},
  "required": []
}`

/** 与服务端工具同名的自定义工具会被 API 拒绝，提前拦住。 */
const RESERVED_NAMES = new Set([
  'web_search',
  'web_fetch',
  'deepseek_web_search',
  'deepseek_read_url',
  'generate_image',
  'compress',
  'decompress',
  'search_context',
  'acp_status',
])

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const readString = (value: unknown) => (typeof value === 'string' ? value : '')

const readHeaders = (value: unknown) => {
  if (!isRecord(value)) {
    return null
  }
  const headers: Record<string, string> = {}
  for (const [key, header] of Object.entries(value)) {
    if (typeof header !== 'string') {
      return null
    }
    headers[key] = header
  }
  return headers
}

type CustomToolParseFailure = { ok: false; key: TranslationKey }
type CustomToolParseSuccess = { ok: true; value: Omit<CustomTool, 'id' | 'enabled'> }
export type CustomToolParseResult = CustomToolParseSuccess | CustomToolParseFailure

/** 校验编辑器草稿；名称冲突需要结合现有列表，因此由调用方传入当前工具 ID。 */
export const parseCustomToolDraft = (
  draft: CustomToolDraft,
  existingId?: string
): CustomToolParseResult => {
  const name = draft.name.trim()
  if (!name) {
    return { ok: false, key: 'toolNameRequired' }
  }
  if (!CUSTOM_TOOL_NAME_PATTERN.test(name)) {
    return { ok: false, key: 'toolNameInvalid' }
  }
  if (RESERVED_NAMES.has(name)) {
    return { ok: false, key: 'toolNameReserved' }
  }
  if (
    useCustomTools.getState().tools.some((tool) => tool.name === name && tool.id !== existingId)
  ) {
    return { ok: false, key: 'toolNameTaken' }
  }
  const description = draft.description.trim()
  if (!description) {
    return { ok: false, key: 'toolDescriptionRequired' }
  }
  let url: URL
  try {
    url = new URL(draft.url.trim())
  } catch {
    return { ok: false, key: 'toolUrlInvalid' }
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return { ok: false, key: 'toolUrlInvalid' }
  }
  let headers: Record<string, string> = {}
  if (draft.headers.trim()) {
    let parsed: unknown
    try {
      parsed = JSON.parse(draft.headers)
    } catch {
      return { ok: false, key: 'toolHeadersInvalid' }
    }
    const normalized = readHeaders(parsed)
    if (!normalized) {
      return { ok: false, key: 'toolHeadersInvalid' }
    }
    headers = normalized
  }
  let inputSchema: unknown
  try {
    inputSchema = JSON.parse(draft.inputSchema)
  } catch {
    return { ok: false, key: 'toolSchemaInvalid' }
  }
  if (!isRecord(inputSchema)) {
    return { ok: false, key: 'toolSchemaInvalid' }
  }
  if (inputSchema.type !== 'object') {
    return { ok: false, key: 'toolSchemaType' }
  }
  if ('properties' in inputSchema && !isRecord(inputSchema.properties)) {
    return { ok: false, key: 'toolSchemaInvalid' }
  }
  return {
    ok: true,
    value: {
      name,
      description,
      method: draft.method,
      url: draft.url.trim(),
      headers,
      inputSchema,
    },
  }
}

/** 读出本机保存的工具；单条损坏时跳过，不影响其他工具。 */
const loadCustomTools = (): CustomTool[] => {
  let raw: string | null = null
  try {
    raw = localStorage.getItem(CUSTOM_TOOLS_KEY)
  } catch {
    return []
  }
  if (!raw) {
    return []
  }
  try {
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) {
      return []
    }
    const tools: CustomTool[] = []
    for (const item of parsed) {
      if (!isRecord(item)) {
        continue
      }
      const id = readString(item.id)
      const name = readString(item.name)
      const description = readString(item.description)
      const headers = readHeaders(item.headers)
      const inputSchema = item.inputSchema
      const method = item.method
      if (
        !id ||
        !CUSTOM_TOOL_NAME_PATTERN.test(name) ||
        RESERVED_NAMES.has(name) ||
        !description ||
        !headers ||
        !isRecord(inputSchema) ||
        inputSchema.type !== 'object' ||
        ('properties' in inputSchema && !isRecord(inputSchema.properties)) ||
        (method !== 'GET' &&
          method !== 'POST' &&
          method !== 'PUT' &&
          method !== 'PATCH' &&
          method !== 'DELETE')
      ) {
        continue
      }
      const rawUrl = readString(item.url)
      let url: URL
      try {
        url = new URL(rawUrl)
      } catch {
        continue
      }
      if (url.protocol !== 'http:' && url.protocol !== 'https:') {
        continue
      }
      tools.push({
        id,
        name,
        description,
        method,
        url: rawUrl,
        headers,
        inputSchema,
        enabled: item.enabled !== false,
      })
    }
    return tools.filter(
      (tool, index, list) => list.findIndex((item) => item.name === tool.name) === index
    )
  } catch {
    return []
  }
}

export const useCustomTools = create<{ tools: CustomTool[] }>(() => ({
  tools: loadCustomTools(),
}))

const persistCustomTools = (tools: CustomTool[]) => {
  try {
    localStorage.setItem(CUSTOM_TOOLS_KEY, JSON.stringify(tools))
  } catch {
    // 存储不可用时只在内存中生效
  }
  useCustomTools.setState({ tools })
}

/** 新增工具，默认启用；返回创建出的完整工具。 */
export const addCustomTool = (value: Omit<CustomTool, 'id' | 'enabled'>): CustomTool => {
  const tool: CustomTool = { ...value, id: createId(), enabled: true }
  persistCustomTools([...useCustomTools.getState().tools, tool])
  return tool
}

export const updateCustomTool = (tool: CustomTool) => {
  persistCustomTools(
    useCustomTools.getState().tools.map((item) => (item.id === tool.id ? tool : item))
  )
}

export const removeCustomTool = (id: string) => {
  persistCustomTools(useCustomTools.getState().tools.filter((tool) => tool.id !== id))
}

export const setCustomToolEnabled = (id: string, enabled: boolean) => {
  persistCustomTools(
    useCustomTools.getState().tools.map((tool) => (tool.id === id ? { ...tool, enabled } : tool))
  )
}

export const getCustomTool = (name: string) =>
  useCustomTools.getState().tools.find((tool) => tool.name === name)

/** 请求时只声明启用的工具 */
export const enabledCustomTools = () =>
  useCustomTools.getState().tools.filter((tool) => tool.enabled)
