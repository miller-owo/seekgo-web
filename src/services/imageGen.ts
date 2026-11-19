import { create } from 'zustand'
import { createId } from '../utils/id.js'
import type { ClientTool } from './api/types.js'

/** 纯前端能直连的云 Provider；ComfyUI/订阅账号依赖宿主代理，不在此列。 */
export const IMAGE_PROVIDERS = [
  'openai-compat',
  'openai',
  'google',
  'seedream',
  'dashscope',
  'xai',
  'zhipu',
] as const

export type ImageProvider = (typeof IMAGE_PROVIDERS)[number]

export const IMAGE_PROVIDER_LABELS: Record<ImageProvider, string> = {
  'openai-compat': 'OpenAI 兼容',
  openai: 'OpenAI',
  google: 'Google Gemini',
  seedream: 'Seedream（火山方舟）',
  dashscope: 'DashScope（通义万相）',
  xai: 'Grok（xAI）',
  zhipu: 'GLM（智谱）',
}

export const IMAGE_MODEL_PRESETS: Record<ImageProvider, string[]> = {
  'openai-compat': [],
  openai: ['gpt-image-2.6-flare', 'gpt-image-2.6', 'gpt-image-1', 'dall-e-3'],
  google: ['gemini-3.1-flash-image', 'gemini-2.5-flash-image'],
  seedream: [
    'doubao-seedream-5-0-pro-260628',
    'doubao-seedream-5-0-260128',
    'doubao-seedream-4-5-251128',
  ],
  dashscope: ['qwen-image-3.0', 'wanx2.1-t2i-turbo'],
  xai: ['grok-imagine-image-2.0'],
  zhipu: ['glm-image', 'cogview-4'],
}

export const IMAGE_ASPECT_RATIOS = [
  '1:1',
  '3:2',
  '2:3',
  '4:3',
  '3:4',
  '4:5',
  '5:4',
  '16:9',
  '9:16',
  '21:9',
] as const

const OPENAI_SIZES = [
  '1024x1024',
  '1536x1024',
  '1024x1536',
  '1152x864',
  '864x1152',
  '1536x864',
  '864x1536',
  'auto',
]
const SEEDREAM_SIZES = ['1K', '1.5K', '2K', '3K', '4K']
const DASHSCOPE_SIZES = [
  '1024x1024',
  '1536x1024',
  '1024x1536',
  '1152x864',
  '864x1152',
  '1664x928',
  '928x1664',
]
const ZHIPU_SIZES = [
  '1280x1280',
  '1568x1056',
  '1056x1568',
  '1472x1088',
  '1088x1472',
  '1728x960',
  '960x1728',
]
const QUALITIES = ['auto', 'low', 'medium', 'high']
const GOOGLE_IMAGE_SIZES = ['1K', '2K', '4K']
const XAI_IMAGE_SIZES = ['1k', '2k']

export type ImageCapability = {
  sizes: string[]
  ratios: string[]
  imageSizes: string[]
  qualities: string[]
}

/** 各 Provider 暴露给设置面板的输出参数，按原插件的能力表整理。 */
export const IMAGE_CAPABILITIES: Record<ImageProvider, ImageCapability> = {
  'openai-compat': {
    sizes: OPENAI_SIZES,
    ratios: [],
    imageSizes: [],
    qualities: QUALITIES,
  },
  openai: { sizes: OPENAI_SIZES, ratios: [], imageSizes: [], qualities: QUALITIES },
  google: {
    sizes: [],
    ratios: [...IMAGE_ASPECT_RATIOS],
    imageSizes: GOOGLE_IMAGE_SIZES,
    qualities: [],
  },
  seedream: { sizes: SEEDREAM_SIZES, ratios: [], imageSizes: [], qualities: [] },
  dashscope: { sizes: DASHSCOPE_SIZES, ratios: [], imageSizes: [], qualities: [] },
  xai: {
    sizes: [],
    ratios: ['auto', '1:1', '3:2', '2:3', '4:3', '3:4', '16:9', '9:16', '21:9'],
    imageSizes: XAI_IMAGE_SIZES,
    qualities: [],
  },
  zhipu: { sizes: ZHIPU_SIZES, ratios: [], imageSizes: [], qualities: ['hd'] },
}

export type ImageProviderSettings = {
  apiKey: string
  endpoint: string
  model: string
  /** 像素尺寸或 Seedream 的 1K/2K 档位 */
  size: string
  aspectRatio: string
  imageSize: string
  quality: string
  /** OpenAI 兼容接口的额外 JSON 请求字段 */
  extraBody: string
}

