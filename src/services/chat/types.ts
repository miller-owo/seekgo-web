import type { TranslationMessage } from '../../i18n/index.js'
import type { ApiErrorKind } from '../api/client.js'
import type { GeneratedImage } from '../imageGen.js'
import type {
  ChatModel,
  MessageUsage,
  ServerToolBlock,
  StopDetails,
  StopReason,
  TextCitation,
} from '../api/types.js'

/**
 * 消息附件。id 是本地标识（IndexedDB files 表的主键，原件按它存储，所有引用同一 id 的消息共用一份），
 * 导入的附件沿用导出产物里的文件 ID；本地没有原件的附件只展示文件名，不进入请求。
 * serverId 是 Files API 返回的 file_id，导入的数据或尚未上传成功的文件为 null，发送前补传。
 */
export type FileAttachment = {
  id: string
  serverId: string | null
  /** 当前 serverId 对应的上传图片已确认符合长边限制。旧记录缺少此字段。 */
  imageSizeChecked?: boolean
  name: string
  size: number
  /** 附件类别；导入时沿用归档的 is_image，不由 MIME 识别结果决定。 */
  isImage: boolean
  /** 具体 MIME；导入时没有原件或无法识别的为空字符串，不影响图片身份。 */
  mimeType: string
}

/** 本地消息的分支关系；字段缺省时按线性消息列表处理。 */
type MessageBranch = {
  parentId?: string | null
  /** 当前选中的下一条消息；切换版本时保留每条分支原有的选择。 */
  selectedChildId?: string
}

export type UserMessage = MessageBranch & {
  id: string
  role: 'user'
  content: string
  files: FileAttachment[]
  createdAt: number
}

/** 思考块：thinking_delta 累积，签名随 signature_delta 到达；历史轮次的思考服务端会丢弃，不回传 */
export type ThinkingPart = {
  type: 'thinking'
  thinking: string
  signature?: string
  /** content_block_start 的时间；没有事件时间的历史块缺省 */
  startedAt?: number
  /** content_block_stop（或回复结束）的时间 */
  endedAt?: number
  /** 仅有耗时、没有事件时间时保存秒数。 */
  elapsedSeconds?: number
}

/** 文本块：text_delta 累积，citations_delta 追加引用 */
export type TextPart = {
  type: 'text'
  text: string
  citations?: TextCitation[]
  /** 服务端提示文案，仅用于展示，不作为模型回答参与上下文或续写。 */
  isTemplate?: boolean
}

/** 客户端工具调用：参数经 input_json_delta 拼接，content_block_stop 时解析 */
export type ToolUsePart = {
  type: 'tool_use'
  id: string
  name: string
  input: unknown
  /** 参数 JSON 尚未解析成功；保留原文用于报错，正常解析后移除 */
  partialJson?: string
}

/** 客户端工具结果：按协议属于紧随 assistant 的 user 消息，本地与调用存在同一条回复里 */
export type ToolResultPart = {
  type: 'tool_result'
  tool_use_id: string
  content: string
  isError?: boolean
}

/** 内置生图工具的结果图片；只在本机展示，不进入模型上下文 */
export type GeneratedImagePart = {
  type: 'generated_image'
  id: string
  prompt: string
  images: GeneratedImage[]
}

/** 服务端工具块原样保存；客户端工具调用与结果保存在同一回复里，历史请求按协议重放 */
export type ReplyBlock =
  | ThinkingPart
  | TextPart
  | ServerToolBlock
  | ToolUsePart
  | ToolResultPart
  | GeneratedImagePart

/**
 * pending：已发出请求，还没收到事件；streaming：正在接收；
 * done：收到 message_stop；stopped：用户停止或页面关闭；error：请求或流出错
 */
export type ReplyStatus = 'pending' | 'streaming' | 'done' | 'stopped' | 'error'

export type AssistantMessage = MessageBranch & {
  id: string
  role: 'assistant'
  createdAt: number
  /** 未记录模型时为 null，续写使用当前默认模型。 */
  model: ChatModel | null
  /** 请求时是否开启深度思考 */
  thinking?: boolean
  /** 请求时是否声明 deepseek_web_search */
  search?: boolean
  /** 请求时是否声明 deepseek_read_url；旧回复没有记录时按默认开启处理 */
  readLink?: boolean
  /** 本轮请求的系统信息快照；各回答版本独立保存，续写沿用。历史消息中缺省的快照保持为空。 */
  latestReminder?: string
  /** 是否允许作为续写前缀；仍需满足回复状态与内容限制。 */
  prefix: boolean
  status: ReplyStatus
  /** 可识别的内容块按接收顺序排列；续写产生的块追加在已有块之后 */
  blocks: ReplyBlock[]
  stopReason?: StopReason
  stopDetails?: StopDetails
  /** 最近一次请求的用量，续写后更新 */
  usage?: MessageUsage
  error?: {
    /** upload：发送前补传附件失败，请求没有发出 */
    kind: ApiErrorKind | 'upload'
    message: string
    status?: number
    localMessage?: TranslationMessage
    /** 仅 upload：重新上传是否可能成功（网络、限流、服务端繁忙）；过大、格式不支持为 false */
    retryable?: boolean
  }
}

export type Message = UserMessage | AssistantMessage

/**
 * 长上下文压缩块：模型通过 compress 工具把一段完整对话折成摘要。
 * 原文仍保存在 session.messages；active 的块在请求里替换对应范围。
 * children 是该范围里被折进来的旧块，用于逐层 decompress。
 */
export type CompressedBlock = {
  /** b1、b2……会话内递增 */
  id: string
  startId: string
  endId: string
  /** 对应消息在系统提示里展示的 m00001 形式引用 */
  startRef: string
  endRef: string
  summary: string
  /** 1 = 原始消息，2+ = 由摘要再次折叠 */
  tier: number
  active: boolean
  children: string[]
  createdAt: number
  /** 折叠前原文与摘要的估算 token，用于展示节省量 */
  tokensBefore: number
  tokensAfter: number
}

export type Session = {
  id: string
  title: string
  createdAt: number
  updatedAt: number
  /** 包含所有分支的消息，按创建顺序存储。 */
  messages: Message[]
  /** undefined 表示线性消息列表；null 表示空会话。 */
  rootMessageId?: string | null
  /** 模型通过压缩工具维护的折叠块；undefined 表示从未压缩 */
  compressions?: CompressedBlock[]
}

/** 会话列表元数据；消息只在打开会话时加载。 */
export type SessionSummary = Pick<Session, 'id' | 'title' | 'createdAt' | 'updatedAt'>

/** 显式提取字段，避免将完整会话的消息带进列表。 */
export const toSessionSummary = (session: SessionSummary): SessionSummary => ({
  id: session.id,
  title: session.title,
  createdAt: session.createdAt,
  updatedAt: session.updatedAt,
})
