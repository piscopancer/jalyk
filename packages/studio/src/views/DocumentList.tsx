import type {
  AnyField,
  DefaultPreviewData,
  DocumentPreviewState,
} from '@jalyk/schema'
import { matchesWhere } from '@jalyk/schema'
import {
  Button,
  Input,
  Popover,
  PopoverContent,
  PopoverTrigger,
  cn,
} from '@jalyk/ui'
import { useQueries } from '@tanstack/react-query'
import { FileTextIcon, FilterIcon, PlusIcon, SearchIcon } from 'lucide-react'
import { useMemo } from 'react'
import { useStudio } from '../data/context.tsx'
import { useCreateDocument, useDocuments } from '../data/hooks.ts'
import { studioKeys } from '../data/keys.ts'
import {
  compareDocs,
  compileFilterPredicate,
  gatherFilterTypes,
  matchesSearch,
  type EvalContext,
} from '../data/list-query.ts'
import {
  emptyFilter,
  useFilterCount,
  useListState,
  type ListState,
} from '../data/list-state.ts'
import { jsonEqual } from '../data/json-equal.ts'
import { getAtPath } from '../data/path.ts'
import { PreviewStateProvider } from '../data/preview-state.tsx'
import {
  asComponent,
  asIcon,
  type PreviewProps,
} from '../data/react-bridge.tsx'
import { validateDraft } from '../data/validation.tsx'
import { DefaultPreview } from './DefaultPreview.tsx'
import { FilterBuilder } from './FilterBuilder.tsx'
import { SortMenu } from './SortMenu.tsx'

/** Ключ первого строкового поля документа — источник авто-заголовка, когда preview.title не задан. */
function firstStringFieldKey(
  fields: Record<string, AnyField>,
): string | undefined {
  for (const [key, field] of Object.entries(fields)) {
    if (field.kind === 'string') return key
  }
  return undefined
}

/** Поля поиска по умолчанию — все строковые поля документа (поиск есть на любом типе, даже без list.search в конфиге). */
function defaultSearchFields(fields: Record<string, AnyField>): string[] {
  return Object.entries(fields)
    .filter(([, field]) => field.kind === 'string')
    .map(([key]) => key)
}

/** Строковое значение поля документа по ключу, либо undefined (нет/пусто/не строка). */
function stringFieldValue(
  draft: unknown,
  key: string | undefined,
): string | undefined {
  if (!key) return undefined
  const value = getAtPath(draft, [key])
  return typeof value === 'string' && value.length > 0 ? value : undefined
}

/** Читает имя поля-источника (preview.title / preview.description) из данных превью. */
function previewFieldKey(
  preview: unknown,
  key: 'title' | 'description',
): string | undefined {
  const value = getAtPath(preview, [key])
  return typeof value === 'string' ? value : undefined
}

type PreviewDoc = {
  id: string
  type: string
  draft: unknown
  /** Опубликованная версия (null — не публиковался); нужна, чтобы понять, есть ли неопубликованный черновик. */
  published?: unknown
}

