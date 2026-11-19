import type {
  AssistantBlockParam,
  FileBlockParam,
  MessageParam,
  MessageStreamEvent,
  OutputBlockStart,
  TextBlockParam,
  ToolResultBlockParam,
} from '../api/types.js'
import type {
  AssistantMessage,
  FileAttachment,
  Message,
  ReplyBlock,
  ReplyStatus,
  ToolResultPart,
  ToolUsePart,
  UserMessage,
} from './types.js'
import { isCompressionTool } from './compression.js'

/**
 * 文件按 Files API 的 file_id（附件的 serverId）引用：图片用 image 块，其余用 document 块。
 * 发送前 streamReply 会先补齐 serverId；仍为 null 的是本地没有原件的附件，不进入请求。
 */
const toFileBlocks = (files: FileAttachment[]): FileBlockParam[] =>
  files.flatMap(({ serverId, isImage }) =>
    serverId
      ? [
          {
            type: isImage ? 'image' : 'document',
            source: { type: 'file', file_id: serverId },
          },
        ]
      : []
  )

const toReplyBlock = (block: OutputBlockStart, now: number): ReplyBlock | null => {
  switch (block.type) {
    case 'text':
      return { type: 'text', text: block.text, citations: block.citations ?? [] }
    case 'thinking':
      return {
        type: 'thinking',
        thinking: block.thinking,
        signature: block.signature,
        startedAt: now,
      }
    case 'server_tool_use':
    case 'web_search_tool_result':
    case 'web_fetch_tool_result':
      return block
    case 'tool_use':
      // 参数通常从空对象开始，随 input_json_delta 拼接，块结束时才解析。
      return {
        type: 'tool_use',
        id: block.id,
        name: block.name,
        input: block.input ?? {},
        partialJson: '',
      }
    default:
      return null
  }
}

/** 块结束时解析工具参数；失败时保留原文，执行阶段返回参数错误。 */
const settleToolUse = (block: ToolUsePart): ToolUsePart => {
  if (block.partialJson === undefined) {
    return block
  }
  const raw = block.partialJson.trim()
  if (!raw) {
    const settled = { ...block }
    delete settled.partialJson
    return settled
  }
  try {
    const settled: ToolUsePart = { ...block, input: JSON.parse(raw) }
    delete settled.partialJson
    return settled
  } catch {
    return block
  }
}

const updateBlock = (
  reply: AssistantMessage,
  index: number,
  update: (block: ReplyBlock) => ReplyBlock
): AssistantMessage => {
  const block = reply.blocks[index]
  if (!block) {
    return reply
  }
  const blocks = [...reply.blocks]
  blocks[index] = update(block)
  return { ...reply, blocks }
}

/**
 * 把一个流式事件合并进回复：只追加可识别的内容块，用本次请求的临时索引映射处理增量。
 * 跳过的块不占位；续写直接追加到已有内容之后，message_delta 更新结束原因与累计用量。
 */
export const applyEvent = (
  reply: AssistantMessage,
  event: MessageStreamEvent,
  now: number,
  blockIndexes: Map<number, number>
): AssistantMessage => {
  const next: AssistantMessage =
    reply.status === 'streaming' ? reply : { ...reply, status: 'streaming' }
  switch (event.type) {
    case 'message_start':
      return { ...next, usage: event.message.usage ?? next.usage }
    case 'content_block_start': {
      blockIndexes.delete(event.index)
      const block = toReplyBlock(event.content_block, now)
      if (!block) {
        return next
      }
      blockIndexes.set(event.index, next.blocks.length)
      return {
        ...next,
        // 出现客户端工具调用后，本条回复不能再作为续写前缀。
        prefix: block.type === 'tool_use' ? false : next.prefix,
        blocks: [...next.blocks, block],
      }
    }
    case 'content_block_delta': {
      const index = blockIndexes.get(event.index)
      if (index === undefined) {
        return next
      }
      const { delta } = event
      return updateBlock(next, index, (block) => {
        if (block.type === 'text' && delta.type === 'text_delta') {
          return { ...block, text: block.text + delta.text }
        }
        if (block.type === 'thinking' && delta.type === 'thinking_delta') {
          return { ...block, thinking: block.thinking + delta.thinking }
        }
        if (block.type === 'thinking' && delta.type === 'signature_delta') {
          return { ...block, signature: (block.signature ?? '') + delta.signature }
        }
        if (block.type === 'text' && delta.type === 'citations_delta') {
          return { ...block, citations: [...(block.citations ?? []), delta.citation] }
        }
        if (block.type === 'tool_use' && delta.type === 'input_json_delta') {
          return { ...block, partialJson: (block.partialJson ?? '') + delta.partial_json }
        }
        return block
      })
    }
    case 'content_block_stop': {
      const index = blockIndexes.get(event.index)
      if (index === undefined) {
        return next
      }
      blockIndexes.delete(event.index)
      return updateBlock(next, index, (block) => {
        if (block.type === 'thinking') {
          return block.startedAt !== undefined && block.endedAt === undefined
            ? { ...block, endedAt: now }
            : block
        }
        return block.type === 'tool_use' ? settleToolUse(block) : block
      })
    }
    case 'message_delta':
      return {
        ...next,
        stopReason: event.delta.stop_reason,
        stopDetails: event.delta.stop_details,
        usage: event.usage ?? next.usage,
      }
    default:
      return next
  }
}

