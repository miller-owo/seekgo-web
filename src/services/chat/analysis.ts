import type { ChatModel, MessageUsage } from '../api/types.js'
import { getVisibleMessages } from './branches.js'
import {
  activeCompressionBlocks,
  buildMessageRefs,
  countTokens,
  filterCompressedHistory,
  messageTokens,
  messagesTokens,
  MODEL_CONTEXT_LIMIT,
} from './compression.js'
import type { AssistantMessage, CompressedBlock, Message, Session } from './types.js'

export type TokenSlice = { key: 'user' | 'assistant' | 'summary'; tokens: number }

export type ToolCount = { name: string; count: number }

export type LargestMessage = {
  ref: string
  role: Message['role']
  tokens: number
  preview: string
}

export type CostBreakdown = {
  input: number
  cache: number
  output: number
  total: number
  /** 相比未命中缓存，本请求少花的钱 */
  cacheSaved: number
  peak: boolean
  model: ChatModel
}

export type CompressionCost = {
  /** 折叠后实际发生的请求数（用于估算避免重复发送的 token） */
  requests: number
  /** 避免重复发送的原文按缓存价折算的金额 */
  gross: number
  /** 模型写摘要的输出成本估算 */
  summary: number
  /** gross - summary；可能为负，表示还没回本 */
  net: number
}

export type CostEstimate = {
  last: CostBreakdown | null
  total: number
  /** 缓存命中相对未命中的优惠，仅作对比，已包含在实际支出里 */
  cacheSaved: number
  compression: CompressionCost
  /** 按“没有压缩”的基线折算的等效支出 */
  equivalent: number
}

export type UsageTotals = {
  input: number
  cacheRead: number
  cacheWrite: number
  output: number
  requests: number
}

export type CacheSample = { timestamp: number; rate: number }

/**
 * DeepSeek 官方 CNY 价（元 / 百万 tokens，空闲时段；高峰时段为两倍）。
 * 价格可能调整，面板只作估算，实际以账单为准。
 */
const PRICING: Record<ChatModel, { cache: number; input: number; output: number }> = {
  'deepseek-flash': { cache: 0.02, input: 1, output: 4 },
  'deepseek-v4-pro': { cache: 0.15, input: 4.5, output: 13.5 },
}

const PEAK_MULTIPLIER = 2
const BEIJING_TIME = new Intl.DateTimeFormat('en-US', {
  timeZone: 'Asia/Shanghai',
  weekday: 'short',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
})

/** 北京时间周一至周五 9:00–12:00、14:00–18:00 为高峰；法定节假日未计入。 */
export const isPeakTime = (timestamp: number): boolean => {
  const parts = BEIJING_TIME.formatToParts(new Date(timestamp))
  const weekday = parts.find((part) => part.type === 'weekday')?.value
  if (weekday === 'Sat' || weekday === 'Sun') {
    return false
  }
  const hour = Number(parts.find((part) => part.type === 'hour')?.value ?? '0')
  const minute = Number(parts.find((part) => part.type === 'minute')?.value ?? '0')
  const minutes = hour * 60 + minute
  return (minutes >= 9 * 60 && minutes < 12 * 60) || (minutes >= 14 * 60 && minutes < 18 * 60)
}

const usageCost = (usage: MessageUsage, model: ChatModel, timestamp: number): CostBreakdown => {
  const price = PRICING[model] ?? PRICING['deepseek-flash']
  const peak = isPeakTime(timestamp)
  const multiplier = peak ? PEAK_MULTIPLIER : 1
  const inputTokens = usage.input_tokens + usage.cache_creation_input_tokens
  const cacheTokens = usage.cache_read_input_tokens
  const outputTokens = usage.output_tokens
  const input = (inputTokens * price.input * multiplier) / 1_000_000
  const cache = (cacheTokens * price.cache * multiplier) / 1_000_000
  const output = (outputTokens * price.output * multiplier) / 1_000_000
  const cacheSaved = (cacheTokens * Math.max(0, price.input - price.cache) * multiplier) / 1_000_000
  return { input, cache, output, total: input + cache + output, cacheSaved, peak, model }
}

