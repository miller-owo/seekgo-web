import { openPhotoView, type PhotoSource } from './photoViewState.js'

/**
 * 同一条消息里的图片共用一个分组：缩略图陆续加载完成时也能保持渲染顺序，
 * 点开任意一张即可在查看器里左右切换。
 */
export type PhotoGroup = {
  /** 登记一张已加载的图片，返回注销函数 */
  register: (id: string, source: PhotoSource) => () => void
  /** 以点击的图片为起点打开整组 */
  open: (id: string) => void
}

/** order 是缩略图的渲染顺序，通常是消息里图片附件的 ID 列表 */
export const createPhotoGroup = (order: readonly string[]): PhotoGroup => {
  const sources = new Map<string, PhotoSource>()
  const entries = () =>
    order.flatMap((id) => {
      const source = sources.get(id)
      return source ? [{ id, source }] : []
    })

  return {
    register: (id, source) => {
      sources.set(id, source)
      return () => {
        sources.delete(id)
      }
    },
    open: (id) => {
      const items = entries()
      const index = items.findIndex((item) => item.id === id)
      if (index >= 0) {
        openPhotoView(
          items.map((item) => item.source),
          index
        )
      }
    },
  }
}
