import type { ReferenceValue } from '@jalyk/schema'
import {
  Button,
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  Popover,
  PopoverContent,
  PopoverTrigger,
  cn,
} from '@jalyk/ui'
import { CheckIcon, ChevronsUpDownIcon, XIcon } from 'lucide-react'
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
    const titleField = getAtPath(config.documents[type]?.preview, ['title'])
    const value = typeof titleField === 'string' ? getAtPath(draft, [titleField]) : undefined
    return typeof value === 'string' && value.length > 0 ? value : '(без названия)'
  }
}

// Грузит документы одного типа и отдаёт их пунктами Command. Отдельный компонент,
// потому что число типов в field.to может быть больше одного, а хуки нельзя звать
// в цикле переменной длины — поэтому на каждый тип свой смонтированный загрузчик.
// Фильтрацию по строке поиска делает сам Command (cmdk) по value пункта.
function TypeOptions({
  type,
  titleOf,
  selectedId,
  onPick,
}: {
  type: string
  titleOf: (type: string, draft: unknown) => string
  selectedId?: string
  onPick: (id: string, type: string) => void
}) {
  const { config } = useStudio()
  const documents = useDocuments(type)
  const docs = documents.data ?? []
  if (docs.length === 0) return null
  return (
    <CommandGroup heading={config.documents[type]?.title ?? type}>
      {docs.map((d) => {
        const title = titleOf(type, d.draft)
        return (
          <CommandItem
            key={d.id}
            // value содержит id, чтобы пункты с одинаковым заголовком были
            // различимы для cmdk; поиск по заголовку при этом сохраняется.
            value={`${title} ${d.id}`}
            onSelect={() => onPick(d.id, type)}
          >
            <CheckIcon className={cn('size-4', selectedId === d.id ? 'opacity-100' : 'opacity-0')} />
            <span className="truncate">{title}</span>
          </CommandItem>
        )
      })}
    </CommandGroup>
  )
}

// Редактор поля-ссылки. Значение — { _ref, _toType }. Триггер-кнопка показывает
// заголовок выбранного документа; по клику открывается поповер с поиском по
// документам допустимых типов (field.to). Поповер закрывается по Esc и клику вне
// (Popover/Command из @jalyk/ui). Кнопка-крест рядом очищает значение.
export function ReferenceField({ path, field }: FieldComponentProps) {
  const handle = useField<ReferenceValue>(path)
  const titleOf = useTitleOf()
  const [open, setOpen] = useState(false)
  const types = field.to ?? []

  const ref = handle.value?._ref
  const refType = handle.value?._toType

  const pick = (id: string, type: string) => {
    handle.set({ _ref: id, _toType: type })
    setOpen(false)
  }

  return (
    <div className="flex items-center gap-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" role="combobox" aria-expanded={open} className="flex-1 justify-between font-normal">
            <span className={cn('truncate', !ref && 'text-muted-foreground')}>
              {ref ? <RefTitle type={refType} id={ref} titleOf={titleOf} /> : 'Поиск документа…'}
            </span>
            <ChevronsUpDownIcon className="size-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
          <Command>
            <CommandInput placeholder="Поиск документа…" />
            <CommandList>
              <CommandEmpty>Ничего не найдено</CommandEmpty>
              {types.map((type) => (
                <TypeOptions key={type} type={type} titleOf={titleOf} selectedId={ref} onPick={pick} />
              ))}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {ref ? (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Очистить"
          className="shrink-0 text-muted-foreground"
          onClick={() => handle.set(null)}
        >
          <XIcon />
        </Button>
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
