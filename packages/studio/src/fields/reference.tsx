import type {
  DefaultPreviewData,
  DocumentPreviewState,
  ReferenceTarget,
  ReferenceValue,
} from '@jalyk/schema'
import { isDocumentImage } from '@jalyk/schema'
import {
  Button,
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Popover,
  PopoverContent,
  PopoverTrigger,
  cn,
} from '@jalyk/ui'
import {
  CheckIcon,
  ChevronDownIcon,
  ChevronsUpDownIcon,
  FileTextIcon,
  PencilIcon,
  PlusIcon,
  XIcon,
} from 'lucide-react'
import { useState } from 'react'
import { useStudio } from '../data/context.tsx'
import { useField } from '../data/field.ts'
import { useSegmentNav } from '../data/navigation.tsx'
import { useCreateDocument, useDocuments } from '../data/hooks.ts'
import { getAtPath } from '../data/path.ts'
import { jsonEqual } from '../data/json-equal.ts'
import { PreviewStateProvider } from '../data/preview-state.tsx'
import { Dynamic, DynamicIcon } from '../data/react-bridge.tsx'
import { validateDraft } from '../data/validation.tsx'
import { DefaultPreview } from '../views/DefaultPreview.tsx'
import { DocumentImageIcon } from '../views/DocumentImage.tsx'
import { DocumentEditor } from '../views/DocumentEditor.tsx'
import type { FieldComponentProps } from './registry.tsx'

/** Строковое имя поля-источника (title/description) из данных превью; данные цели или документа приходят рантайм-стёртыми, поэтому читаем через getAtPath. */
function previewKey(
  preview: unknown,
  key: 'title' | 'description',
): string | undefined {
  const value = getAtPath(preview, [key])
  return typeof value === 'string' ? value : undefined
}

/** Строковое значение поля черновика по имени поля, либо undefined (нет/пусто). */
function draftString(
  draft: unknown,
  key: string | undefined,
): string | undefined {
  if (!key) return undefined
  const value = getAtPath(draft, [key])
  return typeof value === 'string' && value.length > 0 ? value : undefined
}

/** Превью документа-цели: вычисляет иконку/заголовок/описание из данных превью цели (приоритет) и документа, затем рисует previewComponent цели либо документа, иначе DefaultPreview. Отдельный компонент, чтобы кастомное превью могло звать хуки (дочитывать поля и документы по ссылкам). */
function RefPreview({
  target,
  type,
  id,
  draft,
  hasDraft = false,
}: {
  target?: ReferenceTarget
  type: string
  id: string
  draft: unknown
  /** Есть ли у документа-цели неопубликованный черновик — синяя точка превью. В списке вариантов неизвестно (false), у выбранной ссылки вычисляется в SelectedRef. */
  hasDraft?: boolean
}) {
  const { config } = useStudio()
  const def = config.documents[type]
  const titleKey =
    previewKey(target?.preview, 'title') ?? previewKey(def?.preview, 'title')
  const descriptionKey =
    previewKey(target?.preview, 'description') ??
    previewKey(def?.preview, 'description')
  const title = draftString(draft, titleKey) ?? id
  const description = draftString(draft, descriptionKey)
  const iconValue =
    getAtPath(target?.preview, ['icon']) ??
    getAtPath(def?.preview, ['icon']) ??
    def?.icon
  const icon = isDocumentImage(iconValue) ? (
    <DocumentImageIcon spec={iconValue} document={{ id, type, draft }} />
  ) : (
    <DynamicIcon icon={iconValue} fallback={FileTextIcon} className="size-4" />
  )
  const preview: DefaultPreviewData = {
    title: titleKey,
    description: descriptionKey,
    icon:
      getAtPath(target?.preview, ['icon']) ?? getAtPath(def?.preview, ['icon']),
  }
  const validation = validateDraft(def, draft)
  const state: DocumentPreviewState = {
    hasDraft,
    issues: validation.issues,
    worst: validation.worst,
    hasError: validation.hasError,
  }
  return (
    <PreviewStateProvider value={state}>
      <Dynamic
        component={target?.previewComponent ?? def?.previewComponent}
        fallback={DefaultPreview}
        props={{
          document: { id, type, draft },
          icon,
          title,
          description,
          preview,
          state,
        }}
      />
    </PreviewStateProvider>
  )
}

/** Грузит документы одного типа-цели и отдаёт их пунктами Command. Отдельный компонент, потому что целей в field.to может быть больше одной, а хуки нельзя звать в цикле переменной длины — поэтому на каждую цель свой загрузчик. Фильтрацию по строке поиска делает сам Command (cmdk) по value пункта. */
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
  const titleKey =
    previewKey(target.preview, 'title') ?? previewKey(def?.preview, 'title')
  const docs = documents.data ?? []
  if (docs.length === 0) return null
  return (
    <CommandGroup heading={def?.title ?? type}>
      {docs.map((d) => {
        const title = draftString(d.draft, titleKey) ?? d.id
        return (
          <CommandItem
            key={d.id}
            // value содержит id, чтобы пункты с одинаковым заголовком были различимы для cmdk; поиск по заголовку при этом сохраняется.
            value={`${title} ${d.id}`}
            onSelect={() => onPick(d.id, type)}
            className="items-start gap-2"
          >
            <CheckIcon
              className={cn(
                'mt-0.5 size-4 shrink-0',
                selectedId === d.id ? 'opacity-100' : 'opacity-0',
              )}
            />
            <span className="min-w-0 flex-1">
              <RefPreview
                target={target}
                type={type}
                id={d.id}
                draft={d.draft}
              />
            </span>
          </CommandItem>
        )
      })}
    </CommandGroup>
  )
}