/**
 * 回复结束：未结束的思考块以当前时间收尾。
 * 安全拒绝（stop_reason: refusal）时已下发的思考与正文不能撤回，按协议要求由客户端丢弃，只保留工具块。
 */
export const settleReply = (
  reply: AssistantMessage,
  status: Extract<ReplyStatus, 'done' | 'stopped' | 'error'>,
  now: number,
  error?: AssistantMessage['error']
): AssistantMessage => ({
  ...reply,
  status,
  error,
  blocks: reply.blocks.flatMap((block): ReplyBlock[] => {
    if (reply.stopReason === 'refusal' && (block.type === 'thinking' || block.type === 'text')) {
      return []
    }
    return block.type === 'thinking' && block.startedAt !== undefined && block.endedAt === undefined
      ? [{ ...block, endedAt: now }]
      : [block]
  }),
})

/** 回复里所有文本块拼起来，用于复制与判断是否有回答 */
export const getReplyText = (reply: AssistantMessage) =>
  reply.blocks.map((block) => (block.type === 'text' ? block.text : '')).join('')

/**
 * 只有正常达到输出上限或被停止的回复可续写，报错回复不能续写。
 * 末条限制由调用方判断，拒绝和客户端工具调用不能续写。
 * 本轮含服务端工具调用或结果（含 READ_LINK 和孤立结果块）的回复不能续写。
 * 服务端模板提示不能作为续写前缀。
 */
export const canContinueReply = (reply: AssistantMessage): boolean => {
  if (
    !reply.prefix ||
    reply.stopReason === 'refusal' ||
    reply.stopReason === 'tool_use' ||
    reply.blocks.some(
      (block) =>
        block.type === 'server_tool_use' ||
        block.type === 'web_search_tool_result' ||
        block.type === 'web_fetch_tool_result' ||
        block.type === 'tool_use' ||
        block.type === 'tool_result' ||
        (block.type === 'text' && block.isTemplate)
    )
  ) {
    return false
  }
  return (
    reply.status === 'stopped' || (reply.status === 'done' && reply.stopReason === 'max_tokens')
  )
}

/**
 * 已结束或停止且有回答文本的回复才放进上下文；被安全拒绝的轮次不回传。
 * 服务端模板提示不进入上下文。
 */
const isUsableReply = (message: Message): message is AssistantMessage =>
  message.role === 'assistant' &&
  (message.status === 'done' || message.status === 'stopped') &&
  message.stopReason !== 'refusal' &&
  !message.blocks.some((block) => block.type === 'text' && block.isTemplate) &&
  getReplyText(message) !== ''

/** 有文件时用内容块数组：先文件后文本，文件按 Files API 的 file_id 引用 */
const toUserParam = ({ content, files }: UserMessage): MessageParam => {
  const blocks = toFileBlocks(files)
  return blocks.length === 0
    ? { role: 'user', content }
    : {
        role: 'user',
        content: [...blocks, ...(content ? [{ type: 'text' as const, text: content }] : [])],
      }
}

/** 客户端工具结果只能放在紧随 assistant 的 user 消息里。 */
const toToolResultParam = ({
  tool_use_id,
  content,
  isError,
}: ToolResultPart): ToolResultBlockParam => ({
  type: 'tool_result',
  tool_use_id,
  content,
  ...(isError ? { is_error: true } : {}),
})

