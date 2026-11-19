import { useTranslate, type TranslationKey } from '../../i18n/index.js'
import {
  IMAGE_CAPABILITIES,
  IMAGE_MODEL_PRESETS,
  IMAGE_PROVIDERS,
  setImageEnabled,
  setImageProvider,
  updateImageProvider,
  updateSeedreamOptions,
  useImageGen,
  type ImageProvider,
} from '../../services/imageGen.js'
import { Select } from '../base/Select.js'
import { Switch } from '../base/Switch.js'
import styles from './ImageGenerationSettings.module.css'

const providerLabelKeys: Record<ImageProvider, TranslationKey> = {
  'openai-compat': 'imageProviderOpenaiCompat',
  openai: 'imageProviderOpenai',
  google: 'imageProviderGoogle',
  seedream: 'imageProviderSeedream',
  dashscope: 'imageProviderDashscope',
  xai: 'imageProviderXai',
  zhipu: 'imageProviderZhipu',
}

/**
 * 工具配置里的「图像生成」：按 Provider 配置独立的 Key / Endpoint / 模型，
 * 以及尺寸、宽高比、分辨率、质量和 Seedream 输出选项。
 * 这是 dsh-image-gen 的功能级精简移植，只保留纯前端能直连的云 Provider。
 */
export const ImageGenerationSettings = () => {
  const t = useTranslate()
  const enabled = useImageGen((state) => state.enabled)
  const provider = useImageGen((state) => state.provider)
  const config = useImageGen((state) => state.providers[state.provider])
  const seedream = useImageGen((state) => state.seedream)
  const capability = IMAGE_CAPABILITIES[provider]
  const update = (patch: Partial<typeof config>) => updateImageProvider(provider, patch)
  const providerOptions = IMAGE_PROVIDERS.map((value) => ({
    value,
    label: t(providerLabelKeys[value]),
  }))
  const incomplete = !config.apiKey.trim() || !config.endpoint.trim() || !config.model.trim()
  const sizeListId = 'image-size-presets'
  const modelListId = 'image-model-presets'

  return (
    <div className={styles.section}>
      <div className={styles.header}>
        <div className={styles.text}>
          <div className={styles.title}>{t('settingsImageGen')}</div>
          <div className={styles.description}>{t('settingsImageGenDescription')}</div>
        </div>
        <Switch checked={enabled} label={t('settingsImageGen')} onChange={setImageEnabled} />
      </div>
      {enabled ? (
        <div className={styles.fields}>
          <div className={styles.field}>
            <span className={styles.label}>{t('settingsImageProvider')}</span>
            <Select<ImageProvider>
              ariaLabel={t('settingsImageProvider')}
              className={styles.provider}
              value={provider}
              options={providerOptions}
              onChange={setImageProvider}
            />
          </div>
          <label className={styles.field}>
            <span className={styles.label}>{t('settingsImageApiKey')}</span>
            <input
              className={styles.input}
              type="password"
              value={config.apiKey}
              spellCheck={false}
              autoComplete="off"
              placeholder="sk-..."
              onChange={(event) => update({ apiKey: event.target.value })}
            />
          </label>
          <label className={styles.field}>
            <span className={styles.label}>{t('settingsImageEndpoint')}</span>
            <input
              className={styles.input}
              value={config.endpoint}
              spellCheck={false}
              autoComplete="off"
              placeholder="https://api.example.com/v1"
              onChange={(event) => update({ endpoint: event.target.value })}
            />
          </label>
          <label className={styles.field}>
            <span className={styles.label}>{t('settingsImageModel')}</span>
            <input
              className={styles.input}
              value={config.model}
              list={modelListId}
              spellCheck={false}
              autoComplete="off"
              placeholder={IMAGE_MODEL_PRESETS[provider][0] ?? 'model-id'}
              onChange={(event) => update({ model: event.target.value })}
            />
          </label>
          <datalist id={modelListId}>
            {IMAGE_MODEL_PRESETS[provider].map((model) => (
              <option key={model} value={model} />
            ))}
          </datalist>

          <div className={styles.paramRow}>
            {capability.sizes.length > 0 ? (
              <label className={styles.paramField}>
                <span className={styles.label}>{t('settingsImageSize')}</span>
                <input
                  className={styles.input}
                  value={config.size}
                  list={sizeListId}
                  spellCheck={false}
                  autoComplete="off"
                  onChange={(event) => update({ size: event.target.value })}
                />
                <datalist id={sizeListId}>
                  {capability.sizes.map((size) => (
                    <option key={size} value={size} />
                  ))}
                </datalist>
              </label>
            ) : null}
            {capability.ratios.length > 0 ? (
              <div className={styles.paramField}>
                <span className={styles.label}>{t('settingsImageAspect')}</span>
                <Select
                  ariaLabel={t('settingsImageAspect')}
                  className={styles.paramSelect}
                  value={config.aspectRatio}
                  options={capability.ratios.map((value) => ({ value, label: value }))}
                  onChange={(value) => update({ aspectRatio: value })}
                />
              </div>
            ) : null}
            {capability.imageSizes.length > 0 ? (
              <div className={styles.paramField}>
                <span className={styles.label}>{t('settingsImageResolution')}</span>
                <Select
                  ariaLabel={t('settingsImageResolution')}
                  className={styles.paramSelect}
                  value={config.imageSize}
                  options={capability.imageSizes.map((value) => ({ value, label: value }))}
                  onChange={(value) => update({ imageSize: value })}
                />
              </div>
            ) : null}
            {capability.qualities.length > 0 ? (
              <div className={styles.paramField}>
                <span className={styles.label}>{t('settingsImageQuality')}</span>
                <Select
                  ariaLabel={t('settingsImageQuality')}
                  className={styles.paramSelect}
                  value={config.quality}
                  options={capability.qualities.map((value) => ({ value, label: value }))}
                  onChange={(value) => update({ quality: value })}
                />
              </div>
            ) : null}
          </div>

          {provider === 'seedream' ? (
            <div className={styles.paramRow}>
              <div className={styles.paramField}>
                <span className={styles.label}>{t('settingsImageSeedreamOutput')}</span>
                <Select
                  ariaLabel={t('settingsImageSeedreamOutput')}
                  className={styles.paramSelect}
                  value={seedream.outputFormat}
                  options={[
                    { value: 'jpeg', label: 'JPEG' },
                    { value: 'png', label: 'PNG' },
                  ]}
                  onChange={(value) =>
                    updateSeedreamOptions({ outputFormat: value === 'png' ? 'png' : 'jpeg' })
                  }
                />
              </div>
              <div className={styles.paramSwitch}>
                <span className={styles.label}>{t('settingsImageSeedreamWatermark')}</span>
                <Switch
                  checked={seedream.watermark}
                  label={t('settingsImageSeedreamWatermark')}
                  onChange={(checked) => updateSeedreamOptions({ watermark: checked })}
                />
              </div>
            </div>
          ) : null}

          {provider === 'openai-compat' ? (
            <label className={styles.field}>
              <span className={styles.label}>{t('settingsImageExtraBody')}</span>
              <textarea
                className={`${styles.input} ${styles.textarea} ${styles.code}`}
                value={config.extraBody}
                rows={3}
                spellCheck={false}
                placeholder='{"negative_prompt": "..."}'
                onChange={(event) => update({ extraBody: event.target.value })}
              />
              <span className={styles.hint}>{t('settingsImageExtraBodyHint')}</span>
            </label>
          ) : null}

          <div className={styles.hint}>{t('settingsImageHint')}</div>
          {incomplete ? <div className={styles.warning}>{t('settingsImageIncomplete')}</div> : null}
        </div>
      ) : null}
    </div>
  )
}
