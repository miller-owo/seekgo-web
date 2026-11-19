import { useIsMobile } from '../../app/viewport.js'
import seekgoMark from '../../assets/seekgo-mark.png'
import { useTranslate } from '../../i18n/index.js'
import { ChatInput } from '../chatInput/ChatInput.js'
import { MobileHeader } from './MobileHeader.js'
import styles from './Welcome.module.css'

/** 新对话：品牌标识 + 问候语 + 输入框。桌面端居中；移动端输入框吸底 */
export const Welcome = () => {
  const t = useTranslate()
  const isMobile = useIsMobile()
  return (
    <div className={styles.container}>
      {isMobile ? <MobileHeader /> : null}
      <div className={styles.welcome}>
        <div className={styles.head}>
          <img className={styles.brandMark} src={seekgoMark} alt="" width={32} height={32} />
          <div className={styles.greeting}>{t('welcomeMessageChat250808')}</div>
        </div>
        <div className={styles.chatInput}>
          <ChatInput sessionId={null} />
        </div>
        {isMobile ? <div className={styles.caveat}>{t('contentCaveat')}</div> : null}
      </div>
    </div>
  )
}