export type SeedreamOptions = {
  outputFormat: 'jpeg' | 'png'
  watermark: boolean
}

export type ImageGenSettings = {
  enabled: boolean
  provider: ImageProvider
  providers: Record<ImageProvider, ImageProviderSettings>
  seedream: SeedreamOptions
}

const IMAGE_TOOL_NAME = 'generate_image'
export { IMAGE_TOOL_NAME }
const MAX_IMAGE_COUNT = 4
const MAX_IMAGE_CHARS = 36_000_000
const MAX_TOTAL_CHARS = 80_000_000
const TIMEOUT_MS = 180_000
const SETTINGS_KEY = 'seekgo:image-gen'
const LEGACY_KEYS = {
  enabled: 'seekgo:image-enabled',
  endpoint: 'seekgo:image-endpoint',
  apiKey: 'seekgo:image-api-key',
  model: 'seekgo:image-model',
  size: 'seekgo:image-size',
} as const

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const readString = (value: unknown, fallback = '') => (typeof value === 'string' ? value : fallback)

const defaultProviderSettings = (provider: ImageProvider): ImageProviderSettings => {
  switch (provider) {
    case 'openai':
      return {
        apiKey: '',
        endpoint: 'https://api.openai.com/v1',
        model: 'gpt-image-2.6-flare',
        size: 'auto',
        aspectRatio: '1:1',
        imageSize: '1K',
        quality: 'auto',
        extraBody: '',
      }
    case 'google':
      return {
        apiKey: '',
        endpoint: 'https://generativelanguage.googleapis.com/v1beta',
        model: 'gemini-3.1-flash-image',
        size: '',
        aspectRatio: '1:1',
        imageSize: '1K',
        quality: '',
        extraBody: '',
      }
    case 'seedream':
      return {
        apiKey: '',
        endpoint: 'https://ark.cn-beijing.volces.com/api/v3',
        model: 'doubao-seedream-5-0-pro-260628',
        size: '2K',
        aspectRatio: '1:1',
        imageSize: '',
        quality: '',
        extraBody: '',
      }
    case 'dashscope':
      return {
        apiKey: '',
        endpoint: 'https://dashscope.aliyuncs.com/api/v1',
        model: 'qwen-image-3.0',
        size: '1024x1024',
        aspectRatio: '1:1',
        imageSize: '',
        quality: '',
        extraBody: '',
      }
    case 'xai':
      return {
        apiKey: '',
        endpoint: 'https://api.x.ai/v1',
        model: 'grok-imagine-image-2.0',
        size: '',
        aspectRatio: 'auto',
        imageSize: '1k',
        quality: '',
        extraBody: '',
      }
    case 'zhipu':
      return {
        apiKey: '',
        endpoint: 'https://open.bigmodel.cn/api/paas/v4',
        model: 'glm-image',
        size: '1280x1280',
        aspectRatio: '1:1',
        imageSize: '',
        quality: 'hd',
        extraBody: '',
      }
    case 'openai-compat':
    default:
      return {
        apiKey: '',
        endpoint: '',
        model: '',
        size: '1024x1024',
        aspectRatio: '1:1',
        imageSize: '1K',
        quality: 'auto',
        extraBody: '',
      }
  }
}

const defaultProviders = () =>
  Object.fromEntries(
    IMAGE_PROVIDERS.map((provider) => [provider, defaultProviderSettings(provider)])
  ) as Record<ImageProvider, ImageProviderSettings>

const normalizeProvider = (provider: ImageProvider, value: unknown): ImageProviderSettings => {
  const base = defaultProviderSettings(provider)
  if (!isRecord(value)) {
    return base
  }
  return {
    apiKey: readString(value.apiKey, base.apiKey),
    endpoint: readString(value.endpoint, base.endpoint),
    model: readString(value.model, base.model),
    size: readString(value.size, base.size),
    aspectRatio: readString(value.aspectRatio, base.aspectRatio),
    imageSize: readString(value.imageSize, base.imageSize),
    quality: readString(value.quality, base.quality),
    extraBody: readString(value.extraBody, base.extraBody),
  }
}

