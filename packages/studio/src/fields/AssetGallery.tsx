import { AssetInfo } from '@jalyk/contract'
import type { AssetFilter } from '@jalyk/schema'
import {
  Button,
  cn,
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuItemRow,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
  Input,
  Popover,
  PopoverContent,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from '@jalyk/ui'
import {
  ArrowDownUpIcon,
  DownloadIcon,
  EyeIcon,
  EyeOffIcon,
  FileIcon,
  FunnelIcon,
  LayersIcon,
  LayoutGridIcon,
  Link2Icon,
  ListIcon,
  MaximizeIcon,
  MoreHorizontalIcon,
  SearchIcon,
  Trash2Icon,
  UploadIcon,
  XIcon,
  type LucideIcon,
} from 'lucide-react'
import { formatDistanceToNowStrict } from 'date-fns'
import { ru } from 'date-fns/locale'
import { useRef, useState } from 'react'
import {
  ASSET_CATEGORIES,
  ASSET_SORTS,
  categoryOfType,
  formatBytes,
  formatLabel,
  isImageType,
  matchesFilter,
  type AssetCategoryId,
  type AssetSortId,
} from '../data/asset-filter.ts'
import { useStudio } from '../data/context.tsx'
import { useStudioAssetView } from '../data/prefs.tsx'
import {
  useAssetUsage,
  useAssets,
  useDeleteAsset,
  useUploadAsset,
} from '../data/hooks.ts'

type Asset = typeof AssetInfo.Type

/** Выбранная категория в колонке слева: одна из ASSET_CATEGORIES или «все». */
type SelectedCategory = AssetCategoryId | 'all'

/** Стоп-всплытие для кнопок поверх кликабельного ассета (выбор не должен срабатывать). */
function stop(handler: () => void) {
  return (e: { stopPropagation: () => void }) => {
    e.stopPropagation()
    handler()
  }
}

/** Заглушка-чип счётчика использований: число (пока всегда 0, приглушённое) и поповер. */
function UsageChip() {
  const usageCount = 0
  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button
            type="button"
            size="icon-sm"
            variant="ghost"
            className={cn(
              'w-auto gap-1 px-1.5',
              usageCount === 0 && 'text-muted-foreground/50',
            )}
            title="Где используется"
            onClick={(e) => e.stopPropagation()}
          />
        }
      >
        <Link2Icon className="size-3.5" />
        <span className="text-xs">{usageCount}</span>
      </PopoverTrigger>
      <PopoverContent className="w-64">
        <PopoverHeader>
          <PopoverTitle>Использования</PopoverTitle>
          <p className="text-sm text-muted-foreground">
            Список мест, где используется этот ассет, появится позже.
          </p>
        </PopoverHeader>
      </PopoverContent>
    </Popover>
  )
}

/** Превью ассета — полиморфно по типу: картинка показывается миниатюрой с кнопкой увеличения (часть превью), прочие типы — иконкой файла. Один и тот же компонент в обоих лейаутах, размер задаётся через className. */
function AssetPreview({
  asset,
  className,
  onMaximize,
}: {
  asset: Asset
  className?: string
  onMaximize?: () => void
}) {
  const { assetUrl } = useStudio()
  const image = isImageType(asset.contentType)
  return (
    <div
      className={cn(
        'relative shrink-0 overflow-hidden rounded bg-muted',
        className,
      )}
    >
      {image ? (
        <img
          src={assetUrl(asset.id)}
          alt={asset.filename}
          className="size-full object-cover"
        />
      ) : (
        <div className="flex size-full items-center justify-center text-muted-foreground">
          <FileIcon className="size-[45%]" />
        </div>
      )}
      {image && onMaximize ? (
        <button
          type="button"
          title="Посмотреть целиком"
          onClick={stop(onMaximize)}
          className="absolute right-1 bottom-1 flex items-center justify-center rounded-md bg-black/40 p-1 text-white opacity-0 transition-opacity group-hover:opacity-100 hover:bg-black/60"
        >
          <MaximizeIcon className="size-4" />
        </button>
      ) : null}
    </div>
  )
}