/** 费用按小额保留更多小数位，避免显示成 ¥0.00；负值表示还没回本。 */
export const formatCost = (value: number) => {
  if (value === 0 || Math.abs(value) < 0.00005) {
    return '¥0.00'
  }
  const sign = value < 0 ? '-' : ''
  const abs = Math.abs(value)
  const digits = abs < 0.01 ? 4 : abs < 1 ? 3 : 2
  return `${sign}¥${abs.toFixed(digits)}`
}

export type SessionAnalysis = {
  messages: number
  rounds: number
  fullTokens: number
  visibleTokens: number
  summaryTokens: number
  savedTokens: number
  window: number
  ratio: number
  slices: TokenSlice[]
  blocks: CompressedBlock[]
  tools: ToolCount[]
  images: number
  attachments: number
  usage: MessageUsage | null
  usageTotals: UsageTotals
  cacheHitRate: number | null
  cacheSeries: CacheSample[]
  cost: CostEstimate
  largest: LargestMessage[]
}

const preview = (message: Message) => {
  const text =
    message.role === 'user'
      ? message.content
      : message.blocks
          .map((block) => (block.type === 'text' ? block.text : ''))
          .filter(Boolean)
          .join(' ')
  return text.replace(/\s+/g, ' ').trim().slice(0, 90)
}

const countRounds = (messages: Message[]) => {
  let rounds = 0
  for (let index = 0; index + 1 < messages.length; index++) {
    if (messages[index].role === 'user' && messages[index + 1].role === 'assistant') {
      rounds++
      index++
    }
  }
  return rounds
}

