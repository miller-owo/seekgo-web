import clsx from 'clsx'
import { useTranslate } from '../../i18n/index.js'
import { usePresence } from '../../app/motion.js'
import {
  assistantModel,
  buildSessionAnalysis,
  formatCost,
  type TokenSlice,
} from '../../services/chat/analysis.js'
import { getVisibleMessages } from '../../services/chat/branches.js'
import { formatTokens } from '../../services/chat/compression.js'
import {
  clearSessionCompressions,
  restoreSessionCompression,
  useChatStore,
} from '../../services/chat/store.js'
import { useSettings } from '../../services/settings.js'
import { openSettings } from '../settings/settingsDialogState.js'
import { Button } from '../base/Button.js'
import { IconButton } from '../base/IconButton.js'
import { IconChartOutline16, IconCloseOutline16 } from '../base/icons.js'
import { showToast } from '../base/toastState.js'
import { closeAnalysisPanel, useAnalysisPanel } from './analysisPanelState.js'
import styles from './AnalysisPanel.module.css'

const sliceClass: Record<TokenSlice['key'], string> = {
  user: styles.sliceUser,
  assistant: styles.sliceAssistant,
  summary: styles.sliceSummary,
}

/**
 * 右侧分析面板：上下文占比、token 构成、压缩块、最近请求用量、
 * 工具与媒体统计、单条消息占用排行。数据实时读取当前会话。
 */