/**
 * assistant 的内容块按历史与续写场景转换；一条本地回复可能拆成多条 API 消息：
 * - 历史思考及其签名不回传；开启思考时续写只保留本轮非空白思考及其签名；
 * - 文本块去掉 citations（服务端忽略）。相邻文本直接拼接，被思考或工具隔开的文本用空行连接；
 * - 服务端工具调用和结果只保留 kind 为 read_link 的块，阅读链接结果保留 signature；
 * - 客户端工具调用按协议回放：调用之后紧跟对应的 tool_result，再继续后续正文；
 *   调用或结果不完整（流中断、参数不是合法 JSON）时两者都不回传。
 */
const toAssistantMessages = (
  { blocks }: AssistantMessage,
  prefix = false,
  thinking = false
): MessageParam[] => {
  const results = new Map<string, ToolResultPart>()
  for (const block of blocks) {
    if (block.type === 'tool_result') {
      results.set(block.tool_use_id, block)
    }
  }
  /** 调用与结果都完整、参数已解析的客户端工具才有资格回放 */
  const replayableCalls = new Set(
    blocks.flatMap((block) =>
      block.type === 'tool_use' &&
      !isCompressionTool(block.name) &&
      block.partialJson === undefined &&
      results.has(block.id)
        ? [block.id]
        : []
    )
  )
  // 成功阅读的网页靠签名恢复正文；缺少有效签名时，调用与结果都不回传。
  const unsignedReadLinks = new Set(
    blocks.flatMap((block) =>
      block.type === 'web_fetch_tool_result' &&
      block.kind === 'read_link' &&
      block.content.type === 'web_fetch_result' &&
      !block.signature?.trim()
        ? [block.tool_use_id]
        : []
    )
  )
  const messages: MessageParam[] = []
  let content: AssistantBlockParam[] = []
  let pendingResults: ToolResultBlockParam[] = []
  /** 正在拼接的文本块；遇到任何非文本块（含不回传的思考块）就结束 */
  let text: TextBlockParam | null = null

  const flush = () => {
    if (content.length > 0) {
      messages.push({ role: 'assistant', content })
    }
    if (pendingResults.length > 0) {
      messages.push({ role: 'user', content: pendingResults })
    }
    content = []
    pendingResults = []
    text = null
  }

  for (const block of blocks) {
    if (block.type === 'tool_result') {
      // 压缩工具调用不回放；摘要已经通过系统提示单独提供。
      if (replayableCalls.has(block.tool_use_id)) {
        pendingResults.push(toToolResultParam(block))
      }
      continue
    }
    // 工具结果之后的内容属于下一轮 assistant 消息。
    if (pendingResults.length > 0) {
      flush()
    }
    if (block.type === 'tool_use' && isCompressionTool(block.name)) {
      text = null
      continue
    }
    // 空思考不改变续写位置，也不应把两段正文隔开，导致后端额外插入空行。
    if (prefix && block.type === 'thinking' && !block.thinking.trim()) {
      continue
    }
    if (block.type === 'text') {
      if (text) {
        text.text += block.text
      } else {
        const previous = content.at(-1)
        text = {
          type: 'text',
          text: `${previous?.type === 'text' ? '\n\n' : ''}${block.text}`,
        }
        content.push(text)
      }
      continue
    }
    text = null
    if (prefix && thinking && block.type === 'thinking') {
      // 续写保留本轮思考，历史轮次的思考省略。
      const { type, thinking: thought, signature } = block
      content.push({ type, thinking: thought, signature: signature ?? '' })
    } else if (block.type === 'tool_use') {
      if (!replayableCalls.has(block.id)) {
        continue
      }
      content.push({ type: 'tool_use', id: block.id, name: block.name, input: block.input })
    } else if (
      block.type === 'server_tool_use' &&
      block.kind === 'read_link' &&
      !unsignedReadLinks.has(block.id)
    ) {
      const { type, id, name, input, kind } = block
      content.push({ type, id, name, input, kind })
    } else if (
      block.type === 'web_fetch_tool_result' &&
      block.kind === 'read_link' &&
      !unsignedReadLinks.has(block.tool_use_id)
    ) {
      content.push(block)
    }
  }
  flush()
  return messages
}

