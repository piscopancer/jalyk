import type { DefaultPreviewData, ReferenceTarget, ReferenceValue } from '@jalyk/schema'
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
import { CheckIcon, ChevronsUpDownIcon, FileTextIcon, XIcon } from 'lucide-react'
import { useState } from 'react'
import { useStudio } from '../data/context.tsx'
import { useField } from '../data/field.ts'
import { useDocuments } from '../data/hooks.ts'
import { getAtPath } from '../data/path.ts'
import { asComponent, asIcon, type PreviewProps } from '../data/react-bridge.tsx'
import { DefaultPreview } from '../views/DefaultPreview.tsx'
import type { FieldComponentProps } from './registry.tsx'

// Строковое имя поля-источника (title/description) из данных превью; данные цели
// или документа приходят рантайм-стёртыми, поэтому читаем через getAtPath.
function previewKey(preview: unknown, key: 'title' | 'description'): string | undefined {
  const value = getAtPath(preview, [key])
  return typeof value === 'string' ? value : undefined
}

// Строковое значение поля черновика по имени поля, либо undefined (нет/пусто).
function draftString(draft: unknown, key: string | undefined): string | undefined {
  if (!key) return undefined
  const value = getAtPath(draft, [key])
  return typeof value === 'string' && value.length > 0 ? value : undefined
}

// Превью документа-цели: вычисляет иконку/заголовок/описание из данных превью
// цели (приоритет) и документа, затем рисует previewComponent цели либо документа,
// иначе DefaultPreview. Отдельный компонент, чтобы кастомное превью могло звать
// хуки (дочитывать поля и документы по ссылкам).
function RefPreview({ target, type, id, draft }: { target?: ReferenceTarget; type: string; id: string; draft: unknown }) {
  const { config } = useStudio()
  const def = config.documents[type]
  const titleKey = previewKey(target?.preview, 'title') ?? previewKey(def?.preview, 'title')
  const descriptionKey = previewKey(target?.preview, 'description') ?? previewKey(def?.preview, 'description')
  const title = draftString(draft, titleKey) ?? id
  const description = draftString(draft, descriptionKey)
  const Icon = asIcon(getAtPath(target?.preview, ['icon']) ?? getAtPath(def?.preview, ['icon']) ?? def?.icon)
  const icon = Icon ? <Icon className="size-4" /> : <FileTextIcon className="size-4" />
  const preview: DefaultPreviewData = { title: titleKey, description: descriptionKey, icon: getAtPath(target?.preview, ['icon']) ?? getAtPath(def?.preview, ['icon']) }
  const Preview = asComponent<PreviewProps<unknown, DefaultPreviewData>>(target?.previewComponent ?? def?.previewComponent) ?? DefaultPreview
  return <Preview document={{ id, type, draft }} icon={icon} title={title} description={description} preview={preview} />
}

// Грузит документы одного типа-цели и отдаёт их пунктами Command. Отдельный
// компонент, потому что целей в field.to может быть больше одной, а хуки нельзя
// звать в цикле переменной длины — поэтому на каждую цель свой загрузчик.
// Фильтрацию по строке поиска делает сам Command (cmdk) по value пункта.
function TypeOptions({
  target,
  selectedId,
  onPick,
}: {
  target: ReferenceTarget
  selectedId?: string
  onPick: (id: string, type: string) => void
}) {
  const { config } = useStudio()
  const type = target.to
  const documents = useDocuments(type)
  const def = config.documents[type]
  const titleKey = previewKey(target.preview, 'title') ?? previewKey(def?.preview, 'title')
  const docs = documents.data ?? []
  if (docs.length === 0) return null
  return (
    <CommandGroup heading={def?.title ?? type}>
      {docs.map((d) => {
        const title = draftString(d.draft, titleKey) ?? d.id
        return (
          <CommandItem
            key={d.id}
            // value содержит id, чтобы пункты с одинаковым заголовком были
            // различимы для cmdk; поиск по заголовку при этом сохраняется.
            value={`${title} ${d.id}`}
            onSelect={() => onPick(d.id, type)}
            className="items-start gap-2"
          >
            <CheckIcon className={cn('mt-0.5 size-4 shrink-0', selectedId === d.id ? 'opacity-100' : 'opacity-0')} />
            <span className="min-w-0 flex-1">
              <RefPreview target={target} type={type} id={d.id} draft={d.draft} />
            </span>
          </CommandItem>
        )
      })}
    </CommandGroup>
  )
}

// Редактор поля-ссылки. Значение — { _ref, _toType }. Триггер-кнопка показывает
// превью выбранного документа; по клику открывается поповер с поиском по
// документам допустимых типов (field.to). Поповер закрывается по Esc и клику вне
// (Popover/Command из @jalyk/ui). Кнопка-крест рядом очищает значение.
export function ReferenceField({ path, field }: FieldComponentProps) {
  const handle = useField<ReferenceValue>(path)
  const [open, setOpen] = useState(false)
  const targets = field.to ?? []
  const targetByType = new Map<string, ReferenceTarget>(targets.map((target) => [target.to, target]))

  const ref = handle.value?._ref
  const refType = handle.value?._toType

  const pick = (id: string, type: string) => {
    handle.set({ _ref: id, _toType: type })
    setOpen(false)
  }

  return (
    <div className="flex items-center gap-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger render={<Button variant="outline" role="combobox" aria-expanded={open} className="h-auto min-h-9 flex-1 justify-between py-1.5 font-normal" />}>
          <span className={cn('min-w-0 flex-1 text-left', !ref && 'text-muted-foreground')}>
            {ref && refType ? <SelectedRef type={refType} id={ref} target={targetByType.get(refType)} /> : 'Поиск документа…'}
          </span>
          <ChevronsUpDownIcon className="size-4 shrink-0 opacity-50" />
        </PopoverTrigger>
        <PopoverContent className="w-(--anchor-width) p-0" align="start">
          <Command>
            <CommandInput placeholder="Поиск документа…" />
            <CommandList>
              <CommandEmpty>Ничего не найдено</CommandEmpty>
              {targets.map((target) => (
                <TypeOptions key={target.to} target={target} selectedId={ref} onPick={pick} />
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

// Превью выбранного документа: грузит документы его типа, находит черновик и
// рисует через RefPreview. Тип известен из значения ссылки — грузим только его.
function SelectedRef({ type, id, target }: { type: string; id: string; target?: ReferenceTarget }) {
  const documents = useDocuments(type)
  const doc = (documents.data ?? []).find((d) => d.id === id)
  return <RefPreview target={target} type={type} id={id} draft={doc?.draft} />
}
