import {
  Checkbox,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
} from '@jalyk/ui'
import { useEffect, useState } from 'react'
import { useField } from '../data/field.ts'
import type { FieldComponentProps } from './registry.tsx'

// Дефолтные редакторы полей. Текстовые правят локальное состояние и коммитят точечную запись на blur (а не на каждую клавишу — иначе PATCH на символ). Внешние правки (SSE) приходят через value и синхронизируют локальный буфер.

function useCommittedText(path: readonly string[]) {
  const handle = useField<string>(path)
  const [local, setLocal] = useState(handle.value ?? '')
  useEffect(() => setLocal(handle.value ?? ''), [handle.value])
  const commit = () => {
    if (local !== (handle.value ?? '')) handle.set(local)
  }
  return { local, setLocal, commit, handle }
}

export function StringField({ path, field }: FieldComponentProps) {
  const { local, setLocal, commit, handle } = useCommittedText(path)
  // Поле-селект из предопределённых значений — выпадающий список shadcn. Radix не допускает пустое значение элемента, поэтому пустую строку отдаём как undefined, тогда показывается placeholder.
  if (field.input?.type === 'select' && field.input.predefined) {
    return (
      <Select
        value={local || undefined}
        onValueChange={(value) => handle.set(value)}
        items={field.input.predefined.map((option) => ({
          value: option.value,
          label: option.title ?? option.value,
        }))}
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Не выбрано" />
        </SelectTrigger>
        <SelectContent>
          {field.input.predefined.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.title ?? option.value}
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
        className="min-h-24"
        value={local}
        onChange={(e) => setLocal(e.target.value)}
        onBlur={commit}
      />
    )
  }
  return (
    <Input
      value={local}
      onChange={(e) => setLocal(e.target.value)}
      onBlur={commit}
    />
  )
}

export function NumberField({ path }: FieldComponentProps) {
  const handle = useField<number>(path)
  const [local, setLocal] = useState(handle.value?.toString() ?? '')
  useEffect(() => setLocal(handle.value?.toString() ?? ''), [handle.value])
  // Пустая строка очищает поле (null), иначе пишем число, игнорируя нечисловой ввод.
  const commit = () => {
    if (local === '') {
      if (handle.value !== undefined) handle.set(null)
      return
    }
    const next = Number(local)
    if (!Number.isNaN(next) && next !== handle.value) handle.set(next)
  }
  return (
    <Input
      type="number"
      value={local}
      onChange={(e) => setLocal(e.target.value)}
      onBlur={commit}
    />
  )
}

export function BooleanField({ path }: FieldComponentProps) {
  const handle = useField<boolean>(path)
  return (
    <Checkbox
      checked={handle.value ?? false}
      onCheckedChange={(checked) => handle.set(checked === true)}
    />
  )
}

/** Фолбэк для видов без специального редактора (richText/image/reference/object/ array): редактирование значения JSON-ом. Коммит на blur, если JSON валиден. */
export function FallbackField({ path }: FieldComponentProps) {
  const handle = useField(path)
  const [text, setText] = useState(() =>
    JSON.stringify(handle.value ?? null, null, 2),
  )
  const [error, setError] = useState<string | null>(null)
  useEffect(
    () => setText(JSON.stringify(handle.value ?? null, null, 2)),
    [handle.value],
  )
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
