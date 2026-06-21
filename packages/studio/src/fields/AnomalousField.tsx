import type { AnyField } from '@jalyk/schema'
import { Button, CodeBlock, cn, toast } from '@jalyk/ui'
import { CopyIcon, Trash2Icon, TriangleAlertIcon } from 'lucide-react'
import { useMemo, useState, type ReactNode } from 'react'
import { useField } from '../data/field.ts'
import { FieldSourceProvider, type FieldSource } from '../data/field-source.tsx'
import { getAtPath, setAtPath } from '../data/path.ts'
import { FieldMenu } from './FieldMenu.tsx'

// Общий компонент «аномального» поля для двух случаев рассогласования данных со схемой:
//  - сломана структура значения известного поля (fit === 'structure') — старое значение
//    показывается как код только для копирования, а под ним пустой нормальный редактор
//    поля на буфере: заполнить заново и нажать «Применить» (см. BrokenFieldEditor);
//  - поле есть в JSON, но не в схеме (его удалили) — read-only показ, тон нейтральный,
//    безобидно (см. UnknownField).
// Костяк один: подзаголовок с подписью, подсказкой и слотом действий, тело с JSON и
// необязательный слот children под ним (новая форма аварийного редактора).

/** Тон панели: ошибка (красная рамка, документ сломан) или нейтральный (просто аномалия). */
type AnomalyTone = 'error' | 'muted'

/** Копирует текст в буфер: navigator.clipboard только в secure context (https/localhost), поэтому по LAN-адресу падаем на execCommand через временный textarea. */
function writeClipboard(text: string) {
  if (navigator.clipboard?.writeText) {
    void navigator.clipboard.writeText(text).catch(() => fallbackCopy(text))
    return
  }
  fallbackCopy(text)
}

function fallbackCopy(text: string) {
  const area = document.createElement('textarea')
  area.value = text
  area.style.position = 'fixed'
  area.style.opacity = '0'
  document.body.appendChild(area)
  area.select()
  try {
    document.execCommand('copy')
  } finally {
    document.body.removeChild(area)
  }
}

/** Кладёт значение в буфер обмена как форматированный JSON и показывает тост. */
function copyValue(value: unknown) {
  writeClipboard(JSON.stringify(value ?? null, null, 2))
  toast('Скопировано значение')
}

type AnomalousFieldProps = {
  title: string
  hint: string
  tone: AnomalyTone
  value: unknown
  /** Действия в подзаголовке (копировать/вставить/сброс или удалить). */
  actions: ReactNode
  /** Показать кнопку копирования сырого значения на блоке кода. */
  copyable?: boolean
  /** Содержимое под блоком значения (новая форма аварийного редактора). */
  children?: ReactNode
}

/** Презентационная панель аномального поля: подзаголовок (подпись + подсказка + действия), read-only тело с JSON (опционально с кнопкой копирования) и слот children под ним. */
export function AnomalousField({
  title,
  hint,
  tone,
  value,
  actions,
  copyable,
  children,
}: AnomalousFieldProps) {
  return (
    <div
      className={cn(
        'flex flex-col gap-2 rounded-md border p-3',
        tone === 'error'
          ? 'border-destructive/50 bg-destructive/5'
          : 'bg-muted/30',
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col gap-0.5">
          <span className="flex items-center gap-1.5 text-sm font-medium">
            <TriangleAlertIcon
              className={cn(
                'size-4 shrink-0',
                tone === 'error' ? 'text-destructive' : 'text-muted-foreground',
              )}
            />
            {title}
          </span>
          <span className="text-xs text-muted-foreground">{hint}</span>
        </div>
        <div className="flex shrink-0 items-center gap-1">{actions}</div>
      </div>
      <div className="relative">
        <CodeBlock
          code={JSON.stringify(value ?? null, null, 2)}
          className="max-h-72 overflow-auto rounded-md border bg-muted/50 p-3 text-xs"
        />
        {copyable ? (
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1 size-6 text-muted-foreground"
            aria-label="Скопировать значение"
            onClick={() => copyValue(value)}
          >
            <CopyIcon />
          </Button>
        ) : null}
      </div>
      {children}
    </div>
  )
}

/** Случай №1 (структура сломана): старое значение показывается как код для копирования, под ним пустой нормальный редактор того же поля на локальном буфере (FieldSourceProvider) — он ничего не пишет в документ, пока не нажата «Применить», которая всегда активна и записывает буфер как есть. Действия копировать/вставить/сброс берёт штатное меню поля (FieldMenu). Документ при этом считается сломанным — error-замечание ставит встроенная валидация (conformanceIssues). children — обычный FieldEditor того же поля, рисуемый внутри буфера (приходит из FieldInput, чтобы не было циклического импорта). */
export function BrokenFieldEditor({
  path,
  field,
  children,
}: {
  path: readonly string[]
  field: AnyField
  children: ReactNode
}) {
  const handle = useField(path)
  const [buffer, setBuffer] = useState<unknown>(undefined)
  // Пути дочерних полей абсолютные (начинаются с path) — режем префикс, адресуя буфер относительно самого поля.
  const source = useMemo<FieldSource>(
    () => ({
      get: (p) => getAtPath(buffer, p.slice(path.length)),
      set: (p, value) =>
        setBuffer((prev: unknown) =>
          setAtPath(prev, p.slice(path.length), value),
        ),
    }),
    [buffer, path],
  )
  return (
    <AnomalousField
      tone="error"
      title={field.title ?? path[path.length - 1] ?? 'Значение поля'}
      hint="Структура значения не подходит под поле. Старое значение ниже — для копирования; заполните поле заново и нажмите «Применить»."
      value={handle.value}
      copyable
      actions={<FieldMenu path={path} field={field} />}
    >
      <FieldSourceProvider value={source}>
        <div className="flex flex-col gap-3 rounded-md border bg-background p-3">
          {children}
          <Button
            size="sm"
            className="self-start"
            onClick={() => handle.set(buffer ?? null)}
          >
            Применить
          </Button>
        </div>
      </FieldSourceProvider>
    </AnomalousField>
  )
}

/** Случай №2 (поле есть в JSON, но не в схеме): нейтральная read-only панель. Действия — скопировать сырое значение и удалить поле (перезаписью родительского объекта без этого ключа). Не ошибка: документ отдаётся клиенту, поле срезается на отдаче. */
export function UnknownField({
  objectPath,
  fieldKey,
}: {
  objectPath: readonly string[]
  fieldKey: string
}) {
  const handle = useField<Record<string, unknown>>(objectPath)
  const object = handle.value ?? {}
  const value = getAtPath(object, [fieldKey])
  const remove = () => {
    const next = { ...object }
    delete next[fieldKey]
    handle.set(next)
  }
  return (
    <AnomalousField
      tone="muted"
      title={fieldKey}
      hint="Поля нет в схеме — на отдаче клиенту отбрасывается."
      value={value}
      actions={
        <>
          <Button
            variant="ghost"
            size="icon"
            className="size-6 text-muted-foreground"
            aria-label="Скопировать значение"
            onClick={() => copyValue(value)}
          >
            <CopyIcon />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-6 text-muted-foreground"
            aria-label="Удалить поле"
            onClick={remove}
          >
            <Trash2Icon />
          </Button>
        </>
      }
    />
  )
}
