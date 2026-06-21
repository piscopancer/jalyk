import type { AnyField, DefaultHeaderData, FieldKind } from '@jalyk/schema'
import { cn } from '@jalyk/ui'
import { useDocumentContext } from '../data/document.tsx'
import { useDocument } from '../data/hooks.ts'
import { jsonEqual } from '../data/json-equal.ts'
import { getAtPath } from '../data/path.ts'
import { asComponent, type HeaderProps } from '../data/react-bridge.tsx'
import { statusColor, type FieldStatus } from '../data/status-color.ts'
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

/** Статус поля по двум независимым осям: есть ли неопубликованные правки (черновик) и худшее замечание валидации (ошибка/предупреждение). Это разные состояния, поэтому возвращаем оба, а не приоритетом. */
function useFieldStatus(path: readonly string[]) {
  const { id } = useDocumentContext()
  const doc = useDocument(id)
  const issues = useFieldIssues(path)
  const issue: Exclude<FieldStatus, 'changed'> | null = issues.some(
    (issue) => issue.severity === 'error',
  )
    ? 'error'
    : issues.some((issue) => issue.severity === 'warning')
      ? 'warning'
      : null
  const published = doc.data?.published
  // Документ ещё не публиковали — весь черновик считается изменённым.
  const changed =
    published == null ||
    !jsonEqual(getAtPath(doc.data?.draft, path), getAtPath(published, path))
  return { changed, issue }
}

/** Вертикальные полоски статуса слева у поля: слева — черновик (изменение), справа через мини-отступ — ошибка/предупреждение. Оба слота фиксированы и всегда занимают своё место, поэтому полоски не съезжают, когда одно из состояний пропадает. */
function FieldStatusStrip({ path }: { path: readonly string[] }) {
  const { changed, issue } = useFieldStatus(path)
  if (!changed && !issue) return null
  return (
    <span aria-hidden className="absolute inset-y-0 left-0 flex gap-1">
      <span
        className="w-0.25 rounded-full"
        style={{ background: changed ? statusColor.changed : undefined }}
      />
      <span
        className="w-0.25 rounded-full"
        style={{ background: issue ? statusColor[issue] : undefined }}
      />
    </span>
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
