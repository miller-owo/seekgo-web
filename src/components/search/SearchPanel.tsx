import clsx from 'clsx'
import { useRef } from 'react'
import { usePresence } from '../../app/motion.js'
import { useTranslate } from '../../i18n/index.js'
import { IconCloseOutline16 } from '../base/icons.js'
import { IconButton } from '../base/IconButton.js'
import { closeSearchPanel, useSearchPanel } from './searchPanelState.js'
import { SourceCard } from './SourceCard.js'
import styles from './SearchPanel.module.css'

/** 右侧「搜索结果」面板；关闭时先向右收一下再卸载 */
export const SearchPanel = () => {
  const t = useTranslate()
  const entry = useSearchPanel((state) => state.entry)
  const sources = useSearchPanel((state) => state.sources)
  // 关闭时状态已清空，用最后一次的内容播放退场动画
  const lastRef = useRef({ entry, sources })
  if (entry) {
    lastRef.current = { entry, sources }
  }
  const { mounted, closing } = usePresence(Boolean(entry), 200)
  if (!mounted) {
    return null
  }
  const shown = entry ? { entry, sources } : lastRef.current
  return (
    <aside className={clsx(styles.panel, !entry && closing && styles.closing)}>
      <div className={styles.header}>
        <div role="heading" className={styles.title}>
          {t('searchResult')}
        </div>
        <IconButton
          icon={<IconCloseOutline16 />}
          aria-label={t('close')}
          onClick={closeSearchPanel}
        />
      </div>
      <div className={styles.content}>
        {shown.sources.map((source) => (
          <SourceCard key={source.url} source={source} className={styles.item} />
        ))}
      </div>
    </aside>
  )
}