/** Редактор поля-ссылки. Значение — { _ref, _toType }. Триггер-кнопка показывает превью выбранного документа; по клику открывается поповер с поиском по документам допустимых типов (field.to). Поповер закрывается по Esc и клику вне (Popover/Command из @jalyk/ui). Кнопка-крест рядом очищает значение. */
export function ReferenceField({ path, field }: FieldComponentProps) {
  const { config } = useStudio()
  const handle = useField<ReferenceValue>(path)
  const nav = useSegmentNav()
  const create = useCreateDocument()
  const [open, setOpen] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const targets = field.to ?? []
  const targetByType = new Map<string, ReferenceTarget>(
    targets.map((target) => [target.to, target]),
  )

  const ref = handle.value?._ref
  const refType = handle.value?._toType
  // Сегменты доступны только внутри дерева навигации и если текущий сегмент объявляет потомка 'document'; иначе кнопки создания/редактирования не показываем.
  const openDocument = nav?.openDocument

  const pick = (id: string, type: string) => {
    handle.set({ _ref: id, _toType: type })
    setOpen(false)
  }

  const createAndOpen = (type: string) => {
    create.mutate(
      { type },
      {
        onSuccess: (doc) => {
          handle.set({ _ref: doc.id, _toType: type })
          setOpen(false)
          if (openDocument) nav?.go(openDocument(type, doc.id))
        },
      },
    )
  }

  const showForm = expanded && !!ref && !!refType
  return (
    <div className={cn('flex flex-col', !showForm && 'gap-2')}>
      <div
        className={cn(
          'flex items-stretch overflow-hidden rounded-md border',
          showForm && 'diagonal-stripes rounded-b-none',
        )}
      >
        {ref && refType ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={expanded ? 'Свернуть форму' : 'Развернуть форму'}
            aria-expanded={expanded}
            className="h-auto shrink-0 rounded-none border-r text-muted-foreground"
            onClick={() => setExpanded((v) => !v)}
          >
            <ChevronDownIcon
              className={cn('transition-transform', expanded && 'rotate-180')}
            />
          </Button>
        ) : null}
        <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          render={
            <Button
              variant="ghost"
              role="combobox"
              aria-expanded={open}
              className="h-auto min-h-9 flex-1 justify-between rounded-none py-1.5 font-normal"
            />
          }
        >
          <span
            className={cn(
              'min-w-0 flex-1 text-left',
              !ref && 'text-muted-foreground',
            )}
          >
            {ref && refType ? (
              <SelectedRef
                type={refType}
                id={ref}
                target={targetByType.get(refType)}
              />
            ) : (
              'Поиск документа…'
            )}
          </span>
          <ChevronsUpDownIcon className="size-4 shrink-0 opacity-50" />
        </PopoverTrigger>
        <PopoverContent
          className="min-w-(--anchor-width) max-w-[28rem] p-0"
          align="start"
        >
          <Command>
            <div className="flex items-center gap-1 p-1 pb-0 [&>[data-slot=command-input-wrapper]]:flex-1 [&>[data-slot=command-input-wrapper]]:p-0">
              <CommandInput placeholder="Поиск документа…" />
              {openDocument && targets.length > 0 ? (
                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={
                      <Button
                        type="button"
                        size="icon"
                        aria-label="Новый документ"
                        disabled={create.isPending}
                        className="size-8 shrink-0"
                      />
                    }
                  >
                    <PlusIcon />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {targets.map((target) => {
                      const def = config.documents[target.to]
                      return (
                        <DropdownMenuItem
                          key={target.to}
                          disabled={create.isPending}
                          onClick={() => createAndOpen(target.to)}
                        >
                          <DynamicIcon icon={def?.icon} fallback={FileTextIcon} />
                          {def?.title ?? target.to}
                        </DropdownMenuItem>
                      )
                    })}
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : null}
            </div>
            <CommandList>
              <CommandEmpty>Ничего не найдено</CommandEmpty>
              {targets.map((target) => (
                <TypeOptions
                  key={target.to}
                  target={target}
                  selectedId={ref}
                  onPick={pick}
                />
              ))}
            </CommandList>
          </Command>
        </PopoverContent>
        </Popover>
        {ref && refType && openDocument ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Открыть в сегменте"
            className="h-auto shrink-0 rounded-none border-l text-muted-foreground"
            onClick={() => nav?.go(openDocument(refType, ref))}
          >
            <PencilIcon />
          </Button>
        ) : null}
        {ref ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Очистить"
            className="h-auto shrink-0 rounded-none border-l text-muted-foreground"
            onClick={() => handle.set(null)}
          >
            <XIcon />
          </Button>
        ) : null}
      </div>
      {showForm ? (
        <div className="overflow-hidden rounded-b-lg border border-t-0">
          <DocumentEditor
            id={ref}
            type={refType}
            variant="inline"
            onDeleted={() => {
              handle.set(null)
              setExpanded(false)
            }}
          />
        </div>
      ) : null}
    </div>
  )
}

/** Превью выбранного документа: грузит документы его типа, находит черновик и рисует через RefPreview. Тип известен из значения ссылки — грузим только его. */
function SelectedRef({
  type,
  id,
  target,
}: {
  type: string
  id: string
  target?: ReferenceTarget
}) {
  const documents = useDocuments(type)
  const doc = (documents.data ?? []).find((d) => d.id === id)
  // Тот же признак черновика, что в списке документов: цель ещё не публиковали или её draft расходится с published.
  const hasDraft = !!doc && (doc.published == null || !jsonEqual(doc.draft, doc.published))
  return (
    <RefPreview
      target={target}
      type={type}
      id={id}
      draft={doc?.draft}
      hasDraft={hasDraft}
    />
  )
}
