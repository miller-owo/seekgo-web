import clsx from 'clsx'
import { useState } from 'react'
import { useTranslate, type TranslationKey } from '../../i18n/index.js'
import {
  addCustomTool,
  DEFAULT_INPUT_SCHEMA,
  parseCustomToolDraft,
  updateCustomTool,
  type CustomTool,
  type HttpMethod,
} from '../../services/customTools.js'
import { Button } from '../base/Button.js'
import { Modal } from '../base/Modal.js'
import { Select } from '../base/Select.js'
import styles from './CustomToolDialog.module.css'

const methods: HttpMethod[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']

/** 保存前把能解析的 JSON 排版，减少手写错误；解析失败保持原文，交给校验报错。 */
const formatJson = (value: string) => {
  if (!value.trim()) {
    return value
  }
  try {
    return JSON.stringify(JSON.parse(value), null, 2)
  } catch {
    return value
  }
}

/**
 * 新增 / 编辑自定义 HTTP 工具。
 * 名称与说明写给模型看；参数是 JSON Schema；请求头与参数在保存时统一校验。
 */
export const CustomToolDialog = ({
  tool,
  onClose,
}: {
  /** null 表示新增 */
  tool: CustomTool | null
  onClose: () => void
}) => {
  const t = useTranslate()
  const [name, setName] = useState(tool?.name ?? '')
  const [description, setDescription] = useState(tool?.description ?? '')
  const [method, setMethod] = useState<HttpMethod>(tool?.method ?? 'GET')
  const [url, setUrl] = useState(tool?.url ?? '')
  const [headers, setHeaders] = useState(
    tool && Object.keys(tool.headers).length > 0 ? JSON.stringify(tool.headers, null, 2) : ''
  )
  const [inputSchema, setInputSchema] = useState(
    tool ? JSON.stringify(tool.inputSchema, null, 2) : DEFAULT_INPUT_SCHEMA
  )
  const [error, setError] = useState<TranslationKey | null>(null)

  const save = () => {
    const parsed = parseCustomToolDraft(
      { name, description, method, url, headers, inputSchema },
      tool?.id
    )
    if (!parsed.ok) {
      setError(parsed.key)
      return
    }
    if (tool) {
      updateCustomTool({ ...tool, ...parsed.value })
    } else {
      addCustomTool(parsed.value)
    }
    onClose()
  }

  return (
    <Modal
      title={t(tool ? 'settingsToolEditTitle' : 'settingsToolAddTitle')}
      closable
      className={styles.dialog}
      mainClassName={styles.main}
      onClose={onClose}
      footer={
        <>
          <Button variant="outlined" onClick={onClose}>
            {t('cancel')}
          </Button>
          <Button onClick={save}>{t('settingsToolSave')}</Button>
        </>
      }
    >
      <div className={styles.form}>
        {error ? (
          <div role="alert" className={styles.error}>
            {t(error)}
          </div>
        ) : null}
        <label className={styles.field}>
          <span className={styles.label}>{t('settingsToolName')}</span>
          <input
            className={styles.input}
            value={name}
            autoFocus
            spellCheck={false}
            autoComplete="off"
            placeholder={t('settingsToolNamePlaceholder')}
            onChange={(event) => setName(event.target.value)}
          />
          <span className={styles.hint}>{t('settingsToolNameHint')}</span>
        </label>
        <label className={styles.field}>
          <span className={styles.label}>{t('settingsToolDescription')}</span>
          <textarea
            className={clsx(styles.input, styles.textarea)}
            value={description}
            rows={3}
            placeholder={t('settingsToolDescriptionPlaceholder')}
            onChange={(event) => setDescription(event.target.value)}
          />
        </label>
        <div className={styles.row}>
          <div className={styles.methodField}>
            <span className={styles.label}>{t('settingsToolMethod')}</span>
            <Select<HttpMethod>
              ariaLabel={t('settingsToolMethod')}
              className={styles.method}
              value={method}
              options={methods.map((value) => ({ value, label: value }))}
              onChange={setMethod}
            />
          </div>
          <label className={clsx(styles.field, styles.urlField)}>
            <span className={styles.label}>{t('settingsToolUrl')}</span>
            <input
              className={styles.input}
              value={url}
              spellCheck={false}
              autoComplete="off"
              placeholder={t('settingsToolUrlPlaceholder')}
              onChange={(event) => setUrl(event.target.value)}
            />
          </label>
        </div>
        <div className={styles.hint}>{t('settingsToolUrlHint')}</div>
        <label className={styles.field}>
          <span className={styles.label}>{t('settingsToolHeaders')}</span>
          <textarea
            className={clsx(styles.input, styles.textarea, styles.code)}
            value={headers}
            rows={2}
            spellCheck={false}
            placeholder={t('settingsToolHeadersPlaceholder')}
            onChange={(event) => setHeaders(event.target.value)}
            onBlur={() => setHeaders(formatJson(headers))}
          />
          <span className={styles.hint}>{t('settingsToolHeadersHint')}</span>
        </label>
        <label className={styles.field}>
          <span className={styles.label}>{t('settingsToolSchema')}</span>
          <textarea
            className={clsx(styles.input, styles.textarea, styles.code)}
            value={inputSchema}
            rows={8}
            spellCheck={false}
            onChange={(event) => setInputSchema(event.target.value)}
            onBlur={() => setInputSchema(formatJson(inputSchema))}
          />
          <span className={styles.hint}>{t('settingsToolSchemaHint')}</span>
        </label>
      </div>
    </Modal>
  )
}
