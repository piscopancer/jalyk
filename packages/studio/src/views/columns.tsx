import type { AnyField, DefaultPreviewData } from '@jalyk/schema'
import { Button, cn } from '@jalyk/ui'
import { FileText } from 'lucide-react'
import { useStudio } from '../data/context.tsx'
import { getAtPath } from '../data/path.ts'
import { asComponent, asIcon, type PreviewProps } from '../data/react-bridge.tsx'
import { useCreateDocument, useDocumentCounts, useDocuments } from '../data/hooks.ts'
import { DefaultPreview } from './DefaultPreview.tsx'

// Колонка типов документов (левая). Берёт типы из конфига, рядом — счётчик
// документов из useDocumentCounts. Выбор типа поднимается наверх через onSelect.
export function TypesColumn({ selected, onSelect }: { selected?: string; onSelect: (type: string) => void }) {
  const { config } = useStudio()
  const counts = useDocumentCounts()
  const countByType = new Map((counts.data ?? []).map((row) => [row.type, row.count]))

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
                {Icon ? <Icon className="size-4 text-muted-foreground" /> : <FileText className="size-4 text-muted-foreground" />}
                {definition.title ?? type}
              </span>
              <span className="text-xs text-muted-foreground">{countByType.get(type) ?? 0}</span>
            </button>
          </li>
        )
      })}
    </ul>
  )
}

// Ключ первого строкового поля документа — источник авто-заголовка, когда
// preview.title не задан.
function firstStringFieldKey(fields: Record<string, AnyField>): string | undefined {
  for (const [key, field] of Object.entries(fields)) {
    if (field.kind === 'string') return key
  }
  return undefined
}

// Строковое значение поля документа по ключу, либо undefined (нет/пусто/не строка).
function stringFieldValue(draft: unknown, key: string | undefined): string | undefined {
  if (!key) return undefined
  const value = getAtPath(draft, [key])
  return typeof value === 'string' && value.length > 0 ? value : undefined
}

type PreviewDoc = { id: string; type: string; draft: unknown }

// Читает имя поля-источника (preview.title / preview.description) из данных превью
// документа; данные приходят рантайм-стёртыми (preview?: unknown в DocumentOptions).
function previewFieldKey(preview: unknown, key: 'title' | 'description'): string | undefined {
  const value = getAtPath(preview, [key])
  return typeof value === 'string' ? value : undefined
}

// Один пункт списка документов. Вычисляет дефолтные иконку/заголовок/описание из
// схемы и значения черновика, затем рисует превью: свой previewComponent
// документа либо DefaultPreview. Вынесен в отдельный компонент, чтобы кастомное
// превью могло звать хуки (дочитывать поля и документы по ссылкам).
function DocumentRow({
  doc,
  selected,
  onSelect,
}: {
  doc: PreviewDoc
  selected?: string
  onSelect: (id: string) => void
}) {
  const { config } = useStudio()
  const def = config.documents[doc.type]
  const fields = def?.fields ?? {}

  const title = stringFieldValue(doc.draft, previewFieldKey(def?.preview, 'title') ?? firstStringFieldKey(fields)) ?? doc.id
  const description = stringFieldValue(doc.draft, previewFieldKey(def?.preview, 'description'))
  const Icon = asIcon(getAtPath(def?.preview, ['icon']) ?? def?.icon)
  const icon = Icon ? <Icon className="size-4" /> : <FileText className="size-4" />
  const preview: DefaultPreviewData = { title: previewFieldKey(def?.preview, 'title'), description: previewFieldKey(def?.preview, 'description'), icon: getAtPath(def?.preview, ['icon']) }
  const Preview = asComponent<PreviewProps<unknown, DefaultPreviewData>>(def?.previewComponent) ?? DefaultPreview

  return (
    <li>
      <button
        className={cn(
          'w-full px-3 py-2 text-left text-sm hover:bg-accent',
          selected === doc.id && 'bg-accent font-medium',
        )}
        onClick={() => onSelect(doc.id)}
      >
        <Preview document={doc} icon={icon} title={title} description={description} preview={preview} />
      </button>
    </li>
  )
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
  const documents = useDocuments(type)
  const create = useCreateDocument()

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
          <DocumentRow key={doc.id} doc={{ id: doc.id, type, draft: doc.draft }} selected={selected} onSelect={onSelect} />
        ))}
        {documents.data && documents.data.length === 0 ? (
          <li className="px-3 py-2 text-xs text-muted-foreground">Документов нет</li>
        ) : null}
      </ul>
    </div>
  )
}
