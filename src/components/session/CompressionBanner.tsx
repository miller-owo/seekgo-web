import { useState } from 'react'
import { useTranslate } from '../../i18n/index.js'
import { getVisibleMessages } from '../../services/chat/branches.js'
import { compressionStats, formatTokens } from '../../services/chat/compression.js'
import { clearSessionCompressions, restoreSessionCompression } from '../../services/chat/store.js'
import type { Session } from '../../services/chat/types.js'
import { useSettings } from '../../services/settings.js'
import { Button } from '../base/Button.js'
import { IconLayersOutline16 } from '../base/icons.js'
import { Modal } from '../base/Modal.js'
import { showToast } from '../base/toastState.js'
import styles from './CompressionBanner.module.css'

/**
 * 会话顶部的压缩状态条：显示生效的折叠块与节省量，可查看摘要、逐块恢复或恢复全部。
 * 只在当前分支上仍然有效的块会显示。
 */
export const CompressionBanner = ({ session }: { session: Session }) => {
  const t = useTranslate()
  const enabled = useSettings((state) => state.contextCompression)
  const [open, setOpen] = useState(false)
  const messages = getVisibleMessages(session)
  const { blocks, saved } = compressionStats(session, messages)
  if (!enabled || blocks.length === 0) {
    return null
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.banner}>
        <span className={styles.icon}>
          <IconLayersOutline16 />
        </span>
        <div className={styles.text}>
          <span className={styles.title}>
            {t('compressionBannerTitle', { count: blocks.length })}
          </span>
          <span className={styles.meta}>
            {t('compressionBannerMeta', { tokens: formatTokens(saved) })}
          </span>
        </div>
        <div className={styles.actions}>
          <button type="button" className={styles.action} onClick={() => setOpen(true)}>
            {t('compressionView')}
          </button>
          <button
            type="button"
            className={styles.action}
            onClick={() => {
              clearSessionCompressions(session.id)
              setOpen(false)
              showToast({ key: 'compressionAllRestored' })
            }}
          >
            {t('compressionRestoreAll')}
          </button>
        </div>
      </div>
      {open ? (
        <Modal
          title={t('compressionModalTitle')}
          closable
          className={styles.modal}
          onClose={() => setOpen(false)}
        >
          <div className={styles.modalDescription}>{t('compressionModalDescription')}</div>
          <div className={styles.blockList}>
            {blocks.map((block) => (
              <div key={block.id} className={styles.block}>
                <div className={styles.blockHeader}>
                  <span className={styles.blockTitle}>
                    {block.id} · {block.startRef}–{block.endRef} ·{' '}
                    {t('compressionTier', { tier: block.tier })}
                  </span>
                  <span className={styles.blockMeta}>
                    {formatTokens(block.tokensBefore)} → {formatTokens(block.tokensAfter)} tokens
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
                    {t('compressionRestoreOne')}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Modal>
      ) : null}
    </div>
  )
}
