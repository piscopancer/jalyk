import type { Issue } from '@jalyk/schema'
import { cn } from '@jalyk/ui'
import { useDocumentPreviewState } from '../data/preview-state.tsx'
import { statusColor } from '../data/status-color.ts'

// Дефолтные индикаторы строки документа — цветные точки той же палитры, что полоска статуса поля (statusColor): синяя (неопубликованный черновик), красная (ошибки), жёлтая (предупреждения). Каждая берёт состояние из useDocumentPreviewState, но любой признак можно передать пропом; компоненты сами прячутся, когда показывать нечего, поэтому их удобно и просто рендерить, и звать через `&&` в своих превью.

/** Цветная точка-индикатор фиксированного размера; цвет — из общей палитры статусов. */
function Dot({ color, title }: { color: string; title?: string }) {
  return (
    <span
      title={title}
      style={{ background: color }}
      className="size-1 shrink-0 rounded-full"
    />
  )
}

/** Синяя точка — у документа есть неопубликованный черновик. По умолчанию признак берётся из состояния превью, можно задать пропом `active`. */
export function DefaultDraftIndicator({
  active,
  className,
}: {
  active?: boolean
  className?: string
}) {
  const state = useDocumentPreviewState()
  if (!(active ?? state.hasDraft)) return null
  return (
    <span className={cn('inline-flex', className)}>
      <Dot color={statusColor.changed} title="Есть черновик" />
    </span>
  )
}

/** Красная и жёлтая точки замечаний в ряд: красная при ошибках, жёлтая при предупреждениях, тексты — в подсказке. По умолчанию замечания берутся из состояния превью, можно передать пропом `issues`. */
export function DefaultIssueIndicators({
  issues,
  className,
}: {
  issues?: readonly Issue[]
  className?: string
}) {
  const state = useDocumentPreviewState()
  const all = issues ?? state.issues
  const errors = all.filter((issue) => issue.severity === 'error')
  const warnings = all.filter((issue) => issue.severity === 'warning')
  if (errors.length === 0 && warnings.length === 0) return null
  return (
    <span className={cn('inline-flex items-center gap-1', className)}>
      {errors.length > 0 ? (
        <Dot
          color={statusColor.error}
          title={errors.map((issue) => issue.message).join('\n')}
        />
      ) : null}
      {warnings.length > 0 ? (
        <Dot
          color={statusColor.warning}
          title={warnings.map((issue) => issue.message).join('\n')}
        />
      ) : null}
    </span>
  )
}

/** Дефолтный кластер индикаторов строки: синяя точка черновика, затем красная/жёлтая точки замечаний в ряд. Используется в DefaultPreview; можно собрать руками из DefaultDraftIndicator и DefaultIssueIndicators. */
export function DefaultPreviewIndicators({
  className,
}: {
  className?: string
}) {
  return (
    <span className={cn('inline-flex items-center gap-1', className)}>
      <DefaultDraftIndicator />
      <DefaultIssueIndicators />
    </span>
  )
}
