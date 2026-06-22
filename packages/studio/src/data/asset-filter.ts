import type { AssetInfo } from '@jalyk/contract'
import type { AssetFilter } from '@jalyk/schema'
import {
  FileIcon,
  FileTextIcon,
  ImageIcon,
  Music2Icon,
  VideoIcon,
  type LucideIcon,
} from 'lucide-react'

type Asset = typeof AssetInfo.Type

// Утилиты галереи ассетов: сопоставление типа с фильтром-массивом глобов, разбор
// по категориям для колонки слева и человекочитаемый вес файла. Единственная ось
// ограничения — фильтр поля (см. AssetFilter в @jalyk/schema); из него же
// выводятся счётчики категорий, поэтому второй сущности нет.

/** Совпадает ли MIME-тип с одним глобом: `video/*` — по категории (префиксу до `/`), иначе ровно тип. */
function matchesGlob(contentType: string, glob: string): boolean {
  if (glob.endsWith('/*')) {
    const prefix = glob.slice(0, glob.length - 1) // оставляем «video/»
    return contentType.startsWith(prefix)
  }
  return contentType === glob
}

/** Подходит ли ассет под фильтр поля. Без фильтра (undefined) подходит любой — режим менеджера; с фильтром — если совпал хотя бы один глоб (режим выбора прячет остальное). */
export function matchesFilter(
  contentType: string,
  filter: AssetFilter | undefined,
): boolean {
  if (!filter) return true
  return filter.some((glob) => matchesGlob(contentType, glob))
}

/** Категории ассетов для колонки слева. Порядок фиксирован; `prefix` — начало MIME-типа, `null` у «Другое» (всё, что не попало в остальные); `icon` — иконка категории. */
export const ASSET_CATEGORIES = [
  { id: 'image', label: 'Изображения', prefix: 'image/', icon: ImageIcon },
  { id: 'video', label: 'Видео', prefix: 'video/', icon: VideoIcon },
  { id: 'audio', label: 'Аудио', prefix: 'audio/', icon: Music2Icon },
  { id: 'text', label: 'Текстовые', prefix: 'text/', icon: FileTextIcon },
  { id: 'other', label: 'Другое', prefix: null, icon: FileIcon },
] as const satisfies readonly {
  id: string
  label: string
  prefix: string | null
  icon: LucideIcon
}[]

export type AssetCategoryId = (typeof ASSET_CATEGORIES)[number]['id']

/** Категория ассета по MIME-типу: первый совпавший префикс, иначе «Другое». */
export function categoryOfType(contentType: string): AssetCategoryId {
  for (const category of ASSET_CATEGORIES) {
    if (category.prefix && contentType.startsWith(category.prefix)) {
      return category.id
    }
  }
  return 'other'
}

/** Является ли ассет картинкой (показываем превью и увеличение, а не иконку). */
export function isImageType(contentType: string): boolean {
  return contentType.startsWith('image/')
}

// Короткие метки для частых MIME-типов, у которых подтип сам по себе длинный и
// нечитаемый (office openxml и пр.). Остальное выводится из подтипа фолбэком.
const FORMAT_LABELS: Record<string, string> = {
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
    'DOCX',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'XLSX',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation':
    'PPTX',
  'application/msword': 'DOC',
  'application/vnd.ms-excel': 'XLS',
  'application/vnd.ms-powerpoint': 'PPT',
  'application/pdf': 'PDF',
  'application/zip': 'ZIP',
  'application/json': 'JSON',
  'application/octet-stream': 'BIN',
}

/** Короткая метка формата из MIME-типа: для известных типов — фиксированная (`…wordprocessingml.document` → `DOCX`), иначе подтип без `vnd.`/`+suffix` и по последнему сегменту, в верхнем регистре (`image/png` → `PNG`, `image/svg+xml` → `SVG`). */
export function formatLabel(contentType: string): string {
  const known = FORMAT_LABELS[contentType]
  if (known) return known
  const subtype = contentType.split('/')[1] ?? contentType
  const base = subtype.split('+')[0].replace(/^vnd\./, '')
  const segment = base.split('.').at(-1) ?? base
  return segment.toUpperCase()
}

/** Варианты сортировки галереи. `compare` — компаратор для Array.prototype.sort. */
export const ASSET_SORTS = [
  {
    id: 'date-desc',
    label: 'Сначала новые',
    compare: (a: Asset, b: Asset) => b.createdAt.localeCompare(a.createdAt),
  },
  {
    id: 'date-asc',
    label: 'Сначала старые',
    compare: (a: Asset, b: Asset) => a.createdAt.localeCompare(b.createdAt),
  },
  {
    id: 'size-desc',
    label: 'Сначала тяжёлые',
    compare: (a: Asset, b: Asset) => b.size - a.size,
  },
  {
    id: 'size-asc',
    label: 'Сначала лёгкие',
    compare: (a: Asset, b: Asset) => a.size - b.size,
  },
] as const

export type AssetSortId = (typeof ASSET_SORTS)[number]['id']

const SIZE_UNITS = ['Б', 'КБ', 'МБ', 'ГБ', 'ТБ'] as const

/** Человекочитаемый вес файла: 1536 → «1.5 КБ». Двоичная шкала (1024), один знак после запятой кроме байтов. */
export function formatBytes(size: number): string {
  if (size < 1) return '0 Б'
  const exponent = Math.min(
    Math.floor(Math.log(size) / Math.log(1024)),
    SIZE_UNITS.length - 1,
  )
  const value = size / 1024 ** exponent
  const formatted = exponent === 0 ? String(value) : value.toFixed(1)
  return `${formatted} ${SIZE_UNITS[exponent]}`
}
