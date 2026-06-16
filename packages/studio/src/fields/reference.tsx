import type { ReferenceValue } from '@jalyk/schema'
import { cn } from '@jalyk/ui'
import { useState } from 'react'
import { useStudio } from '../data/context.tsx'
import { useField } from '../data/field.ts'
import { useDocuments } from '../data/hooks.ts'
import { getAtPath } from '../data/path.ts'
import type { FieldComponentProps } from './registry.tsx'

// Превью-заголовок документа: значение поля из preview.title, иначе заглушка.
function useTitleOf() {
  const { config } = useStudio()
  return (type: string, draft: unknown) => {
    const titleField = config.documents[type]?.preview?.title
    const value = titleField ? getAtPath(draft, [titleField]) : undefined
    return typeof value === 'string' && value.length > 0 ? value : '(без названия)'
  }
}

// Грузит документы одного типа и отдаёт их как опции ссылки. Отдельный компонент,
// потому что число типов в field.to может быть больше одного, а хуки нельзя звать
// в цикле переменной длины — поэтому на каждый тип свой смонтированный загрузчик.
function TypeOptions({
  type,
  titleOf,
  filter,
  selectedId,
  onPick,
}: {
  type: string
  titleOf: (type: string, draft: unknown) => string
  filter: string
  selectedId?: string
  onPick: (id: string, type: string) => void
}) {
  const documents = useDocuments(type)
  const docs = (documents.data ?? []).filter((d) => {
    if (!filter) return true
    return titleOf(type, d.draft).toLowerCase().includes(filter.toLowerCase())
  })
  return (
    <>
      {docs.map((d) => (
        <button
          key={d.id}
          type="button"
          className={cn(
            'w-full px-3 py-2 text-left text-sm hover:bg-accent',
            selectedId === d.id && 'bg-accent font-medium',
          )}
          onClick={() => onPick(d.id, type)}
        >
          {titleOf(type, d.draft)}
        </button>
      ))}
    </>
  )
}

// Редактор поля-ссылки. Значение — { _ref, _type }. Список документов допустимых
// типов (field.to) с поиском по preview-заголовку; выбор пишет ссылку, очистка —
// null. Выбранный документ показываем чипом сверху.
export function ReferenceField({ path, field }: FieldComponentProps) {
  const handle = useField<ReferenceValue>(path)
  const titleOf = useTitleOf()
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const types = field.to ?? []

  const ref = handle.value?._ref
  const refType = handle.value?._type

  const pick = (id: string, type: string) => {
    handle.set({ _ref: id, _type: type } as ReferenceValue)
    setOpen(false)
    setQuery('')
  }

  if (ref) {
    return (
      <div className="flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm">
        <span className="truncate">
          <RefTitle type={refType} id={ref} titleOf={titleOf} />
        </span>
        <button
          type="button"
          className="shrink-0 text-xs text-muted-foreground hover:text-destructive"
          onClick={() => handle.set(null as unknown as ReferenceValue)}
        >
          Очистить
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-1">
      <input
        className="rounded-md border bg-transparent px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        placeholder="Поиск документа…"
        value={query}
        onFocus={() => setOpen(true)}
        onChange={(e) => {
          setQuery(e.target.value)
          setOpen(true)
        }}
      />
      {open ? (
        <div className="max-h-48 overflow-y-auto rounded-md border">
          {types.map((type) => (
            <TypeOptions key={type} type={type} titleOf={titleOf} filter={query} onPick={pick} />
          ))}
        </div>
      ) : null}
    </div>
  )
}

// Заголовок выбранного документа: ищем его среди загруженных документов типа,
// иначе показываем id. Тип ссылки известен из значения, поэтому грузим только его.
function RefTitle({
  type,
  id,
  titleOf,
}: {
  type?: string
  id: string
  titleOf: (type: string, draft: unknown) => string
}) {
  const documents = useDocuments(type ?? '')
  const doc = (documents.data ?? []).find((d) => d.id === id)
  if (!type) return <>{id}</>
  return <>{doc ? titleOf(type, doc.draft) : id}</>
}