/**
 * 工具调用回合的 assistant 内容：按协议回传本轮完整内容（思考及其签名、接口调用、
 * 服务端工具块与正文），不能套用历史回放的过滤规则。
 */
export const toToolCallAssistant = (
  blocks: ReplyBlock[]
): Extract<MessageParam, { role: 'assistant' }> => {
  const content: AssistantBlockParam[] = []
  let text: TextBlockParam | null = null
  for (const block of blocks) {
    if (block.type === 'tool_result') {
      continue
    }
    if (block.type === 'text') {
      if (text) {
        text.text += block.text
      } else {
        const previous = content.at(-1)
        text = {
          type: 'text',
          text: `${previous?.type === 'text' ? '\n\n' : ''}${block.text}`,
        }
        content.push(text)
      }
      continue
    }
    text = null
    if (block.type === 'thinking') {
      const { type, thinking, signature } = block
      content.push({ type, thinking, signature: signature ?? '' })
    } else if (block.type === 'tool_use') {
      // 参数不是合法 JSON 时 input 仍是空对象；错误结果会紧随其后回传，保证调用与结果成对。
      content.push({ type: 'tool_use', id: block.id, name: block.name, input: block.input })
    } else if (block.type === 'server_tool_use') {
      const { type, id, name, input, kind } = block
      content.push({ type, id, name, input, kind })
    } else if (block.type === 'web_search_tool_result' || block.type === 'web_fetch_tool_result') {
      content.push(block)
    }
  }
  return {
    role: 'assistant',
    content: content.filter((block) => block.type !== 'text' || block.text !== ''),
  }
}

/** 工具结果按调用顺序放在一条 user 消息里，先于任何文本。 */
export const toToolResultsMessage = (results: ToolResultPart[]): MessageParam => ({
  role: 'user',
  content: results.map(toToolResultParam),
})

/** 历史中会进入请求上下文的轮次：提问后紧跟可用回答的才保留 */
export const getContextRounds = (history: Message[]): [UserMessage, AssistantMessage][] => {
  const rounds: [UserMessage, AssistantMessage][] = []
  for (let i = 0; i + 1 < history.length; i++) {
    const [user, reply] = [history[i], history[i + 1]]
    if (user.role === 'user' && isUsableReply(reply)) {
      rounds.push([user, reply])
      i++
    }
  }
  return rounds
}

/**
 * 把会话转成请求的 messages：只保留「提问 + 有回答的回复」成对的轮次，最后接上本轮提问。
 * 失败或没有回答的轮次不进上下文。续写时末尾再带上本轮 assistant。
 */
export const toRequestMessages = (
  history: Message[],
  question: UserMessage,
  prefix?: AssistantMessage,
  thinking = prefix?.thinking ?? false,
  latestReminder?: string
): MessageParam[] => {
  const messages: MessageParam[] = []
  let previousReminder: string | undefined
  const appendReminder = (reminder: string | undefined) => {
    // 仅在当前分支首次出现或内容变化时插入快照；缺少快照的消息保持原有内容。
    if (reminder && reminder !== previousReminder) {
      messages.push({ role: 'latest_reminder', content: reminder })
      previousReminder = reminder
    }
  }
  for (const [user, reply] of getContextRounds(history)) {
    // 历史提问没有文字、附件也都没有 serverId 时，提问为空，连同回答一起省略。
    if (!user.content && toFileBlocks(user.files).length === 0) {
      continue
    }
    appendReminder(reply.latestReminder)
    messages.push(toUserParam(user), ...toAssistantMessages(reply))
  }
  appendReminder(latestReminder)
  messages.push(toUserParam(question))
  if (prefix?.prefix) {
    const assistant = toAssistantMessages(prefix, true, thinking).at(-1)
    // 没有非空白正文或有效思考时直接重发原问题，避免服务端拒绝空 Prefill。
    if (
      assistant?.role === 'assistant' &&
      assistant.content.some(
        (block) =>
          (block.type === 'text' && block.text.trim()) ||
          (block.type === 'thinking' && block.thinking.trim())
      )
    ) {
      messages.push(assistant)
    }
  }
  return messages
}

/** 思考用时（秒），至少 1 秒 */
export const getThinkingSeconds = (startedAt: number, endedAt: number) =>
  Math.max(1, Math.round((endedAt - startedAt) / 1000))
