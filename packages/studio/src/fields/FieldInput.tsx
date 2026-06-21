import type { AnyField, DefaultHeaderData, FieldKind } from '@jalyk/schema'
import { cn } from '@jalyk/ui'
import { useDocumentContext } from '../data/document.tsx'
import { useDocument } from '../data/hooks.ts'
import { jsonEqual } from '../data/json-equal.ts'
import { getAtPath } from '../data/path.ts'
import { asComponent, type HeaderProps } from '../data/react-bridge.tsx'
import { useFieldIssues } from '../data/validation.tsx'
import { ArrayField } from './array.tsx'
import {
  BooleanField,
  FallbackField,
  NumberField,
  StringField,
} from './defaults.tsx'
import { DefaultHeader } from './DefaultHeader.tsx'
import { ImageField } from './image.tsx'
import { ObjectField } from './object.tsx'
import { ReferenceField } from './reference.tsx'
import {
  useFieldComponent,
  type FieldComponent,
  type FieldComponentProps,
} from './registry.tsx'

type FieldStatus = 'error' | 'warning' | 'changed'

/** Цвет полоски по статусу: ошибка — красный, предупреждение — жёлтый, изменение — светло-синий. */
const statusColor: Record<FieldStatus, string> = {
  error: 'var(--destructive)',
  warning: '#eab308',
  changed: '#38bdf8',
}

/** Статус поля для боковой полоски (приоритет ошибка → предупреждение → изменение). null — поле чистое и совпадает с опубликованным. */
function useFieldStatus(path: readonly string[]): FieldStatus | null {
  const { id } = useDocumentContext()
  const doc = useDocument(id)
  const issues = useFieldIssues(path)
  if (issues.some((issue) => issue.severity === 'error')) return 'error'
  if (issues.some((issue) => issue.severity === 'warning')) return 'warning'
  const published = doc.data?.published
  // Документ ещё не публиковали — весь черновик считается изменённым.
  if (published == null) return 'changed'
  return jsonEqual(getAtPath(doc.data?.draft, path), getAtPath(published, path))
    ? null
    : 'changed'
}

/** Вертикальная полоска статуса слева у поля: диагональные полосы «строительной ленты» (без анимации), цвет — по статусу. */
function FieldStatusStrip({ path }: { path: readonly string[] }) {
  const status = useFieldStatus(path)
  if (!status) return null
  const color = statusColor[status]
  return (
    <span
      aria-hidden
      className="absolute inset-y-0 left-0 w-0.5 rounded-full"
      style={{ background: color }}
    />
  )
}

/** Дефолтные редакторы по виду поля; виды без своего падают на JSON-фолбэк. */
const defaults: Partial<Record<FieldKind, FieldComponent>> = {
  string: StringField,
  number: NumberField,
  boolean: BooleanField,
  image: ImageField,
  reference: ReferenceField,
  object: ObjectField,
  array: ArrayField,
}

/** Голый редактор поля (без подписи): компонент по виду — реестр, иначе дефолт, иначе JSON. Через него ObjectField/ArrayField рисуют вложенное. */
export function FieldEditor({ path, field }: FieldComponentProps) {
  const override = useFieldComponent(field.kind)
  const Component = override ?? defaults[field.kind] ?? FallbackField
  return <Component path={path} field={field} />
}

/** Собирает DefaultHeaderData из `source` (header поля или переопределение), с фолбэком на поля field и последний сегмент пути. */
function defaultHeaderData(
  field: AnyField,
  path: readonly string[],
  source: unknown,
): DefaultHeaderData {
  const headerTitle = getAtPath(source, ['title'])
  const headerDescription = getAtPath(source, ['description'])
  const headerIcon = getAtPath(source, ['icon'])
  return {
    title:
      typeof headerTitle === 'string'
        ? headerTitle
        : (field.title ?? path[path.length - 1] ?? ''),
    description:
      typeof headerDescription === 'string'
        ? headerDescription
        : field.description,
    icon: headerIcon ?? field.icon,
  }
}

/** Переопределения заголовка от кастомной формы: `header` (false/null скрывает, undefined → из поля), `headerComponent` и `className`. */
export type FieldInputProps = FieldComponentProps & {
  header?: unknown
  headerComponent?: unknown
  className?: string
}

/** Рисует поле: заголовок (из `header`/field.header, false/null скрывает) плюс FieldEditor. */
export function FieldInput({
  path,
  field,
  header,
  headerComponent,
  className,
}: FieldInputProps) {
  const source = header === undefined ? field.header : header
  const hidden = source === false || source === null
  const Custom = asComponent<HeaderProps>(
    headerComponent ?? field.headerComponent,
  )
  return (
    <div className={cn('relative flex flex-col gap-1.5 pl-3', className)}>
      <FieldStatusStrip path={path} />
      {hidden ? null : Custom ? (
        <Custom path={path} field={field} header={source} />
      ) : (
        <DefaultHeader
          path={path}
          field={field}
          header={defaultHeaderData(field, path, source)}
        />
      )}
      <FieldEditor path={path} field={field} />
    </div>
  )
}
