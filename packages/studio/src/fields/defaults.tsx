import {
  Checkbox,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
  Textarea,
  cn,
} from '@jalyk/ui'
import { useState } from 'react'
import { useField } from '../data/field.ts'
import type { FieldComponentProps } from './registry.tsx'

// Стиль инпута, в котором лежит значение неверного типа/варианта (invalid): текст красным, чтобы было видно поломку, но значение остаётся видно и чинится прямо здесь — выбором пункта или перепечаткой.
const invalidText = 'text-destructive'

// Дефолтные редакторы полей. Текстовые правят локальное состояние и коммитят точечную запись на blur (а не на каждую клавишу — иначе PATCH на символ). Внешние правки (SSE) приходят через value и синхронизируют локальный буфер.

function useCommittedText(path: readonly string[]) {
  const handle = useField<string>(path)
  const external = handle.value ?? ''
  const [local, setLocal] = useState(external)
  // Внешнее значение (например, правка по SSE) синхронизируем в локальный буфер
  // во время рендера, отслеживая предыдущее: правка извне обновляет буфер, а
  // локальный ввод между правками сохраняется. Замена useEffect+setState, на
  // которую ругается set-state-in-effect (лишний проход после коммита).
  const [synced, setSynced] = useState(external)
  if (external !== synced) {
    setSynced(external)
    setLocal(external)
  }
  const commit = () => {
    if (local !== external) handle.set(local)
  }
  return { local, setLocal, commit, handle }
}

export function StringField({ path, field, invalid }: FieldComponentProps) {
  const { local, setLocal, commit, handle } = useCommittedText(path)
  // Поле-селект из предопределённых значений — выпадающий список shadcn. Radix не допускает пустое значение элемента, поэтому пустую строку отдаём как undefined, тогда показывается placeholder.
  if (field.input?.type === 'select' && field.input.predefined) {
    const predefined = field.input.predefined
    const raw = handle.value == null ? undefined : String(handle.value)
    // Невалидное значение (выпавшее из predefined или не строка) показываем красным отдельным пунктом, чтобы оно было видно и его можно было перевыбрать.
    const orphan = invalid && raw && !predefined.some((o) => o.value === raw)
    const options = [
      ...predefined.map((option) => ({
        value: option.value,
        label: option.title ?? option.value,
      })),
      ...(orphan ? [{ value: raw, label: raw }] : []),
    ]
    return (
      <Select
        value={raw || undefined}
        onValueChange={(value) => handle.set(value)}
        items={options}
      >
        <SelectTrigger className={cn('w-full', invalid && invalidText)}>
          <SelectValue placeholder="Не выбрано" />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    )
  }
  // Многострочное поле — textarea: переносы хранятся как обычные \n в строке.
  if (field.input?.type === 'multiline') {
    return (
      <Textarea
        // w-0 + min-w-full: с field-sizing:content textarea растёт вширь от своего текста и распирает колонку. Обнуляем её вклад в ширину (width:0), но растягиваем до колонки (min-width:100%) — растёт только высота, ширину задаёт колонка.
        className={cn('min-h-24 w-0 min-w-full', invalid && invalidText)}
        value={local}
        onChange={(e) => setLocal(e.target.value)}
        onBlur={commit}
      />
    )
  }
  return (
    <Input
      className={cn(invalid && invalidText)}
      value={local}
      onChange={(e) => setLocal(e.target.value)}
      onBlur={commit}
    />
  )
}

export function NumberField({ path, invalid }: FieldComponentProps) {
  const handle = useField<number>(path)
  const external = handle.value?.toString() ?? ''
  const [local, setLocal] = useState(external)
  // Синхронизация внешнего значения в локальный буфер во время рендера (см. useCommittedText).
  const [synced, setSynced] = useState(external)
  if (external !== synced) {
    setSynced(external)
    setLocal(external)
  }
  // Пустая строка очищает поле (null), иначе пишем число, игнорируя нечисловой ввод.
  const commit = () => {
    if (local === '') {
      if (handle.value !== undefined) handle.set(null)
      return
    }
    const next = Number(local)
    if (!Number.isNaN(next) && next !== handle.value) handle.set(next)
  }
  // При неверном типе значение может быть нечисловым — показываем его текстом красным, чтобы оно было видно и его можно было перепечатать числом (type=number скрыл бы нечисловой ввод).
  return (
    <Input
      type={invalid ? 'text' : 'number'}
      className={cn(invalid && invalidText)}
      value={local}
      onChange={(e) => setLocal(e.target.value)}
      onBlur={commit}
    />
  )
}

export function BooleanField({ path, field, invalid }: FieldComponentProps) {
  const handle = useField<boolean>(path)
  const checked = handle.value === true
  const onCheckedChange = (next: boolean) => handle.set(next === true)
  // Вариант редактора: 'switch' рисует тумблер, иначе (по умолчанию) — чекбокс.
  if (field.input?.type === 'switch') {
    return (
      <Switch
        aria-invalid={invalid || undefined}
        checked={checked}
        onCheckedChange={onCheckedChange}
      />
    )
  }
  return (
    <Checkbox
      className={cn(invalid && 'border-destructive')}
      checked={checked}
      onCheckedChange={onCheckedChange}
    />
  )
}

/** Фолбэк для видов без специального редактора (richText/image/reference/object/ array): редактирование значения JSON-ом. Коммит на blur, если JSON валиден. */
export function FallbackField({ path }: FieldComponentProps) {
  const handle = useField(path)
  const external = JSON.stringify(handle.value ?? null, null, 2)
  const [text, setText] = useState(external)
  const [error, setError] = useState<string | null>(null)
  // Синхронизация внешнего значения в локальный буфер во время рендера (см. useCommittedText).
  const [synced, setSynced] = useState(external)
  if (external !== synced) {
    setSynced(external)
    setText(external)
  }
  const commit = () => {
    try {
      handle.set(JSON.parse(text))
      setError(null)
    } catch {
      setError('Некорректный JSON')
    }
  }
  return (
    <div className="flex flex-col gap-1">
      <Textarea
        className="min-h-24 font-mono text-xs"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={commit}
      />
      {error ? <span className="text-xs text-destructive">{error}</span> : null}
    </div>
  )
}