/** Меню действий ассета: скачать и удалить (удаление зовёт onDelete для подтверждения). */
function AssetActionsMenu({
  asset,
  onDelete,
}: {
  asset: Asset
  onDelete: () => void
}) {
  const { assetUrl } = useStudio()
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            type="button"
            size="icon-sm"
            variant="ghost"
            aria-label="Действия с файлом"
            onClick={(e) => e.stopPropagation()}
          />
        }
      >
        <MoreHorizontalIcon />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-44">
        <DropdownMenuItem
          nativeButton={false}
          render={<a href={assetUrl(asset.id)} download={asset.filename} />}
        >
          <DropdownMenuItemRow icon={<DownloadIcon />}>
            Скачать
          </DropdownMenuItemRow>
        </DropdownMenuItem>
        <DropdownMenuItem variant="destructive" onClick={onDelete}>
          <DropdownMenuItemRow icon={<Trash2Icon />}>
            Удалить
          </DropdownMenuItemRow>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/** Галерея ассетов проекта внутри диалога. Работает в двух режимах: менеджер (без onSelect — просмотр/загрузка/удаление) и выбор (с onSelect — пишет assetId в поле). Фильтр `filter` (массив глобов MIME, см. AssetFilter) — единственная ось ограничения: неподходящие ассеты прячутся, а колонка категорий слева со счётчиками выводится из того же набора; пустые категории гаснут, включённые идут первыми. Сверху — панель: вид (сетка/список, в localStorage), сортировка (по дате/весу) и фильтр по форматам внутри категории (поповер с глазиками). Картинки показываются превью с увеличением, прочие типы — иконкой файла. Загрузка нескольких файлов — кнопкой под категориями, со счётчиком N из M. Счётчик использований (цепь) — пока заглушка. Удаление полное (запись + байты) с подтверждением. */
