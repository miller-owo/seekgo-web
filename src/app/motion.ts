import { useEffect, useRef, useState } from 'react'

/**
 * 动效时长（毫秒），与 theme.css 中的 --ds-motion-* 变量保持一致。
 * 退场类动画需要在 JS 里按时长卸载节点，所以这里也保留一份。
 */
export const MOTION = {
  fast: 140,
  base: 220,
  slow: 320,
  /** 弹窗、抽屉这类大面积浮层的退场 */
  exit: 180,
} as const

/** 系统是否要求减少动效；SSR 或旧浏览器按「不减少」处理。 */
export const prefersReducedMotion = (): boolean => {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false
  }
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/**
 * 用来给「从树里移除」的浮层补一段退场动画：
 * open 变 false 后先保持挂载 `exitDuration`，期间 closing 为 true，
 * 到点后再真正卸载。系统要求减少动效或时长为 0 时立即卸载。
 */
export const usePresence = (open: boolean, exitDuration: number = MOTION.exit) => {
  const [mounted, setMounted] = useState(open)
  const [closing, setClosing] = useState(false)
  const timer = useRef(0)

  useEffect(() => {
    window.clearTimeout(timer.current)
    if (open) {
      setClosing(false)
      setMounted(true)
      return
    }
    if (!mounted) {
      return
    }
    if (exitDuration <= 0 || prefersReducedMotion()) {
      setClosing(false)
      setMounted(false)
      return
    }
    setClosing(true)
    timer.current = window.setTimeout(() => {
      setClosing(false)
      setMounted(false)
    }, exitDuration)
    return () => window.clearTimeout(timer.current)
  }, [exitDuration, mounted, open])

  useEffect(() => () => window.clearTimeout(timer.current), [])

  return { mounted, closing }
}
