import { create } from 'zustand'

/** 查看器里的一张图：本地 Blob、data URL 和远程地址都按同一种描述传入 */
export type PhotoSource = {
  src: string
  /** 无障碍描述；附件用文件名，生图用提示词 */
  alt?: string
  /** 下载时使用的文件名 */
  filename?: string
}

type PhotoViewState = {
  open: boolean
  slides: PhotoSource[]
  index: number
}

export const usePhotoViewState = create<PhotoViewState>(() => ({
  open: false,
  slides: [],
  index: 0,
}))

/** 打开查看器；index 越界时收敛到第一张或最后一张 */
export const openPhotoView = (slides: PhotoSource[], index = 0) => {
  if (slides.length === 0) {
    return
  }
  usePhotoViewState.setState({
    open: true,
    slides,
    index: Math.min(Math.max(index, 0), slides.length - 1),
  })
}

/** yarl 播完退场动画后会调用它，因此这里只负责卸载 */
export const closePhotoView = () => usePhotoViewState.setState({ open: false })