export function AssetGallery({
  currentAssetId,
  onSelect,
  filter,
}: {
  currentAssetId?: string
  onSelect?: (assetId: string) => void
  filter?: AssetFilter
}) {
  const { assetUrl } = useStudio()
  const assets = useAssets()
  const usage = useAssetUsage()
  const upload = useUploadAsset()
  const remove = useDeleteAsset()
  const inputRef = useRef<HTMLInputElement>(null)
  const [view, setView] = useStudioAssetView()
  const [selected, setSelected] = useState<SelectedCategory>('all')
  const [sort, setSort] = useState<AssetSortId>('date-desc')
  const [search, setSearch] = useState('')
  const [hiddenFormats, setHiddenFormats] = useState<Set<string>>(new Set())
  const [viewing, setViewing] = useState<Asset | null>(null)
  const [confirming, setConfirming] = useState<Asset | null>(null)
  const [progress, setProgress] = useState<{
    done: number
    total: number
  } | null>(null)

  // Подходящие под фильтр ассеты — то, что вообще видно в этой галерее. В режиме
  // выбора фильтр прячет лишнее; в режиме менеджера фильтра нет и видны все.
  const visible = (assets.data ?? []).filter((asset) =>
    matchesFilter(asset.contentType, filter),
  )

  // Счётчики категорий из видимого набора. «Все» — всего видимых; категория
  // включена, если в ней есть хотя бы один ассет.
  const countByCategory = new Map<AssetCategoryId, number>()
  for (const asset of visible) {
    const id = categoryOfType(asset.contentType)
    countByCategory.set(id, (countByCategory.get(id) ?? 0) + 1)
  }

  // Колонка слева: «Все» плюс категории. Включённые (count > 0) идут первыми,
  // пустые гаснут и уезжают вниз. Порядок внутри групп — как в ASSET_CATEGORIES.
  const categoryItems = ASSET_CATEGORIES.map((category) => ({
    id: category.id as SelectedCategory,
    label: category.label,
    icon: category.icon as LucideIcon,
    count: countByCategory.get(category.id) ?? 0,
  })).sort((a, b) => Number(b.count > 0) - Number(a.count > 0))
  const columns: {
    id: SelectedCategory
    label: string
    icon: LucideIcon
    count: number
    enabled: boolean
  }[] = [
    {
      id: 'all',
      label: 'Все',
      icon: LayersIcon,
      count: visible.length,
      enabled: true,
    },
    ...categoryItems.map((item) => ({ ...item, enabled: item.count > 0 })),
  ]

  // Видимое в выбранной категории (до фильтра по форматам). Если выбранная
  // категория опустела (например, после удаления) — показываем всё.
  const activeCategory = columns.find((c) => c.id === selected)?.enabled
    ? selected
    : 'all'
  const inCategory = visible.filter(
    (asset) =>
      activeCategory === 'all' ||
      categoryOfType(asset.contentType) === activeCategory,
  )

  // Форматы, встреченные в текущей категории (для поповера-фильтра), и итоговый
  // список: без скрытых форматов и отсортированный выбранным способом.
  const formats = [...new Set(inCategory.map((a) => a.contentType))].sort()
  const sortCompare =
    ASSET_SORTS.find((s) => s.id === sort)?.compare ?? ASSET_SORTS[0].compare
  const searchQuery = search.trim().toLowerCase()
  const shown = inCategory
    .filter((asset) => !hiddenFormats.has(asset.contentType))
    .filter(
      (asset) =>
        searchQuery === '' ||
        asset.filename.toLowerCase().includes(searchQuery),
    )
    .sort(sortCompare)

  const toggleFormat = (type: string) =>
    setHiddenFormats((prev) => {
      const next = new Set(prev)
      if (next.has(type)) next.delete(type)
      else next.add(type)
      return next
    })

  const uploadFiles = async (files: FileList) => {
    const list = Array.from(files).filter(
      (file) => !filter || matchesFilter(file.type, filter),
    )
    if (list.length === 0) return
    setProgress({ done: 0, total: list.length })
    for (const file of list) {
      try {
        await upload.mutateAsync(file)
      } catch {
        // Ошибку конкретного файла глотаем, чтобы не оборвать остальную пачку.
      }
      setProgress((p) => (p ? { ...p, done: p.done + 1 } : p))
    }
    setProgress(null)
  }

  // accept для системного диалога выбора файлов: из фильтра поля, иначе любые.
  const accept = filter ? filter.join(',') : undefined

  return (
    <div className="flex min-h-0 min-w-0 gap-4">
      <input
        ref={inputRef}
        type="file"
        multiple
        accept={accept}
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.length) void uploadFiles(e.target.files)
          e.target.value = ''
        }}
      />

      {/* Левая колонка: категории, снизу загрузка с прогрессом. */}
      <div className="flex w-44 shrink-0 flex-col gap-3">
        <ul className="flex flex-col gap-0.5">
          {columns.map((column) => {
            const Icon = column.icon
            return (
              <li key={column.id}>
                <button
                  type="button"
                  disabled={!column.enabled}
                  onClick={() => setSelected(column.id)}
                  className={cn(
                    'flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-sm',
                    column.enabled
                      ? 'hover:bg-accent'
                      : 'cursor-default text-muted-foreground/40',
                    activeCategory === column.id &&
                      column.enabled &&
                      'bg-accent font-medium',
                  )}
                >
                  <Icon
                    className={cn(
                      'size-4 shrink-0',
                      column.enabled &&
                        activeCategory !== column.id &&
                        'text-muted-foreground',
                    )}
                  />
                  <span className="truncate">{column.label}</span>
                  <span
                    className={cn(
                      'ml-auto text-xs',
                      column.enabled && 'text-muted-foreground',
                    )}
                  >
                    {column.count}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>

        <div className="mt-auto flex flex-col gap-3">
          {/* Использование хранилища: прогресс-бар с подписью и «занято / лимит». */}
          {usage.data ? (
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between gap-2 text-xs">
                <span className="font-medium">Хранилище</span>
                <span className="text-muted-foreground">
                  {formatBytes(usage.data.used)} /{' '}
                  {formatBytes(usage.data.quota)}
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{
                    width: `${Math.min(
                      (usage.data.used / usage.data.quota) * 100,
                      100,
                    )}%`,
                  }}
                />
              </div>
            </div>
          ) : null}

          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={progress !== null}
            onClick={() => inputRef.current?.click()}
          >
            <UploadIcon />
            Загрузить файлы
          </Button>
          {progress ? (
            <div className="flex flex-col gap-1">
              <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{
                    width: `${(progress.done / progress.total) * 100}%`,
                  }}
                />
              </div>
              <span className="text-xs text-muted-foreground">
                Загружается {Math.min(progress.done + 1, progress.total)} из{' '}
                {progress.total}
              </span>
            </div>
          ) : null}
        </div>
      </div>

      {/* Правая часть: панель управления и результаты. */}
      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <div className="flex items-center gap-2">
          {/* Переключатель вида сетка/список (персист в localStorage). */}
          <div className="flex h-8 items-center gap-0.5 rounded-md border p-0.5">
            <Button
              type="button"
              size="icon-sm"
              variant={view === 'grid' ? 'secondary' : 'ghost'}
              title="Сетка"
              onClick={() => setView('grid')}
            >
              <LayoutGridIcon />
            </Button>
            <Button
              type="button"
              size="icon-sm"
              variant={view === 'list' ? 'secondary' : 'ghost'}
              title="Список"
              onClick={() => setView('list')}
            >
              <ListIcon />
            </Button>
          </div>

          {/* Сортировка. */}
          <DropdownMenu>
            <DropdownMenuTrigger
              render={<Button type="button" variant="outline" />}
            >
              <ArrowDownUpIcon />
              {ASSET_SORTS.find((s) => s.id === sort)?.label}
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="min-w-44">
              <DropdownMenuRadioGroup
                value={sort}
                onValueChange={(value) => setSort(value as AssetSortId)}
              >
                {ASSET_SORTS.map((option) => (
                  <DropdownMenuRadioItem
                    key={option.id}
                    value={option.id}
                    closeOnClick
                  >
                    {option.label}
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Клиентский поиск по имени файла: лупа слева, крестик-сброс справа. */}
          <div className="relative ml-auto min-w-0 flex-1">
            <SearchIcon className="pointer-events-none absolute top-1/2 left-2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Поиск..."
              className="h-8 pl-8 pr-8"
            />
            {search ? (
              <Button
                type="button"
                size="icon-sm"
                variant="ghost"
                title="Очистить"
                className="absolute inset-y-0 right-1 my-auto"
                onClick={() => setSearch('')}
              >
                <XIcon />
              </Button>
            ) : null}
          </div>

          {/* Фильтр по форматам внутри категории. */}
          <Popover>
            <PopoverTrigger
              render={
                <Button
                  type="button"
                  size="icon"
                  variant={hiddenFormats.size > 0 ? 'secondary' : 'outline'}
                  title="Фильтр форматов"
                  disabled={formats.length === 0}
                />
              }
            >
              <FunnelIcon />
            </PopoverTrigger>
            <PopoverContent align="end" className="w-56 gap-1">
              <div className="flex items-center justify-between gap-2 pl-2">
                <PopoverTitle>Форматы</PopoverTitle>
                <div className="flex items-center gap-0.5">
                  <Button
                    type="button"
                    size="icon-sm"
                    variant="ghost"
                    title="Показать все"
                    disabled={formats.every((type) => !hiddenFormats.has(type))}
                    onClick={() => setHiddenFormats(new Set())}
                  >
                    <EyeIcon />
                  </Button>
                  <Button
                    type="button"
                    size="icon-sm"
                    variant="ghost"
                    title="Скрыть все"
                    disabled={formats.every((type) => hiddenFormats.has(type))}
                    onClick={() => setHiddenFormats(new Set(formats))}
                  >
                    <EyeOffIcon />
                  </Button>
                </div>
              </div>
              <div className="border-t my-1" />
              <ul className="flex flex-col gap-0.5">
                {formats.map((type) => {
                  const hidden = hiddenFormats.has(type)
                  return (
                    <li
                      key={type}
                      className={cn(
                        'flex items-center justify-between gap-2 rounded-md pl-2 hover:bg-accent',
                        hidden && 'text-muted-foreground/50',
                      )}
                    >
                      <button
                        type="button"
                        onClick={() => toggleFormat(type)}
                        className="min-w-0 flex-1 truncate py-1 text-left text-sm"
                      >
                        {formatLabel(type)}
                      </button>
                      <Button
                        type="button"
                        size="icon-sm"
                        variant="ghost"
                        title={hidden ? 'Показать' : 'Скрыть'}
                        onClick={() => toggleFormat(type)}
                      >
                        {hidden ? <EyeOffIcon /> : <EyeIcon />}
                      </Button>
                    </li>
                  )
                })}
              </ul>
            </PopoverContent>
          </Popover>
        </div>

        {/* Фиксированная по высоте область результатов: смена категории не меняет
            высоту диалога, меню не прыгает. */}
        <div className="thin-scrollbar h-[60vh] overflow-auto">
          {assets.isPending ? (
            <p className="flex h-full items-center justify-center text-sm text-muted-foreground">
              Загрузка…
            </p>
          ) : assets.isError ? (
            <p className="flex h-full items-center justify-center text-sm text-destructive">
              Не удалось загрузить список файлов
            </p>
          ) : shown.length === 0 ? (
            <p className="flex h-full items-center justify-center text-sm text-muted-foreground">
              Здесь пока нет файлов
            </p>
          ) : view === 'grid' ? (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
              {shown.map((asset) => (
                <div
                  key={asset.id}
                  className={cn(
                    'group flex flex-col gap-2 rounded-md border p-2',
                    asset.id === currentAssetId &&
                      'border-foreground/40 bg-accent/50',
                  )}
                >
                  {/* Превью — общий полиморфный компонент; квадрат кликом выбирает. */}
                  <div
                    className={cn(
                      'aspect-square',
                      onSelect && 'cursor-pointer',
                    )}
                    onClick={onSelect ? () => onSelect(asset.id) : undefined}
                  >
                    <AssetPreview
                      asset={asset}
                      className="size-full"
                      onMaximize={() => setViewing(asset)}
                    />
                  </div>

                  {/* Имя файла, вес и время загрузки. */}
                  <div className="flex flex-col gap-0.5">
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className="truncate text-xs font-medium"
                        title={asset.filename}
                      >
                        {asset.filename}
                      </span>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {formatBytes(asset.size)}
                      </span>
                    </div>
                    <span className="text-[0.7rem] text-muted-foreground">
                      {formatDistanceToNowStrict(new Date(asset.createdAt), {
                        addSuffix: true,
                        locale: ru,
                      })}
                    </span>
                  </div>

                  {/* Подвал: счётчик использований и меню действий, отделён бордером. */}
                  <div className="flex items-center justify-between gap-2 border-t pt-2">
                    <UsageChip />
                    <AssetActionsMenu
                      asset={asset}
                      onDelete={() => setConfirming(asset)}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            // Таблица на subgrid: общие колонки, заголовки сверху, строки —
            // подтаблицы (grid-cols-subgrid). Название и формат обрезаны по длине.
            <div className="grid min-w-max grid-cols-[2.75rem_fit-content(11rem)_fit-content(5rem)_max-content_max-content_max-content_2rem] gap-x-3 gap-y-1.5">
              <div className="col-span-full grid grid-cols-subgrid items-center border-b px-2 pb-1.5 text-xs font-medium text-muted-foreground">
                <span />
                <span>Название</span>
                <span>Формат</span>
                <span>Вес</span>
                <span>Загружен</span>
                <span>Исп.</span>
                <span />
              </div>
              {shown.map((asset) => (
                <div
                  key={asset.id}
                  className={cn(
                    'group col-span-full grid grid-cols-subgrid items-center rounded-md border px-2 py-1.5',
                    onSelect && 'cursor-pointer',
                    asset.id === currentAssetId &&
                      'border-foreground/40 bg-accent/50',
                  )}
                  onClick={onSelect ? () => onSelect(asset.id) : undefined}
                >
                  <AssetPreview
                    asset={asset}
                    className="size-9"
                    onMaximize={() => setViewing(asset)}
                  />
                  <span
                    className="truncate text-sm font-medium"
                    title={asset.filename}
                  >
                    {asset.filename}
                  </span>
                  <span
                    className="truncate text-xs text-muted-foreground"
                    title={asset.contentType}
                  >
                    {formatLabel(asset.contentType)}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {formatBytes(asset.size)}
                  </span>
                  <span
                    className="truncate text-xs text-muted-foreground"
                    title={new Date(asset.createdAt).toLocaleString('ru')}
                  >
                    {formatDistanceToNowStrict(new Date(asset.createdAt), {
                      addSuffix: true,
                      locale: ru,
                    })}
                  </span>
                  <UsageChip />
                  <AssetActionsMenu
                    asset={asset}
                    onDelete={() => setConfirming(asset)}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Просмотр картинки целиком. Закрытие — встроенный крест DialogContent (X). */}
      <Dialog
        open={viewing !== null}
        onOpenChange={(open) => !open && setViewing(null)}
      >
        <DialogContent className="max-w-[90vw] sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle className="truncate pr-8">
              {viewing?.filename}
            </DialogTitle>
          </DialogHeader>
          {viewing ? (
            <img
              src={assetUrl(viewing.id)}
              alt={viewing.filename}
              className="max-h-[75vh] w-full rounded-md object-contain"
            />
          ) : null}
        </DialogContent>
      </Dialog>

      {/* Подтверждение удаления. */}
      <Dialog
        open={confirming !== null}
        onOpenChange={(open) => !open && setConfirming(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Удалить файл?</DialogTitle>
            <DialogDescription>
              «{confirming?.filename}» будет удалён безвозвратно вместе с
              байтами. Документы, ссылающиеся на него, потеряют файл.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline" />}>
              Отмена
            </DialogClose>
            <Button
              type="button"
              variant="destructive"
              disabled={remove.isPending}
              onClick={() => {
                if (!confirming) return
                remove.mutate(confirming.id, {
                  onSuccess: () => setConfirming(null),
                })
              }}
            >
              {remove.isPending ? 'Удаление…' : 'Удалить'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