const normalizeSettings = (value: unknown): ImageGenSettings => {
  const defaults = defaultProviders()
  if (!isRecord(value)) {
    return {
      enabled: false,
      provider: 'openai-compat',
      providers: defaults,
      seedream: { outputFormat: 'jpeg', watermark: true },
    }
  }
  const provider = (IMAGE_PROVIDERS as readonly string[]).includes(value.provider as string)
    ? (value.provider as ImageProvider)
    : 'openai-compat'
  const providers = Object.fromEntries(
    IMAGE_PROVIDERS.map((item) => [
      item,
      normalizeProvider(item, isRecord(value.providers) ? value.providers[item] : undefined),
    ])
  ) as Record<ImageProvider, ImageProviderSettings>
  const seedream = isRecord(value.seedream) ? value.seedream : {}
  return {
    enabled: value.enabled === true,
    provider,
    providers,
    seedream: {
      outputFormat: seedream.outputFormat === 'png' ? 'png' : 'jpeg',
      watermark: seedream.watermark !== false,
    },
  }
}

const loadSettings = (): ImageGenSettings => {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY)
    if (raw) {
      return normalizeSettings(JSON.parse(raw))
    }
  } catch {
    // 损坏时回到默认值
  }
  // 迁移旧版单一 OpenAI 兼容配置
  try {
    const endpoint = localStorage.getItem(LEGACY_KEYS.endpoint) ?? ''
    const apiKey = localStorage.getItem(LEGACY_KEYS.apiKey) ?? ''
    const model = localStorage.getItem(LEGACY_KEYS.model) ?? ''
    if (endpoint || apiKey || model) {
      const settings = normalizeSettings(undefined)
      settings.enabled = localStorage.getItem(LEGACY_KEYS.enabled) === 'true'
      settings.provider = 'openai-compat'
      settings.providers['openai-compat'] = {
        ...settings.providers['openai-compat'],
        endpoint,
        apiKey,
        model,
        size: localStorage.getItem(LEGACY_KEYS.size) ?? '1024x1024',
      }
      return settings
    }
  } catch {
    // 存储不可用时使用默认值
  }
  return normalizeSettings(undefined)
}

const persist = (settings: ImageGenSettings) => {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
  } catch {
    // 存储不可用时只在内存中生效
  }
  useImageGen.setState(settings)
}

export const useImageGen = create<ImageGenSettings>(() => loadSettings())

export const setImageEnabled = (enabled: boolean) => {
  persist({ ...useImageGen.getState(), enabled })
}

export const setImageProvider = (provider: ImageProvider) => {
  persist({ ...useImageGen.getState(), provider })
}

export const updateImageProvider = (
  provider: ImageProvider,
  patch: Partial<ImageProviderSettings>
) => {
  const state = useImageGen.getState()
  persist({
    ...state,
    providers: {
      ...state.providers,
      [provider]: { ...state.providers[provider], ...patch },
    },
  })
}

export const updateSeedreamOptions = (patch: Partial<SeedreamOptions>) => {
  const state = useImageGen.getState()
  persist({ ...state, seedream: { ...state.seedream, ...patch } })
}

export const activeImageSettings = (settings = useImageGen.getState()) =>
  settings.providers[settings.provider]

export const imageToolAvailable = () => {
  const settings = useImageGen.getState()
  if (!settings.enabled) {
    return false
  }
  const config = activeImageSettings(settings)
  return config.apiKey.trim() !== '' && config.endpoint.trim() !== '' && config.model.trim() !== ''
}

const isProvider = (value: unknown): value is ImageProvider =>
  typeof value === 'string' && (IMAGE_PROVIDERS as readonly string[]).includes(value)

export const IMAGE_TOOL: ClientTool = {
  name: IMAGE_TOOL_NAME,
  description:
    'Generate a new image with the configured provider. Use when the user asks you to draw or create a new image. Give a complete visual prompt including subject, composition, style, lighting, and any exact text. The optional provider/model/output fields override the saved defaults for this call only when the user explicitly asks for them. Images are displayed to the user automatically; never paste image data or base64 into the reply.',
  input_schema: {
    type: 'object',
    properties: {
      prompt: {
        type: 'string',
        description: 'Complete description of the image to generate.',
      },
      count: {
        type: 'integer',
        minimum: 1,
        maximum: MAX_IMAGE_COUNT,
        description: 'How many images to generate (default 1, maximum 4).',
      },
      provider: {
        type: 'string',
        enum: IMAGE_PROVIDERS,
        description: 'Omit unless the user explicitly asks for a specific provider.',
      },
      model: {
        type: 'string',
        description: 'Omit unless the user explicitly asks for a specific model.',
      },
      size: {
        type: 'string',
        description:
          'Pixel size or tier for OpenAI/Seedream/DashScope/GLM. Omit to use the saved default.',
      },
      aspect_ratio: {
        type: 'string',
        enum: IMAGE_ASPECT_RATIOS,
        description: 'Aspect ratio for Gemini/Grok/ComfyUI-style providers.',
      },
      image_size: {
        type: 'string',
        enum: ['1K', '2K', '4K', '1k', '2k'],
        description: 'Resolution tier for Gemini or Grok.',
      },
      quality: {
        type: 'string',
        description: 'Quality tier for OpenAI-compatible providers (auto/low/medium/high).',
      },
    },
    required: ['prompt'],
  },
}

