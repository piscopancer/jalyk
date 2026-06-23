import { cn } from '@jalyk/ui'
import { FileTextIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { useStudio } from '../data/context.tsx'
import { asIcon } from '../data/react-bridge.tsx'
import { useDocumentCounts } from '../data/hooks.ts'
import { DocumentList } from './DocumentList.tsx'

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
    <div className="flex w-56 shrink-0 flex-col overflow-hidden border-r">
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
                <span className="text-xs text-muted-foreground">
                  {countByType.get(type) ?? 0}
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