export const AnalysisPanel = () => {
  const t = useTranslate()
  const open = useAnalysisPanel((state) => state.open)
  const { mounted, closing } = usePresence(open, 200)
  const session = useChatStore((state) =>
    state.activeId !== null && Object.hasOwn(state.sessionCache, state.activeId)
      ? state.sessionCache[state.activeId]
      : undefined
  )
  const compressionEnabled = useSettings((state) => state.contextCompression)
  if (!mounted) {
    return null
  }

  const analysis = session ? buildSessionAnalysis(session, compressionEnabled) : null
  const model = session ? assistantModel(getVisibleMessages(session)) : null
  const percent = analysis ? Math.min(100, Math.round(analysis.ratio * 100)) : 0
  const sliceTotal = analysis
    ? analysis.slices.reduce((total, slice) => total + slice.tokens, 0)
    : 0
  const usageTotal = analysis?.usage
    ? analysis.usage.input_tokens +
      analysis.usage.cache_creation_input_tokens +
      analysis.usage.cache_read_input_tokens +
      analysis.usage.output_tokens
    : 0
  const cachePercent =
    analysis?.cacheHitRate === null || analysis?.cacheHitRate === undefined
      ? '—'
      : `${Math.round(analysis.cacheHitRate * 100)}%`

  return (
    <aside
      className={clsx(styles.panel, !open && closing && styles.closing)}
      aria-label={t('analysisPanel')}
    >
      <div className={styles.header}>
        <span className={styles.headerIcon}>
          <IconChartOutline16 />
        </span>
        <div role="heading" className={styles.title}>
          {t('analysisPanel')}
        </div>
        <IconButton
          icon={<IconCloseOutline16 />}
          aria-label={t('close')}
          onClick={closeAnalysisPanel}
        />
      </div>
      <div className={styles.content}>
        {!session || !analysis ? (
          <div className={styles.placeholder}>{t('analysisPlaceholder')}</div>
        ) : (
          <>
            <section className={styles.card}>
              <div className={styles.cardTitle}>{t('analysisContext')}</div>
              <div className={styles.usageLine}>
                <span className={styles.usageStrong}>
                  {t('analysisUsage', {
                    used: formatTokens(analysis.visibleTokens),
                    total: formatTokens(analysis.window),
                    percent,
                  })}
                </span>
                <span className={styles.muted}>
                  {t('analysisFullTokens')} {formatTokens(analysis.fullTokens)}
                </span>
              </div>
              <div className={styles.progress}>
                <span
                  className={clsx(styles.progressFill, percent >= 80 && styles.progressHigh)}
                  style={{ width: `${percent}%` }}
                />
              </div>
              <div className={styles.thresholds}>{t('analysisThresholds')}</div>
              <div className={styles.stats}>
                <div className={styles.stat}>
                  <span className={styles.statValue}>{analysis.messages}</span>
                  <span className={styles.statLabel}>{t('analysisMessages')}</span>
                </div>
                <div className={styles.stat}>
                  <span className={styles.statValue}>{analysis.rounds}</span>
                  <span className={styles.statLabel}>{t('analysisRounds')}</span>
                </div>
                <div className={styles.stat}>
                  <span className={styles.statValue}>{formatTokens(analysis.visibleTokens)}</span>
                  <span className={styles.statLabel}>{t('analysisVisibleTokens')}</span>
                </div>
                <div className={styles.stat}>
                  <span className={styles.statValue}>{formatTokens(analysis.savedTokens)}</span>
                  <span className={styles.statLabel}>{t('analysisSavedTokens')}</span>
                </div>
              </div>
            </section>

            <section className={styles.card}>
              <div className={styles.cardTitle}>{t('analysisBreakdown')}</div>
              <div className={styles.bar}>
                {analysis.slices.map((slice) =>
                  slice.tokens > 0 ? (
                    <span
                      key={slice.key}
                      className={clsx(styles.segment, sliceClass[slice.key])}
                      style={{ width: `${(slice.tokens / sliceTotal) * 100}%` }}
                    />
                  ) : null
                )}
              </div>
              <div className={styles.legend}>
                {analysis.slices.map((slice) => (
                  <span key={slice.key} className={styles.legendItem}>
                    <span className={clsx(styles.dot, sliceClass[slice.key])} />
                    {t(sliceLabel[slice.key])}
                    <span className={styles.muted}>{formatTokens(slice.tokens)}</span>
                  </span>
                ))}
              </div>
            </section>

            <section className={styles.card}>
              <div className={styles.cardHead}>
                <div className={styles.cardTitle}>{t('analysisCompression')}</div>
                <span className={styles.muted}>
                  {compressionEnabled
                    ? analysis.blocks.length > 0
                      ? t('analysisCompressed', {
                          count: analysis.blocks.length,
                          tokens: formatTokens(analysis.savedTokens),
                        })
                      : t('analysisNoBlocks')
                    : t('analysisCompressionOff')}
                </span>
              </div>
              {!compressionEnabled ? (
                <>
                  <p className={styles.hint}>{t('analysisCompressionOffHint')}</p>
                  <Button
                    variant="outlined"
                    size="s"
                    onClick={() => {
                      closeAnalysisPanel()
                      openSettings('general')
                    }}
                  >
                    {t('analysisOpenSettings')}
                  </Button>
                </>
              ) : analysis.blocks.length === 0 ? null : (
                <>
                  <div className={styles.blockList}>
                    {analysis.blocks.map((block) => (
                      <div key={block.id} className={styles.block}>
                        <div className={styles.blockHead}>
                          <span className={styles.blockTitle}>
                            {block.id} · {block.startRef}–{block.endRef} ·{' '}
                            {t('compressionTier', { tier: block.tier })}
                          </span>
                          <span className={styles.muted}>
                            {t('analysisBlockMeta', {
                              before: formatTokens(block.tokensBefore),
                              after: formatTokens(block.tokensAfter),
                            })}
                          </span>
                        </div>
                        <div className={styles.summary}>{block.summary}</div>
                        <div className={styles.blockActions}>
                          <Button
                            variant="outlined"
                            size="s"
                            onClick={() => {
                              restoreSessionCompression(session.id, block.id)
                              showToast({ key: 'compressionRestored' })
                            }}
                          >
                            {t('analysisRestore')}
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className={styles.cardActions}>
                    <Button
                      variant="outlined"
                      size="s"
                      onClick={() => {
                        clearSessionCompressions(session.id)
                        showToast({ key: 'compressionAllRestored' })
                      }}
                    >
                      {t('analysisRestoreAll')}
                    </Button>
                  </div>
                </>
              )}
            </section>

            <section className={styles.card}>
              <div className={styles.cardHead}>
                <div className={styles.cardTitle}>{t('analysisLastUsage')}</div>
                <span className={styles.muted}>
                  {t('analysisModel')}: {model ?? '—'}
                </span>
              </div>
              {analysis.usage ? (
                <>
                  <div className={styles.usageGrid}>
                    <div className={styles.usageCell}>
                      <span className={styles.muted}>{t('analysisInputTokens')}</span>
                      <span>{analysis.usage.input_tokens}</span>
                    </div>
                    <div className={styles.usageCell}>
                      <span className={styles.muted}>{t('analysisCacheRead')}</span>
                      <span>{analysis.usage.cache_read_input_tokens}</span>
                    </div>
                    <div className={styles.usageCell}>
                      <span className={styles.muted}>{t('analysisCacheCreate')}</span>
                      <span>{analysis.usage.cache_creation_input_tokens}</span>
                    </div>
                    <div className={styles.usageCell}>
                      <span className={styles.muted}>{t('analysisOutputTokens')}</span>
                      <span>{analysis.usage.output_tokens}</span>
                    </div>
                  </div>
                  <div className={styles.usageFooter}>
                    <span>
                      {t('analysisTotalTokens')}: {usageTotal}
                    </span>
                    <span>
                      {t('analysisCacheHitRate')}: {cachePercent}
                    </span>
                  </div>
                  <div className={styles.usageTotals}>
                    <span>{t('analysisSessionUsage')}</span>
                    <span>
                      {t('analysisCostInput')} {formatTokens(analysis.usageTotals.input)}
                    </span>
                    <span>
                      {t('analysisCostCache')} {formatTokens(analysis.usageTotals.cacheRead)}
                    </span>
                    <span>
                      {t('analysisCostOutput')} {formatTokens(analysis.usageTotals.output)}
                    </span>
                  </div>
                </>
              ) : (
                <p className={styles.hint}>{t('analysisNoUsage')}</p>
              )}
            </section>

            <section className={styles.card}>
              <div className={styles.cardHead}>
                <div className={styles.cardTitle}>{t('analysisCost')}</div>
                {analysis.cost.last ? (
                  <span className={clsx(styles.badge, analysis.cost.last.peak && styles.badgePeak)}>
                    {t(analysis.cost.last.peak ? 'analysisPeak' : 'analysisIdle')}
                  </span>
                ) : null}
              </div>
              {analysis.cost.last ? (
                <>
                  <div className={styles.costGrid}>
                    <div className={styles.costCell}>
                      <span className={styles.costValue}>{formatCost(analysis.cost.total)}</span>
                      <span className={styles.muted}>{t('analysisTotalCost')}</span>
                    </div>
                    <div className={styles.costCell}>
                      <span className={styles.costValue}>
                        {formatCost(analysis.cost.equivalent)}
                      </span>
                      <span className={styles.muted}>{t('analysisEquivalentCost')}</span>
                    </div>
                  </div>
                  <div className={styles.costRows}>
                    <span>
                      {t('analysisLastRequestCost')} {formatCost(analysis.cost.last.total)}
                    </span>
                    <span>
                      {t('analysisCacheSaved')} {formatCost(analysis.cost.cacheSaved)}
                    </span>
                    <span>
                      {t('analysisCompressionNet')} {formatCost(analysis.cost.compression.net)}
                    </span>
                  </div>
                  <div className={styles.costRows}>
                    <span>
                      {t('analysisCostInput')} {formatCost(analysis.cost.last.input)}
                    </span>
                    <span>
                      {t('analysisCostCache')} {formatCost(analysis.cost.last.cache)}
                    </span>
                    <span>
                      {t('analysisCostOutput')} {formatCost(analysis.cost.last.output)}
                    </span>
                  </div>
                  <div className={styles.costRows}>
                    <span>
                      {t('analysisCompressionRequests', {
                        count: analysis.cost.compression.requests,
                      })}
                    </span>
                    <span>
                      {t('analysisCompressionGross')} {formatCost(analysis.cost.compression.gross)}
                    </span>
                    <span>
                      {t('analysisCompressionSummaryCost')}{' '}
                      {formatCost(analysis.cost.compression.summary)}
                    </span>
                  </div>
                  {analysis.blocks.length > 0 ? (
                    <div className={styles.payback}>
                      <span>{t('analysisPayback')}</span>
                      <span
                        className={clsx(
                          styles.paybackValue,
                          analysis.cost.compression.net < 0 && styles.paybackNegative
                        )}
                      >
                        {analysis.cost.compression.net >= 0
                          ? t('analysisPaidBack')
                          : t('analysisNotPaidBack', {
                              amount: formatCost(-analysis.cost.compression.net),
                            })}
                      </span>
                    </div>
                  ) : null}
                  <div className={styles.muted}>{t('analysisCostNote')}</div>
                  <a
                    className={styles.priceLink}
                    href="https://api-docs.deepseek.com/zh-cn/quick_start/pricing"
                    target="_blank"
                    rel="noreferrer"
                  >
                    {t('analysisPriceSource')} ↗
                  </a>
                </>
              ) : (
                <p className={styles.hint}>{t('analysisNoUsage')}</p>
              )}
            </section>

            {analysis.cacheSeries.length > 0 ? (
              <section className={styles.card}>
                <div className={styles.cardHead}>
                  <div className={styles.cardTitle}>{t('analysisCacheTrend')}</div>
                  <span className={styles.muted}>
                    {t('analysisCacheHitRate')}: {cachePercent}
                  </span>
                </div>
                <div className={styles.spark} aria-hidden>
                  {analysis.cacheSeries.map((sample, index) => (
                    <span
                      key={`${sample.timestamp}-${index}`}
                      className={styles.sparkBar}
                      style={{ height: `${Math.max(4, Math.round(sample.rate * 100))}%` }}
                      title={`${Math.round(sample.rate * 100)}%`}
                    />
                  ))}
                </div>
                <div className={styles.sparkScale}>
                  <span>0%</span>
                  <span>100%</span>
                </div>
              </section>
            ) : null}

            <section className={styles.card}>
              <div className={styles.cardTitle}>{t('analysisToolsMedia')}</div>
              <div className={styles.mediaRow}>
                <span>{t('analysisImages')}</span>
                <span>{analysis.images}</span>
              </div>
              <div className={styles.mediaRow}>
                <span>{t('analysisAttachments')}</span>
                <span>{analysis.attachments}</span>
              </div>
              <div className={styles.subTitle}>{t('analysisToolCalls')}</div>
              {analysis.tools.length > 0 ? (
                <div className={styles.chips}>
                  {analysis.tools.map((tool) => (
                    <span key={tool.name} className={styles.chip}>
                      {tool.name}
                      <span className={styles.chipCount}>{tool.count}</span>
                    </span>
                  ))}
                </div>
              ) : (
                <p className={styles.hint}>{t('analysisNoTools')}</p>
              )}
            </section>

            <section className={styles.card}>
              <div className={styles.cardTitle}>{t('analysisLargestMessages')}</div>
              <div className={styles.largestList}>
                {analysis.largest.map((item) => (
                  <div key={item.ref} className={styles.largestRow}>
                    <span className={styles.ref}>{item.ref}</span>
                    <span className={styles.role}>
                      {t(item.role === 'user' ? 'analysisUser' : 'analysisAssistant')}
                    </span>
                    <span className={styles.preview}>{item.preview || '—'}</span>
                    <span className={styles.muted}>{formatTokens(item.tokens)}</span>
                  </div>
                ))}
              </div>
            </section>

            <div className={styles.footnote}>{t('analysisEstimated')}</div>
          </>
        )}
      </div>
    </aside>
  )
}

const sliceLabel = {
  user: 'analysisUser',
  assistant: 'analysisAssistant',
  summary: 'analysisSummary',
} as const