export type GeneratedImage = {
  id: string
  url: string
  mimeType: string
}

export type ImageRunResult = {
  content: string
  images: GeneratedImage[]
  isError: boolean
}

const clipError = (text: string) => text.trim().slice(0, 2000)

const mimeFromBase64 = (base64: string): string => {
  try {
    const head = atob(base64.slice(0, 32))
    if (head.startsWith('\x89PNG')) {
      return 'image/png'
    }
    if (head.startsWith('\xff\xd8')) {
      return 'image/jpeg'
    }
    if (head.startsWith('GIF8')) {
      return 'image/gif'
    }
    if (head.startsWith('RIFF') && head.slice(8, 12) === 'WEBP') {
      return 'image/webp'
    }
  } catch {
    // 非法 base64 交给 img 处理
  }
  return 'image/png'
}

const mimeFromUrl = (url: string): string => {
  const path = url.split('?')[0].toLowerCase()
  if (path.endsWith('.jpg') || path.endsWith('.jpeg')) {
    return 'image/jpeg'
  }
  if (path.endsWith('.webp')) {
    return 'image/webp'
  }
  if (path.endsWith('.gif')) {
    return 'image/gif'
  }
  return 'image/png'
}

const imageFromBase64 = (base64: string, fixedMime?: string): GeneratedImage | null => {
  if (!base64) {
    return null
  }
  if (base64.length > MAX_IMAGE_CHARS) {
    return null
  }
  const dataUrl = base64.startsWith('data:image/')
  const mimeType = dataUrl
    ? base64.slice(5, base64.indexOf(';')) || fixedMime || 'image/png'
    : fixedMime || mimeFromBase64(base64)
  return {
    id: createId(),
    url: dataUrl ? base64 : `data:${mimeType};base64,${base64}`,
    mimeType,
  }
}

const imageFromUrl = (url: string): GeneratedImage | null =>
  /^https?:\/\//i.test(url) ? { id: createId(), url, mimeType: mimeFromUrl(url) } : null

const readOpenAIImages = (body: unknown): GeneratedImage[] => {
  if (!isRecord(body) || !Array.isArray(body.data)) {
    return []
  }
  const images: GeneratedImage[] = []
  let totalChars = 0
  for (const item of body.data) {
    if (!isRecord(item)) {
      continue
    }
    if (typeof item.b64_json === 'string' && item.b64_json) {
      if (totalChars + item.b64_json.length > MAX_TOTAL_CHARS) {
        continue
      }
      totalChars += item.b64_json.length
      const image = imageFromBase64(item.b64_json)
      if (image) {
        images.push(image)
      }
    } else if (typeof item.url === 'string') {
      const image = imageFromUrl(item.url)
      if (image) {
        images.push(image)
      }
    }
  }
  return images
}

const trimEndpoint = (endpoint: string) => endpoint.trim().replace(/\/+$/, '')

const imageEndpoint = (base: string) => {
  const trimmed = trimEndpoint(base)
  return /\/images\/generations$/i.test(trimmed) ? trimmed : `${trimmed}/images/generations`
}

/** 统一的外部请求：180s 超时 + 外层停止信号，错误保留服务端文本。 */
const requestJson = async (
  url: string,
  init: RequestInit,
  signal: AbortSignal
): Promise<unknown> => {
  const controller = new AbortController()
  const abort = () => controller.abort()
  signal.addEventListener('abort', abort, { once: true })
  const timer = window.setTimeout(abort, TIMEOUT_MS)
  try {
    const response = await fetch(url, {
      ...init,
      signal: controller.signal,
      credentials: 'omit',
      cache: 'no-store',
    })
    const text = await response.text()
    if (!response.ok) {
      let message = text || response.statusText
      try {
        const parsed: unknown = JSON.parse(text)
        if (
          isRecord(parsed) &&
          isRecord(parsed.error) &&
          typeof parsed.error.message === 'string'
        ) {
          message = parsed.error.message
        }
      } catch {
        // 非 JSON 错误体直接展示原文
      }
      throw new Error(`HTTP ${response.status}: ${clipError(message)}`)
    }
    try {
      return JSON.parse(text) as unknown
    } catch {
      throw new Error('The endpoint returned invalid JSON.')
    }
  } catch (error) {
    if (signal.aborted) {
      throw new Error('Image generation stopped.')
    }
    if (controller.signal.aborted) {
      throw new Error('Image generation timed out.')
    }
    throw error
  } finally {
    window.clearTimeout(timer)
    signal.removeEventListener('abort', abort)
  }
}

