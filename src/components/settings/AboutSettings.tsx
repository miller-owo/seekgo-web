import type { ReactNode } from 'react'
import seekgoMark from '../../assets/seekgo-mark.png'
import { useTranslate } from '../../i18n/index.js'
import styles from './AboutSettings.module.css'

/** 构建时 HtmlRspackPlugin 注入的版本号；直接打开 index.html 时也能读到。 */
const appVersion = () =>
  document.querySelector<HTMLMetaElement>('meta[name="application-version"]')?.content ?? ''

const Credit = ({
  name,
  license,
  description,
  href,
}: {
  name: string
  license: string
  description: ReactNode
  href: string
}) => (
  <div className={styles.credit}>
    <div className={styles.creditHeader}>
      <span className={styles.creditName}>{name}</span>
      <span className={styles.creditLicense}>{license}</span>
    </div>
    <div className={styles.creditText}>{description}</div>
    <a className={styles.creditLink} href={href} target="_blank" rel="noreferrer">
      GitHub ↗
    </a>
  </div>
)

/**
 * 关于页：产品信息、能力移植说明、第三方署名与许可入口。
 * billion-context 的附加条款要求在产品可见的 About/Credits 页面标明出处。
 */
export const AboutSettings = () => {
  const t = useTranslate()
  const version = appVersion()
  return (
    <div className={styles.about}>
      <div className={styles.hero}>
        <img className={styles.mark} src={seekgoMark} alt="" width={48} height={48} />
        <div className={styles.identity}>
          <div className={styles.name}>{t('appName')}</div>
          <div className={styles.version}>
            {version ? t('aboutVersion', { version }) : t('aboutTagline')}
          </div>
        </div>
      </div>
      <p className={styles.paragraph}>{t('aboutDescription')}</p>

      <div className={styles.sectionTitle}>{t('aboutCreditsTitle')}</div>
      <Credit
        name="dsh-image-gen"
        license="Apache-2.0"
        href="https://github.com/shanliuling/dsh-image-gen"
        description={t('aboutCreditImageGen')}
      />
      <Credit
        name="billion-context"
        license={t('aboutLicenseMitAttribution')}
        href="https://github.com/ranxianglei/billion-context"
        description={
          <>
            {t('aboutCreditCompression')}{' '}
            <a
              className={styles.inlineLink}
              href="https://github.com/ranxianglei/billion-context"
              target="_blank"
              rel="noreferrer"
            >
              {t('aboutBillionAttribution')}
            </a>
          </>
        }
      />
      <Credit
        name="deepseek-ai/chat-demo"
        license="MIT"
        href="https://github.com/deepseek-ai/chat-demo"
        description={t('aboutCreditChatDemo')}
      />

      <div className={styles.sectionTitle}>{t('aboutLicenseTitle')}</div>
      <p className={styles.paragraph}>{t('aboutLicenseDescription')}</p>
      <div className={styles.licenseLinks}>
        <a href="NOTICE" target="_blank" rel="noreferrer">
          NOTICE
        </a>
        <a href="licenses/dsh-image-gen-LICENSE.txt" target="_blank" rel="noreferrer">
          Apache-2.0
        </a>
        <a href="licenses/billion-context-LICENSE.txt" target="_blank" rel="noreferrer">
          billion-context license
        </a>
        <a href="licenses/chat-demo-LICENSE.txt" target="_blank" rel="noreferrer">
          chat-demo license
        </a>
      </div>
      <p className={styles.disclaimer}>{t('aboutDisclaimer')}</p>
    </div>
  )
}
