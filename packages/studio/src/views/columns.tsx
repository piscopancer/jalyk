import { Button, cn } from '@jalyk/ui'
import { useStudio } from '../data/context.tsx'
import { getAtPath } from '../data/path.ts'
import { useCreateDocument, useDocumentCounts, useDocuments } from '../data/hooks.ts'

// Колонка типов документов (левая). Берёт типы из конфига, рядом — счётчик
// документов из useDocumentCounts. Выбор типа поднимается наверх через onSelect.
export function TypesColumn({ selected, onSelect }: { selected?: string; onSelect: (type: string) => void }) {
  const { config } = useStudio()
  const counts = useDocumentCounts()
  const countByType = new Map((counts.data ?? []).map((row) => [row.type, row.count]))

  return (
    <ul className="flex w-56 shrink-0 flex-col overflow-y-auto border-r">
      {Object.entries(config.documents).map(([type, definition]) => (
        <li key={type}>
          <button
            className={cn(
              'flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-accent',
              selected === type && 'bg-accent font-medium',
            )}
            onClick={() => onSelect(type)}
          >
            <span>{definition.title ?? type}</span>
            <span className="text-xs text-muted-foreground">{countByType.get(type) ?? 0}</span>
          </button>
        </li>
      ))}
    </ul>
  )
}

// Заголовок документа в списке: значение поля из preview.title, иначе id.
function documentTitle(draft: unknown, titleField: string | undefined, fallback: string): string {
  if (titleField) {
    const value = getAtPath(draft, [titleField])
    if (typeof value === 'string' && value.length > 0) return value
  }
  return fallback
}

// Колонка документов выбранного типа (средняя) с кнопкой создания нового.
export function DocumentsColumn({
  type,
  selected,
  onSelect,
}: {
  type: string
  selected?: string
  onSelect: (id: string) => void
}) {
  const { config } = useStudio()
  const documents = useDocuments(type)
  const create = useCreateDocument()
  const titleField = config.documents[type]?.preview?.title

  return (
    <div className="flex w-72 shrink-0 flex-col overflow-hidden border-r">
      <div className="border-b p-2">
        <Button
          size="sm"
          className="w-full"
          disabled={create.isPending}
          onClick={() => create.mutate({ type }, { onSuccess: (doc) => onSelect(doc.id) })}
        >
          {create.isPending ? 'Создаём…' : 'Новый документ'}
        </Button>
      </div>
      <ul className="flex flex-col overflow-y-auto">
        {(documents.data ?? []).map((doc) => (
          <li key={doc.id}>
            <button
              className={cn(
                'w-full px-3 py-2 text-left text-sm hover:bg-accent',
                selected === doc.id && 'bg-accent font-medium',
              )}
              onClick={() => onSelect(doc.id)}
            >
              {documentTitle(doc.draft, titleField, doc.id)}
            </button>
          </li>
        ))}
        {documents.data && documents.data.length === 0 ? (
          <li className="px-3 py-2 text-xs text-muted-foreground">Документов нет</li>
        ) : null}
      </ul>
    </div>
  )
}
