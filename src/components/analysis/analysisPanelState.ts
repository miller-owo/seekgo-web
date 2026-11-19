import { create } from 'zustand'
import { closeSearchPanel } from '../search/searchPanelState.js'

/** 右侧分析面板的开合；分析内容实时读取当前会话，不另存一份。 */
export const useAnalysisPanel = create(() => ({ open: false }))

export const toggleAnalysisPanel = () => {
  const next = !useAnalysisPanel.getState().open
  if (next) {
    // 同一时间只保留一个右侧面板，避免把对话区挤得太窄。
    closeSearchPanel()
  }
  useAnalysisPanel.setState({ open: next })
}

export const closeAnalysisPanel = () => useAnalysisPanel.setState({ open: false })
