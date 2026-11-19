import { useState } from 'react'
import { useTranslate } from '../../i18n/index.js'
import {
  removeCustomTool,
  setCustomToolEnabled,
  useCustomTools,
  type CustomTool,
} from '../../services/customTools.js'
import { IconAddOutline16, IconEditOutline16, IconTrashOutline16 } from '../base/icons.js'
import { Button } from '../base/Button.js'
import { IconButton } from '../base/IconButton.js'
import { Modal } from '../base/Modal.js'
import { Switch } from '../base/Switch.js'
import { showToast } from '../base/toastState.js'
import { CustomToolDialog } from './CustomToolDialog.js'
import styles from './CustomToolsSection.module.css'

/**
 * 工具配置里的「自定义工具」：列出已保存的 HTTP 工具，支持启用、编辑、删除与新增。
 * 这里只管理配置；模型怎么调用、结果怎么回传由 chat 层的工具回路处理。
 */
export const CustomToolsSection = () => {
  const t = useTranslate()
  const tools = useCustomTools((state) => state.tools)
  // undefined 关闭，null 新增，CustomTool 编辑
  const [editing, setEditing] = useState<CustomTool | null | undefined>(undefined)
  const [deleting, setDeleting] = useState<CustomTool | null>(null)

  return (
    <>
      <div className={styles.header}>
        <div className={styles.headerText}>
          <div className={styles.title}>{t('settingsCustomTools')}</div>
          <div className={styles.description}>{t('settingsCustomToolsDescription')}</div>
        </div>
        <Button
          variant="outlined"
          size="m"
          className={styles.addButton}
          onClick={() => setEditing(null)}
        >
          <IconAddOutline16 />
          {t('settingsAddTool')}
        </Button>
      </div>
      {tools.length === 0 ? (
        <div className={styles.empty}>{t('settingsCustomToolsEmpty')}</div>
      ) : (
        <div className={styles.list}>
          {tools.map((tool) => (
            <div key={tool.id} className={styles.item}>
              <div className={styles.enable}>
                <Switch
                  checked={tool.enabled}
                  label={tool.name}
                  onChange={(enabled) => setCustomToolEnabled(tool.id, enabled)}
                />
              </div>
              <div className={styles.info}>
                <div className={styles.name}>{tool.name}</div>
                <div className={styles.descriptionLine}>{tool.description}</div>
                <div className={styles.endpoint} title={`${tool.method} ${tool.url}`}>
                  {tool.method} {tool.url}
                </div>
              </div>
              <div className={styles.actions}>
                <IconButton
                  size="m"
                  icon={<IconEditOutline16 />}
                  tooltip={t('settingsToolEdit')}
                  onClick={() => setEditing(tool)}
                />
                <IconButton
                  size="m"
                  icon={<IconTrashOutline16 />}
                  tooltip={t('settingsToolDelete')}
                  onClick={() => setDeleting(tool)}
                />
              </div>
            </div>
          ))}
        </div>
      )}
      {editing !== undefined ? (
        <CustomToolDialog tool={editing} onClose={() => setEditing(undefined)} />
      ) : null}
      {deleting ? (
        <DeleteToolConfirm
          tool={deleting}
          onCancel={() => setDeleting(null)}
          onConfirm={() => {
            removeCustomTool(deleting.id)
            setDeleting(null)
            showToast({ key: 'settingsToolDeleted' })
          }}
        />
      ) : null}
    </>
  )
}

const DeleteToolConfirm = ({
  tool,
  onCancel,
  onConfirm,
}: {
  tool: CustomTool
  onCancel: () => void
  onConfirm: () => void
}) => {
  const t = useTranslate()
  return (
    <Modal
      title={t('settingsToolDeleteTitle')}
      className={styles.confirm}
      onClose={onCancel}
      footer={
        <div className={styles.confirmActions}>
          <Button variant="outlined" autoFocus onClick={onCancel}>
            {t('cancel')}
          </Button>
          <Button variant="danger" onClick={onConfirm}>
            {t('delete')}
          </Button>
        </div>
      }
    >
      {t('settingsToolDeleteDescription', { name: tool.name })}
    </Modal>
  )
}
