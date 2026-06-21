import { cn } from '@jalyk/ui'
import { FileTextIcon } from 'lucide-react'
import { useStudio } from '../data/context.tsx'
import { asIcon } from '../data/react-bridge.tsx'
import { useDocumentCounts } from '../data/hooks.ts'
import { DocumentList } from './DocumentList.tsx'

/** Колонка типов документов (левая). Берёт типы из конфига, рядом — счётчик документов из useDocumentCounts. Выбор типа поднимается наверх через onSelect. */
export function TypesColumn({
  selected,
  onSelect,
}: {
  selected?: string
  onSelect: (type: string) => void
}) {
  const { config } = useStudio()
  const counts = useDocumentCounts()
  const countByType = new Map(
    (counts.data ?? []).map((row) => [row.type, row.count]),
  )

  return (
    <ul className="flex w-56 shrink-0 flex-col overflow-y-auto border-r">
      {Object.entries(config.documents).map(([type, definition]) => {
        const Icon = asIcon(definition.icon)
        return (
          <li key={type}>
            <button
              className={cn(
                'flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-accent',
                selected === type && 'bg-accent font-medium',
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
