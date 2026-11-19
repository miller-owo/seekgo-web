import clsx from 'clsx'
import { useRef } from 'react'
import { usePresence } from '../../app/motion.js'
import { useTranslate } from '../../i18n/index.js'
import { IconToastError16 } from './icons.js'
import { useToast } from './toastState.js'
import styles from './Toast.module.css'

/** 顶部轻提示：出现时下滑淡入，消失前先淡出，新提示替换旧提示 */
export const Toast = () => {
  const t = useTranslate()
  const { id, message } = useToast()
  // 退场期间消息已置空，保留最后一条内容继续渲染
  const lastRef = useRef(message)
  if (message) {
    lastRef.current = message
  }
  const { mounted, closing } = usePresence(Boolean(message), 180)
  const shown = message ?? lastRef.current
  if (!mounted || !shown) {
    return null
  }
  const className = clsx(styles.toast, !message && closing && styles.closing)
  if (typeof shown === 'string') {
    return (
      <div key={id} className={className} role="status">
        {shown}
      </div>
    )
  }
  const error = shown.type === 'error'
  return (
    <div key={id} className={clsx(className, error && styles.error)} role="status">
      {error ? (
        <span className={styles.icon}>
          <IconToastError16 />
        </span>
      ) : null}
      <span className={styles.content}>
        {t(shown.key, shown.params)}
        {shown.link ? (
          <a className={styles.link} href={shown.link.href} target="_blank" rel="noreferrer">
            {t(shown.link.key)}
          </a>
        ) : null}
      </span>
    </div>
  )
}