type GenerateOptions = {
  provider: ImageProvider
  config: ImageProviderSettings
  seedream: SeedreamOptions
  prompt: string
  count: number
  model: string
  size: string
  aspectRatio: string
  imageSize: string
  quality: string
  signal: AbortSignal
}

const parseExtraBody = (raw: string): Record<string, unknown> => {
  if (!raw.trim()) {
    return {}
  }
  const parsed: unknown = JSON.parse(raw)
  if (!isRecord(parsed)) {
    throw new Error('Extra request body must be a JSON object.')
  }
  return parsed
}

const generateOpenAICompatible = async (options: GenerateOptions): Promise<GeneratedImage[]> => {
  const { provider, config, prompt, count, model, size, aspectRatio, imageSize, quality } = options
  const body: Record<string, unknown> = { model, prompt }
  if (provider === 'seedream') {
    body.size = size
    body.response_format = 'url'
    body.output_format = options.seedream.outputFormat
    body.watermark = options.seedream.watermark
  } else if (provider === 'xai') {
    body.aspect_ratio = aspectRatio
    body.resolution = imageSize
    if (quality) {
      body.quality = quality
    }
  } else if (provider === 'zhipu') {
    body.size = size
    body.quality = quality || 'hd'
  } else {
    if (size) {
      body.size = size
    }
    if (quality) {
      body.quality = quality
    }
  }
  if (provider === 'openai-compat') {
    Object.assign(body, parseExtraBody(config.extraBody))
  }
  const jobs = Array.from({ length: count }, () =>
    requestJson(
      imageEndpoint(config.endpoint),
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${config.apiKey.trim()}`,
        },
        body: JSON.stringify(body),
      },
      options.signal
    )
  )
  const bodies = await Promise.all(jobs)
  return bodies.flatMap(readOpenAIImages).slice(0, count)
}

const generateGoogle = async (options: GenerateOptions): Promise<GeneratedImage[]> => {
  const base = trimEndpoint(options.config.endpoint).replace(
    /\/(?:interactions|models(?:\/.*)?)$/i,
    ''
  )
  const model = options.model.replace(/^models\//, '')
  const url = `${base}/models/${encodeURIComponent(model)}:generateContent`
  const body = {
    contents: [{ role: 'user', parts: [{ text: options.prompt }] }],
    generationConfig: {
      responseModalities: ['TEXT', 'IMAGE'],
      imageConfig: {
        aspectRatio: options.aspectRatio,
        imageSize: options.imageSize,
      },
    },
  }
  const jobs = Array.from({ length: options.count }, () =>
    requestJson(
      url,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': options.config.apiKey.trim(),
        },
        body: JSON.stringify(body),
      },
      options.signal
    )
  )
  const bodies = await Promise.all(jobs)
  const images: GeneratedImage[] = []
  for (const raw of bodies) {
    if (!isRecord(raw) || !Array.isArray(raw.candidates)) {
      continue
    }
    for (const candidate of raw.candidates) {
      if (!isRecord(candidate) || !isRecord(candidate.content)) {
        continue
      }
      const parts = candidate.content.parts
      if (!Array.isArray(parts)) {
        continue
      }
      for (const part of parts) {
        if (!isRecord(part)) {
          continue
        }
        const inline = isRecord(part.inlineData)
          ? part.inlineData
          : isRecord(part.inline_data)
            ? part.inline_data
            : null
        if (inline && typeof inline.data === 'string') {
          const mime =
            typeof inline.mimeType === 'string'
              ? inline.mimeType
              : typeof inline.mime_type === 'string'
                ? inline.mime_type
                : undefined
          const image = imageFromBase64(inline.data, mime)
          if (image) {
            images.push(image)
          }
        }
      }
    }
  }
  return images
}

const generateDashscope = async (options: GenerateOptions): Promise<GeneratedImage[]> => {
  const base = trimEndpoint(options.config.endpoint)
  const url = `${base}/services/aigc/multimodal-generation/generation`
  const body = {
    model: options.model,
    input: {
      messages: [{ role: 'user', content: [{ text: options.prompt }] }],
    },
    parameters: {
      ...(options.size ? { size: options.size.replace('x', '*') } : {}),
    },
  }
  const jobs = Array.from({ length: options.count }, () =>
    requestJson(
      url,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${options.config.apiKey.trim()}`,
        },
        body: JSON.stringify(body),
      },
      options.signal
    )
  )
  const bodies = await Promise.all(jobs)
  const images: GeneratedImage[] = []
  for (const raw of bodies) {
    if (!isRecord(raw) || !isRecord(raw.output)) {
      continue
    }
    const choices = raw.output.choices
    if (!Array.isArray(choices) || !isRecord(choices[0])) {
      continue
    }
    const message = choices[0].message
    if (!isRecord(message) || !Array.isArray(message.content)) {
      continue
    }
    for (const item of message.content) {
      if (!isRecord(item)) {
        continue
      }
      const imageUrl =
        (typeof item.image === 'string' && item.image) ||
        (typeof item.image_url === 'string' && item.image_url) ||
        (typeof item.url === 'string' && item.url) ||
        ''
      if (imageUrl) {
        const image = imageFromUrl(imageUrl)
        if (image) {
          images.push(image)
        }
      }
    }
  }
  return images
}

