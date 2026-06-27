import type { DocumentPreviewState } from '@jalyk/schema'
import { worstSeverity } from '@jalyk/schema'
import { cn } from '@jalyk/ui'
import { FileTextIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { useStudio } from '../data/context.tsx'
import { jsonEqual } from '../data/json-equal.ts'
import { PreviewStateProvider } from '../data/preview-state.tsx'
import { asIcon } from '../data/react-bridge.tsx'
import { useDocumentCounts, useDocuments } from '../data/hooks.ts'
import { validateDraft } from '../data/validation.tsx'
import { DocumentList } from './DocumentList.tsx'
import { DefaultPreviewIndicators } from './PreviewIndicators.tsx'

/** Сводный статус типа: грузит все его документы и агрегирует состояние — синяя точка, если у кого-то есть черновик, красная/жёлтая по худшим замечаниям всех черновиков. Те же точки, что в превью документа. Свой компонент на тип, потому что хук-загрузчик нельзя звать в цикле переменной длины. */
function TypeStatus({ type }: { type: string }) {
  const { config } = useStudio()
  const documents = useDocuments(type)
  const def = config.documents[type]
  const docs = documents.data ?? []
  const issues = docs.flatMap((doc) => validateDraft(def, doc.draft).issues)
  const hasDraft = docs.some(
    (doc) => doc.published == null || !jsonEqual(doc.draft, doc.published),
  )
  const state: DocumentPreviewState = {
    hasDraft,
    issues,
    worst: worstSeverity(issues),
    hasError: issues.some((issue) => issue.severity === 'error'),
  }
  return (
    <PreviewStateProvider value={state}>
      <DefaultPreviewIndicators />
    </PreviewStateProvider>
  )
}

/** Колонка типов документов (левая). Берёт типы из конфига, рядом — счётчик документов из useDocumentCounts. Выбор типа поднимается наверх через onSelect. Необязательный footer прижимается к низу колонки (например, кнопка кастомного сегмента). */
export function TypesColumn({
  selected,
  onSelect,
  footer,
}: {
  selected?: string
  onSelect: (type: string) => void
  footer?: ReactNode
}) {
  const { config } = useStudio()
  const counts = useDocumentCounts()
  const countByType = new Map(
    (counts.data ?? []).map((row) => [row.type, row.count]),
  )

  return (
    <div className="flex min-h-0 w-56 flex-1 flex-col overflow-hidden">
      <ul className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto p-1">
        {Object.entries(config.documents).map(([type, definition]) => {
          const Icon = asIcon(definition.icon)
          return (
            <li key={type}>
              <button
                className={cn(
                  'flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left text-sm transition-colors hover:bg-muted hover:text-foreground dark:hover:bg-muted/50',
                  selected === type &&
                    'bg-accent font-medium hover:bg-accent dark:hover:bg-accent',
                )}
                onClick={() => onSelect(type)}
              >
                <span className="flex items-center gap-2">
                  {Icon ? (
                    <Icon className="size-4 text-muted-foreground" />
                  ) : (
                    <FileTextIcon className="size-4 text-muted-foreground" />
                  )}
                  {definition.title ?? type}
                </span>
                <span className="flex items-center gap-2">
                  <TypeStatus type={type} />
                  <span className="text-xs text-muted-foreground">
                    {countByType.get(type) ?? 0}
                  </span>
                </span>
              </button>
            </li>
          )
        })}
      </ul>
      {footer ? <div className="border-t p-1">{footer}</div> : null}
    </div>
  )
}

/** Колонка документов выбранного типа (средняя): панель поиска/фильтра/сортировки плюс список. Тонкая обёртка над переиспользуемым DocumentList с панелью. */
export function DocumentsColumn({
  type,
  selected,
  onSelect,
}: {
  type: string
  selected?: string
  onSelect: (id: string) => void
}) {
  return <DocumentList type={type} selected={selected} onSelect={onSelect} />
}
