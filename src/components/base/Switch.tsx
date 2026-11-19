import clsx from 'clsx'
import styles from './Switch.module.css'

/**
 * 开关：受控组件，点击或按空格切换。
 * 用 role="switch" 表达状态，读屏器按 aria-checked 朗读；label 同时作为无障碍名称。
 */
export const Switch = ({
  checked,
  onChange,
  label,
  disabled = false,
  className,
}: {
  checked: boolean
  onChange: (checked: boolean) => void
  label: string
  disabled?: boolean
  className?: string
}) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    aria-label={label}
    disabled={disabled}
    className={clsx(styles.switch, className)}
    onClick={() => onChange(!checked)}
  >
    <span className={styles.track} aria-hidden>
      <span className={styles.thumb} />
    </span>
  </button>
)