/** Один пункт списка документов. Вычисляет дефолтные иконку/заголовок/описание из схемы и значения черновика, затем рисует превью: свой previewComponent документа либо DefaultPreview. Вынесен в отдельный компонент, чтобы кастомное превью могло звать хуки (дочитывать поля и документы по ссылкам). */
export function DocumentRow({
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

  const titleValue = stringFieldValue(
    doc.draft,
    previewFieldKey(def?.preview, 'title') ?? firstStringFieldKey(fields),
  )
  const title = titleValue ?? (
    <span className="italic text-muted-foreground">{doc.id}</span>
  )
  const description = stringFieldValue(
    doc.draft,
    previewFieldKey(def?.preview, 'description'),
  )
  const Icon = asIcon(getAtPath(def?.preview, ['icon']) ?? def?.icon)
  const icon = Icon ? (
    <Icon className="size-4" />
  ) : (
    <FileTextIcon className="size-4" />
  )
  const preview: DefaultPreviewData = {
    title: previewFieldKey(def?.preview, 'title'),
    description: previewFieldKey(def?.preview, 'description'),
    icon: getAtPath(def?.preview, ['icon']),
  }
  const Preview =
    asComponent<PreviewProps<unknown, DefaultPreviewData>>(
      def?.previewComponent,
    ) ?? DefaultPreview
  const validation = validateDraft(def, doc.draft)
  const hasDraft = doc.published == null || !jsonEqual(doc.draft, doc.published)
  const state: DocumentPreviewState = {
    hasDraft,
    issues: validation.issues,
    worst: validation.worst,
    hasError: validation.hasError,
  }

  return (
    <li>
      <button
        className={cn(
          'flex w-full items-start gap-2 rounded-lg px-2 py-1.5 text-left text-sm transition-colors hover:bg-muted hover:text-foreground dark:hover:bg-muted/50',
          selected === doc.id &&
            'bg-accent font-medium hover:bg-accent dark:hover:bg-accent',
        )}
        onClick={() => onSelect(doc.id)}
      >
        <span className="min-w-0 flex-1">
          <PreviewStateProvider value={state}>
            <Preview
              document={doc}
              icon={icon}
              title={title}
              description={description}
              preview={preview}
              state={state}
            />
          </PreviewStateProvider>
        </span>
      </button>
    </li>
  )
}

/** Состояние «выключенных» элементов управления: используем пустое, не читая и не записывая localStorage (для встроенных списков с предустановленным фильтром). */
const NO_CONTROLS: ListState = {
  search: '',
  filter: emptyFilter(),
  sort: null,
}

export type DocumentListProps = {
  type: string
  selected?: string
  onSelect: (id: string) => void
  /** Показывать панель поиска/фильтра/сортировки. По умолчанию true. */
  controls?: boolean
  /** Предустановленный фильтр (склеивается с пользовательским через AND). where-объект как у matchesWhere. */
  where?: Record<string, unknown>
  /** Переопределить поля текстового поиска (иначе берётся из list.search конфига). */
  searchFields?: readonly string[]
}

/** Переиспользуемый список документов одного типа: панель управления (поиск, древо фильтров, сортировка, создание) плюс отфильтрованные/отсортированные строки. Поиск, фильтр и сортировка исполняются на клиенте поверх загруженных по типу документов (тот же движок, что у типизированного клиента запросов). */
export function DocumentList({
  type,
  selected,
  onSelect,
  controls = true,
  where,
  searchFields,
}: DocumentListProps) {
  const { projectId, config, client, run } = useStudio()
  const def = config.documents[type]
  const documents = useDocuments(type)

  const key = `${projectId}:${type}`
  // Хук зовётся всегда (правила хуков); значение игнорируем, когда панель скрыта.
  const [persisted] = useListState(key)
  const state = controls ? persisted : NO_CONTROLS

  const fields =
    searchFields ?? def?.list?.search ?? defaultSearchFields(def?.fields ?? {})

  // Типы связанных документов, на которые ссылается фильтр, — догружаем их для дереференса реляций (some/every/none по полям связанного документа).
  const relTypes = useMemo(() => {
    const acc = new Set<string>()
    gatherFilterTypes(config.documents, type, state.filter, acc)
    acc.delete(type)
    return [...acc]
  }, [config, type, state.filter])

  const relResults = useQueries({
    queries: relTypes.map((relType) => ({
      queryKey: studioKeys.documents(projectId, relType),
      queryFn: () =>
        run(
          client.documents.list({
            path: { projectId },
            urlParams: { type: relType },
          }),
        ),
    })),
  })

  // Карта загруженных документов (тип → id → черновик) для предиката реляций.
  const ctx = useMemo<EvalContext>(() => {
    const docs = new Map<string, Map<string, unknown>>()
    const put = (
      docType: string,
      list: readonly { id: string; draft: unknown }[] | undefined,
    ) => {
      const byId = new Map<string, unknown>()
      for (const doc of list ?? []) byId.set(doc.id, doc.draft)
      docs.set(docType, byId)
    }
    put(type, documents.data)
    relTypes.forEach((relType, i) => put(relType, relResults[i]?.data))
    return { docs }
  }, [type, documents.data, relTypes, relResults])

  const predicate = useMemo(
    () => compileFilterPredicate(config.documents, type, state.filter),
    [config, type, state.filter],
  )

  const rows = (documents.data ?? [])
    .filter((doc) => matchesSearch(doc.draft, fields, state.search))
    .filter((doc) => predicate(doc.draft, ctx))
    .filter((doc) =>
      where ? matchesWhere({ id: doc.id, draft: doc.draft }, where) : true,
    )
    .sort((a, b) => compareDocs(a, b, state.sort))

  return (
    <div className="flex w-72 shrink-0 flex-col overflow-hidden border-r">
      {controls ? (
        <ListToolbar
          type={type}
          searchFields={fields}
          onCreated={(id) => onSelect(id)}
        />
      ) : null}
      <ul className="flex flex-col gap-0.5 overflow-y-auto p-1">
        {documents.isLoading ? (
          <li className="px-2 py-1.5 text-xs text-muted-foreground">
            Загрузка…
          </li>
        ) : null}
        {rows.map((doc) => (
          <DocumentRow
            key={doc.id}
            doc={{
              id: doc.id,
              type,
              draft: doc.draft,
              published: doc.published,
            }}
            selected={selected}
            onSelect={onSelect}
          />
        ))}
        {documents.data && rows.length === 0 ? (
          <li className="px-2 py-1.5 text-xs text-muted-foreground">
            {documents.data.length === 0
              ? 'Документов нет'
              : 'Ничего не найдено'}
          </li>
        ) : null}
      </ul>
    </div>
  )
}

/** Панель управления списком: поиск, фильтры (поповер с древом), сортировка, «+». */
function ListToolbar({
  type,
  searchFields,
  onCreated,
}: {
  type: string
  searchFields: readonly string[]
  onCreated: (id: string) => void
}) {
  const { projectId } = useStudio()
  const create = useCreateDocument()
  const key = `${projectId}:${type}`
  const [state, setState] = useListState(key)
  const filterCount = useFilterCount(key)

  const hasSearch = searchFields.length > 0

  return (
    <div className="flex items-center gap-2 border-b p-2">
      {/* Поиск, фильтр и сортировка склеены в один сегмент: без зазора, со стыками без скруглений и границ. */}
      <div className="flex flex-1 items-center">
        {hasSearch ? (
          <div className="relative flex-1">
            <SearchIcon className="pointer-events-none absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={state.search}
              onChange={(e) =>
                setState((draft) => void (draft.search = e.target.value))
              }
              placeholder="Поиск"
              className="h-7 w-full rounded-r-none pl-7"
            />
          </div>
        ) : (
          <span className="flex-1" />
        )}

        <Popover>
          <PopoverTrigger
            render={
              <Button
                size="icon-sm"
                variant="outline"
                aria-label="Фильтры"
                className={cn(
                  'relative rounded-none border-l-0',
                  !hasSearch && 'rounded-l-lg border-l',
                )}
              />
            }
          >
            <FilterIcon />
            {filterCount > 0 ? (
              <span className="absolute -right-1 -top-1 flex size-4 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground">
                {filterCount}
              </span>
            ) : null}
          </PopoverTrigger>
          <PopoverContent
            align="start"
            className="w-[32rem] max-w-[calc(100vw-2rem)]"
          >
            <FilterBuilder type={type} stateKey={key} />
          </PopoverContent>
        </Popover>

        <SortMenu
          type={type}
          stateKey={key}
          className="rounded-l-none border-l-0"
        />
      </div>

      <Button
        size="icon-sm"
        aria-label="Новый документ"
        disabled={create.isPending}
        onClick={() =>
          create.mutate({ type }, { onSuccess: (doc) => onCreated(doc.id) })
        }
      >
        <PlusIcon />
      </Button>
    </div>
  )
}
