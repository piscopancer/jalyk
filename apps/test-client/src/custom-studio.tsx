import {
  definePathSegment,
  documentsSegment,
  PathSegmentLink,
  TypesColumn,
  useAssetUsage,
  type AnyPathSegment,
} from '@jalyk/studio'
import { HardDriveIcon, SparklesIcon } from 'lucide-react'

// Кастомная навигация студии: корневой сегмент — дефолтная колонка типов (она по
// старому открывает сегмент документов из @jalyk/studio), а под списком добавлена
// кнопка «Джарибек», открывающая отдельный сегмент с заполненностью хранилища.

/** Перевести байты в человекочитаемый размер. */
function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} Б`
  const units = ['КБ', 'МБ', 'ГБ', 'ТБ'] as const
  let value = bytes / 1024
  let unit = 0
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024
    unit++
  }
  return `${value.toFixed(1)} ${units[unit]}`
}

/** Панель заполненности хранилища: прогресс-бар «занято / лимит» по useAssetUsage. */
function StoragePanel() {
  const usage = useAssetUsage()
  return (
    <div className="flex w-72 shrink-0 flex-col gap-4 border-r p-4">
      <div className="flex items-center gap-2 text-sm font-medium">
        <HardDriveIcon className="size-4 text-muted-foreground" />
        Хранилище проекта
      </div>
      {usage.data ? (
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between gap-2 text-xs">
            <span className="text-muted-foreground">Занято</span>
            <span>
              {formatBytes(usage.data.used)} / {formatBytes(usage.data.quota)}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{
                width: `${Math.min((usage.data.used / usage.data.quota) * 100, 100)}%`,
              }}
            />
          </div>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">Загрузка…</p>
      )}
    </div>
  )
}

/** Сегмент «Джарибек»: лист дерева, рисует панель хранилища. */
const jaribekSegment = definePathSegment({
  key: 'jaribek',
  view: () => <StoragePanel />,
})

/** Прочитать строковый params звена next (он типизирован как unknown). */
function nextType(
  next: { key: string; params: Record<string, unknown> } | undefined,
): string | undefined {
  if (next?.key !== 'documents') return undefined
  const type = next.params.type
  return typeof type === 'string' ? type : undefined
}

/** Корень кастомной навигации: дефолтная колонка типов + кнопка «Джарибек» под списком. */
export const customRootSegment: AnyPathSegment = definePathSegment({
  key: 'types',
  children: { documents: documentsSegment, jaribek: jaribekSegment },
  view: ({ open, go, next }) => (
    <TypesColumn
      selected={nextType(next)}
      onSelect={(type) => go(open.documents({ type }))}
      footer={
        <PathSegmentLink
          to={open.jaribek({})}
          className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm transition-colors hover:bg-muted hover:text-foreground dark:hover:bg-muted/50"
        >
          <SparklesIcon className="size-4 text-muted-foreground" />
          Джарибек
        </PathSegmentLink>
      }
    />
  ),
})
