import {
  fieldFit,
  type AnyField,
  type DefaultHeaderData,
  type FieldKind,
} from '@jalyk/schema'
import { cn } from '@jalyk/ui'
import { type ReactNode } from 'react'
import { useFieldCollapsed } from '../data/field-collapse.tsx'
import { useFieldsCollapsible } from '../data/field-dialog.tsx'
import { useDocumentContext } from '../data/document.tsx'
import { useField } from '../data/field.ts'
import { useDocumentSelect } from '../data/hooks.ts'
import { jsonEqual } from '../data/json-equal.ts'
import { getAtPath } from '../data/path.ts'
import { BrokenFieldEditor } from './AnomalousField.tsx'
import {
  asComponent,
  Dynamic,
  Slot,
  type HeaderProps,
} from '../data/react-bridge.tsx'
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
import { AssetField } from './AssetField.tsx'
import { DateField, DateRangeField } from './date.tsx'
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
  const issues = useFieldIssues(path)
  const issue: Exclude<FieldStatus, 'changed'> | null = issues.some(
    (issue) => issue.severity === 'error',
  )
    ? 'error'
    : issues.some((issue) => issue.severity === 'warning')
      ? 'warning'
      : null
  // Подписка точечная: булев флаг меняется только когда правка касается этого пути, поэтому полоска статуса не реагирует на правки других полей.
  const changed =
    useDocumentSelect(id, (data) =>
      // Документ ещё не публиковали — весь черновик считается изменённым.
      data.published == null ||
      !jsonEqual(getAtPath(data.draft, path), getAtPath(data.published, path)),
    ).data ?? false
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
  asset: AssetField,
  date: DateField,
  dateRange: DateRangeField,
  reference: ReferenceField,
  object: ObjectField,
  array: ArrayField,
}

/** Голый редактор поля (без подписи): компонент по виду — реестр, иначе дефолт, иначе JSON. Через него ObjectField/ArrayField рисуют вложенное. Перед обычным редактором проверяет соответствие значения схеме: при структурном сломе категории подменяет инпут аварийным JSON-редактором, при несовпадении типа/варианта помечает инпут invalid. */
export function FieldEditor({ path, field }: FieldComponentProps) {
  const handle = useField(path)
  const override = useFieldComponent(field.kind)
  const fit = fieldFit(field, handle.value)
  if (fit === 'structure')
    // children — тот же FieldEditor, но рисуется внутри буфера (FieldSourceProvider): handle.value пустой → fit === 'ok' → обычный редактор, без рекурсии в аварийный.
    return (
      <BrokenFieldEditor path={path} field={field}>
        <FieldEditor path={path} field={field} />
      </BrokenFieldEditor>
    )
  // Компонент выбирается в рендере (реестр → дефолт → фолбэк), поэтому рисуем
  // его через Slot: он приходит туда готовым пропом, и static-components не
  // срабатывает на «компонент, выведенный внутри рендера».
  return (
    <Slot
      as={override ?? defaults[field.kind] ?? FallbackField}
      props={{ path, field, invalid: fit === 'type' }}
    />
  )
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

/** Рисует поле: заголовок (из `header`/field.header, false/null скрывает) плюс FieldEditor. Поле можно свернуть шевроном в дефолтном заголовке; начальное состояние берётся из CollapseDefault (раскрыто в форме, свёрнуто в панели состояния). */
export function FieldInput({
  path,
  field,
  header,
  headerComponent,
  className,
}: FieldInputProps) {
  const source = header === undefined ? field.header : header
  const hidden = source === false || source === null
  const customHeader = headerComponent ?? field.headerComponent
  const hasCustomHeader = asComponent<HeaderProps>(customHeader) != null
  // Внутри диалога «Открыть полностью» поле несворачиваемо — окружение запрещает.
  const dialogCollapsible = useFieldsCollapsible()
  // Шеврон живёт только в дефолтном заголовке: без него поле несворачиваемо, поэтому и тело не прячем.
  const collapsible = !hidden && !hasCustomHeader && dialogCollapsible
  // Редактор создаётся один раз и передаётся в тело готовым элементом: при сворачивании перерисовывается только обёртка тела, а не всё его поддерево.
  const editor = <FieldEditor path={path} field={field} />
  return (
    <div className={cn('relative flex flex-col gap-1.5 pl-3', className)}>
      <FieldStatusStrip path={path} />
      {hidden ? null : hasCustomHeader ? (
        <Dynamic
          component={customHeader}
          props={{ path, field, header: source }}
        />
      ) : (
        <DefaultHeader
          path={path}
          field={field}
          header={defaultHeaderData(field, path, source)}
        />
      )}
      {collapsible ? (
        <CollapsibleBody path={path}>{editor}</CollapsibleBody>
      ) : (
        editor
      )}
    </div>
  )
}

/** Сворачиваемое тело поля: подписано на состояние своего пути и анимирует высоту, не перерисовывая сам редактор — он приходит готовым элементом через children. */
function CollapsibleBody({
  path,
  children,
}: {
  path: readonly string[]
  children: ReactNode
}) {
  const collapsed = useFieldCollapsed(path)
  return (
    <div
      className={cn(
        'grid transition-all duration-200',
        // -mt-1.5 гасит родительский gap-1.5: при высоте 0 он остаётся фантомным
        // отступом под хедером, поэтому сворачиваем его вместе с высотой (margin тоже под transition-all).
        collapsed
          ? '-mt-1.5 grid-rows-[0fr] opacity-50'
          : 'grid-rows-[1fr] opacity-100',
      )}
    >
      <div className="overflow-hidden">{children}</div>
    </div>
  )
}