const providerError = (provider: ImageProvider, error: unknown) => {
  const message = error instanceof Error ? error.message : String(error)
  return `${IMAGE_PROVIDER_LABELS[provider]} image request failed: ${clipError(message)}. The endpoint must allow cross-origin browser requests.`
}

/**
 * 按 Provider 分发：
 * - OpenAI/兼容/Grok/GLM/Seedream 走 Images generations JSON；
 * - Gemini 走原生 generateContent；
 * - DashScope 走 multimodal-generation。
 */
export const generateImages = async (
  input: unknown,
  signal: AbortSignal
): Promise<ImageRunResult> => {
  const settings = useImageGen.getState()
  if (!settings.enabled) {
    return { content: 'Image generation is disabled.', images: [], isError: true }
  }
  if (!isRecord(input) || typeof input.prompt !== 'string' || !input.prompt.trim()) {
    return { content: 'generate_image requires a non-empty prompt.', images: [], isError: true }
  }
  const provider = isProvider(input.provider) ? input.provider : settings.provider
  const config = settings.providers[provider]
  if (!config.apiKey.trim() || !config.endpoint.trim() || !config.model.trim()) {
    return {
      content: `Image provider ${IMAGE_PROVIDER_LABELS[provider]} is not configured (API key, endpoint and model are required).`,
      images: [],
      isError: true,
    }
  }
  const prompt = input.prompt.trim()
  const count =
    typeof input.count === 'number' && Number.isFinite(input.count)
      ? Math.min(MAX_IMAGE_COUNT, Math.max(1, Math.round(input.count)))
      : 1
  const model =
    typeof input.model === 'string' && input.model.trim() ? input.model.trim() : config.model
  const size = typeof input.size === 'string' && input.size.trim() ? input.size.trim() : config.size
  const aspectRatio =
    typeof input.aspect_ratio === 'string' && input.aspect_ratio.trim()
      ? input.aspect_ratio.trim()
      : config.aspectRatio
  const imageSize =
    typeof input.image_size === 'string' && input.image_size.trim()
      ? input.image_size.trim()
      : config.imageSize
  const quality =
    typeof input.quality === 'string' && input.quality.trim()
      ? input.quality.trim()
      : config.quality
  const options: GenerateOptions = {
    provider,
    config,
    seedream: settings.seedream,
    prompt,
    count,
    model,
    size,
    aspectRatio,
    imageSize,
    quality,
    signal,
  }
  try {
    const images =
      provider === 'google'
        ? await generateGoogle(options)
        : provider === 'dashscope'
          ? await generateDashscope(options)
          : await generateOpenAICompatible(options)
    if (images.length === 0) {
      return {
        content: `${IMAGE_PROVIDER_LABELS[provider]} returned no usable images.`,
        images: [],
        isError: true,
      }
    }
    return {
      content: `Generated ${images.length} image${images.length === 1 ? '' : 's'} with ${IMAGE_PROVIDER_LABELS[provider]} (${model}) for: ${prompt}`,
      images,
      isError: false,
    }
  } catch (error) {
    return { content: providerError(provider, error), images: [], isError: true }
  }
}
