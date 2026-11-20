import { useMemo } from 'react'
import Lightbox from 'yet-another-react-lightbox'
import Counter from 'yet-another-react-lightbox/plugins/counter'
import Download from 'yet-another-react-lightbox/plugins/download'
import Zoom from 'yet-another-react-lightbox/plugins/zoom'
import 'yet-another-react-lightbox/styles.css'
import 'yet-another-react-lightbox/plugins/counter.css'
import { MOTION } from '../../app/motion.js'
import { useTranslate } from '../../i18n/index.js'
import { closePhotoView, usePhotoViewState } from './photoViewState.js'
import styles from './PhotoView.module.css'

/** 插件会把自己的按钮插到工具栏：缩放、下载，最后是关闭 */
const PLUGINS = [Download, Zoom]
const PLUGINS_WITH_COUNTER = [Counter, Download, Zoom]

/**
 * 全屏图片查看器。图片来自 Blob URL、data URL 或远程地址，
 * 打开时把所有图片交给 yarl，由它负责缩放、拖动、键盘和退场。
 */
export const PhotoView = () => {
  const t = useTranslate()
  const { open, slides, index } = usePhotoViewState()
  const multiple = slides.length > 1
  // 保持 slides 引用稳定：yarl 依据它同步内部状态，父组件重渲染不应把浏览位置拉回起点
  const lightboxSlides = useMemo(
    () =>
      slides.map((slide) => ({
        src: slide.src,
        alt: slide.alt,
        ...(slide.filename ? { download: { url: slide.src, filename: slide.filename } } : {}),
      })),
    [slides]
  )

  return (
    <Lightbox
      open={open}
      close={closePhotoView}
      index={index}
      slides={lightboxSlides}
      plugins={multiple ? PLUGINS_WITH_COUNTER : PLUGINS}
      labels={{
        Close: t('close'),
        Previous: t('photoViewerPrevious'),
        Next: t('photoViewerNext'),
        Download: t('photoViewerDownload'),
        'Zoom in': t('photoViewerZoomIn'),
        'Zoom out': t('photoViewerZoomOut'),
        Lightbox: t('photoViewerLabel'),
        'Photo gallery': t('photoViewerGallery'),
        Carousel: t('photoViewerCarousel'),
        Slide: t('photoViewerImage'),
        '{index} of {total}': t('photoViewerPosition'),
      }}
      // data: 地址在下载插件里会被当成跨域打开新标签，转成 Blob 才能真正保存
      download={{
        download: ({ slide, saveAs }) => {
          const source = slide.src
          const filename = typeof slide.download === 'object' ? slide.download.filename : undefined
          if (source.startsWith('data:')) {
            void fetch(source)
              .then((response) => response.blob())
              .then((blob) => saveAs(blob, filename))
              .catch(() => saveAs(source, filename))
          } else {
            saveAs(source, filename)
          }
        },
      }}
      zoom={{ maxZoomPixelRatio: 2, scrollToZoom: true }}
      // 点遮罩或下拉关闭，和聊天应用里的图片预览习惯保持一致
      controller={{ closeOnBackdropClick: true, closeOnPullDown: true }}
      // 与 --ds-motion-base 对齐；yarl 自己处理 prefers-reduced-motion
      animation={{ fade: MOTION.base }}
      // 单张图片没有可切换的目标，不显示左右箭头
      render={multiple ? undefined : { buttonPrev: () => null, buttonNext: () => null }}
      className={styles.root}
      styles={{
        root: {
          '--yarl__color_backdrop': 'rgba(10, 10, 12, 0.96)',
          '--yarl__icon_size': '24px',
          '--yarl__button_padding': '9px',
          '--yarl__toolbar_padding': '10px',
        },
      }}
    />
  )
}