const countTools = (messages: Message[]): ToolCount[] => {
  const counts = new Map<string, number>()
  for (const message of messages) {
    if (message.role !== 'assistant') {
      continue
    }
    for (const block of message.blocks) {
      if (block.type === 'tool_use') {
        counts.set(block.name, (counts.get(block.name) ?? 0) + 1)
      } else if (block.type === 'server_tool_use') {
        const name = block.name
        counts.set(name, (counts.get(name) ?? 0) + 1)
      }
    }
  }
  return [...counts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
}

const cacheRate = (usage: MessageUsage | null): number | null => {
  if (!usage) {
    return null
  }
  const input =
    usage.input_tokens + usage.cache_creation_input_tokens + usage.cache_read_input_tokens
  return input > 0 ? usage.cache_read_input_tokens / input : null
}

/**
 * 分析面板的纯计算：与真实请求一致，压缩开启时只统计未折叠原文 + 活跃摘要。
 * token 为估算值（CJK 1:1，其余约 4 字符 1 token），不包含系统提示与工具声明。
 */
export const buildSessionAnalysis = (
  session: Session,
  compressionEnabled: boolean
): SessionAnalysis => {
  const path = getVisibleMessages(session)
  const refs = buildMessageRefs(session)
  const blocks = compressionEnabled ? activeCompressionBlocks(session, path) : []
  const filtered = compressionEnabled ? filterCompressedHistory(session, path) : path
  const summaryTokens = blocks.reduce((total, block) => total + countTokens(block.summary), 0)
  const fullTokens = messagesTokens(path)
  const visibleTokens = messagesTokens(filtered) + summaryTokens
  const userTokens = messagesTokens(filtered.filter((message) => message.role === 'user'))
  const assistantTokens = messagesTokens(filtered.filter((message) => message.role === 'assistant'))
  const usageAssistants = path.filter(
    (message): message is AssistantMessage & { usage: MessageUsage } =>
      message.role === 'assistant' && message.usage !== undefined
  )
  const lastUsageMessage = usageAssistants.at(-1)
  const usage = lastUsageMessage?.usage ?? null
  const usageTotals = usageAssistants.reduce<UsageTotals>(
    (totals, message) => ({
      input: totals.input + message.usage.input_tokens,
      cacheRead: totals.cacheRead + message.usage.cache_read_input_tokens,
      cacheWrite: totals.cacheWrite + message.usage.cache_creation_input_tokens,
      output: totals.output + message.usage.output_tokens,
      requests: totals.requests + 1,
    }),
    { input: 0, cacheRead: 0, cacheWrite: 0, output: 0, requests: 0 }
  )
  let totalCost = 0
  let cacheSaved = 0
  let lastCost: CostBreakdown | null = null
  for (const message of usageAssistants) {
    const breakdown = usageCost(message.usage, message.model ?? 'deepseek-flash', message.createdAt)
    totalCost += breakdown.total
    cacheSaved += breakdown.cacheSaved
    lastCost = breakdown
  }
  const priceModel = lastUsageMessage?.model ?? 'deepseek-flash'
  const price = PRICING[priceModel] ?? PRICING['deepseek-flash']
  const multiplier = lastCost?.peak ? PEAK_MULTIPLIER : 1
  let compressionRequests = 0
  let compressionGross = 0
  let compressionSummary = 0
  if (usageAssistants.length > 0) {
    for (const block of blocks) {
      const requestsAfter = usageAssistants.filter(
        (message) => message.createdAt > block.createdAt
      ).length
      const savedTokens = (block.tokensBefore - block.tokensAfter) * requestsAfter
      compressionGross += (savedTokens * price.cache * multiplier) / 1_000_000
      compressionSummary += (block.tokensAfter * price.output * multiplier) / 1_000_000
      compressionRequests += requestsAfter
    }
  }
  const compressionNet = compressionGross - compressionSummary
  return {
    messages: path.length,
    rounds: countRounds(path),
    fullTokens,
    visibleTokens,
    summaryTokens,
    savedTokens: blocks.reduce(
      (total, block) => total + Math.max(0, block.tokensBefore - block.tokensAfter),
      0
    ),
    window: MODEL_CONTEXT_LIMIT,
    ratio: visibleTokens / MODEL_CONTEXT_LIMIT,
    slices: [
      { key: 'user', tokens: userTokens },
      { key: 'assistant', tokens: assistantTokens },
      { key: 'summary', tokens: summaryTokens },
    ],
    blocks,
    tools: countTools(path),
    images: path.reduce(
      (total, message) =>
        message.role === 'assistant'
          ? total +
            message.blocks.reduce(
              (count, block) =>
                count + (block.type === 'generated_image' ? block.images.length : 0),
              0
            )
          : total,
      0
    ),
    attachments: path.reduce(
      (total, message) => total + (message.role === 'user' ? message.files.length : 0),
      0
    ),
    usage,
    usageTotals,
    cacheHitRate: cacheRate(usage),
    cacheSeries: usageAssistants.slice(-24).map((message) => ({
      timestamp: message.createdAt,
      rate: cacheRate(message.usage) ?? 0,
    })),
    cost: {
      last: lastCost,
      total: totalCost,
      cacheSaved,
      compression: {
        requests: compressionRequests,
        gross: compressionGross,
        summary: compressionSummary,
        net: compressionNet,
      },
      equivalent: totalCost - compressionNet,
    },
    largest: filtered
      .map((message) => ({
        ref: refs.byId.get(message.id) ?? '?',
        role: message.role,
        tokens: messageTokens(message),
        preview: preview(message),
      }))
      .sort((a, b) => b.tokens - a.tokens)
      .slice(0, 6),
  }
}

export const assistantModel = (messages: Message[]): string | null => {
  for (let index = messages.length - 1; index >= 0; index--) {
    const message = messages[index]
    if (message.role === 'assistant' && message.model) {
      return (message as AssistantMessage).model
    }
  }
  return null
}
