import type { DateFormat, DateRangeValue, TimeParts } from '@jalyk/schema'
import {
  Button,
  Calendar,
  cn,
  Input,
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@jalyk/ui'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import { CalendarIcon } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useField } from '../data/field.ts'
import type { FieldComponentProps } from './registry.tsx'

// Поля даты. Значение хранится строкой: при time:false — «yyyy-MM-dd», при
// time:true — ISO с «Z». «Z» здесь номинальная: компоненты времени трактуются как
// настенные (что ввели, то и записано), без перевода часовых поясов, поэтому
// разбор и сборка идут по локальным полям Date и дрейфа дат не возникает.

/** Диапазон выбора календаря; структурно совпадает с DateRange из react-day-picker (тип календаря в @jalyk/ui), поэтому зависимость на сам пакет не нужна. */
type DateRange = { from: Date | undefined; to?: Date | undefined }

/** Границы выпадающего выбора месяца/года в календаре: с 1900 по текущий год + 10. */
const CALENDAR_START = new Date(1900, 0)
const CALENDAR_END = new Date(new Date().getFullYear() + 10, 11)

/** Какие разряды времени реально показывать: при time:false ни одного, иначе hour/min по умолчанию, sec — нет. */
function resolveShow(show: TimeParts | undefined, time: boolean) {
  if (!time) return { hour: false, min: false, sec: false }
  return {
    hour: show?.hour ?? true,
    min: show?.min ?? true,
    sec: show?.sec ?? false,
  }
}

/** Разбирает хранимую строку (дата или ISO с «Z») в локальный Date, чьи поля равны записанным компонентам; undefined при пустой/битой строке. */
function parseStored(value: string | undefined) {
  if (!value) return undefined
  const m = value.match(
    /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2})(?::(\d{2}))?Z?)?$/,
  )
  if (!m) return undefined
  const [, y, mo, d, h, mi, s] = m
  const date = new Date(
    Number(y),
    Number(mo) - 1,
    Number(d),
    Number(h ?? 0),
    Number(mi ?? 0),
    Number(s ?? 0),
  )
  return Number.isNaN(date.getTime()) ? undefined : date
}

const pad = (n: number, len = 2) => String(n).padStart(len, '0')

/** Собирает хранимую строку из Date: «yyyy-MM-dd» либо ISO с «Z» (скрытые разряды фиксируются в :00). */
function serialize(date: Date, time: boolean) {
  const ymd = `${pad(date.getFullYear(), 4)}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
  if (!time) return ymd
  return `${ymd}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}Z`
}

/** Подпись выбранной даты для триггера: формат (short/long) задаёт длину, наличие времени и секунд — нужны ли HH:mm(:ss). */
function display(
  date: Date,
  time: boolean,
  fmt: DateFormat,
  withSeconds: boolean,
) {
  const datePart = fmt === 'long' ? 'd MMMM yyyy' : 'dd.MM.yyyy'
  const timePart = time ? (withSeconds ? ' HH:mm:ss' : ' HH:mm') : ''
  return format(date, datePart + timePart, { locale: ru })
}

/** Переносит выбранный в календаре день на существующее значение, сохраняя его время (или 00:00:00, если значения ещё не было). */
function withDay(day: Date, base: Date | undefined) {
  const next = new Date(day)
  if (base) next.setHours(base.getHours(), base.getMinutes(), base.getSeconds())
  else next.setHours(0, 0, 0, 0)
  return next
}

type ShowParts = ReturnType<typeof resolveShow>

/** Ряд числовых полей времени (часы/минуты/секунды по show) для одного значения; меняет соответствующий компонент Date и отдаёт новый Date. */
function TimeRow({
  date,
  show,
  onChange,
  label,
}: {
  date: Date
  show: ShowParts
  onChange: (next: Date) => void
  label?: string
}) {
  const setPart = (part: 'h' | 'm' | 's', raw: string) => {
    const n = Number(raw)
    if (!Number.isInteger(n)) return
    const next = new Date(date)
    if (part === 'h') next.setHours(Math.min(23, Math.max(0, n)))
    if (part === 'm') next.setMinutes(Math.min(59, Math.max(0, n)))
    if (part === 's') next.setSeconds(Math.min(59, Math.max(0, n)))
    onChange(next)
  }
  return (
    <div className="flex items-center gap-1.5">
      {label ? (
        <span className="w-8 text-xs text-muted-foreground">{label}</span>
      ) : null}
      {show.hour ? (
        <Input
          type="number"
          min={0}
          max={23}
          className="h-8 w-14"
          value={date.getHours()}
          onChange={(e) => setPart('h', e.target.value)}
        />
      ) : null}
      {show.min ? (
        <>
          <span className="text-muted-foreground">:</span>
          <Input
            type="number"
            min={0}
            max={59}
            className="h-8 w-14"
            value={date.getMinutes()}
            onChange={(e) => setPart('m', e.target.value)}
          />
        </>
      ) : null}
      {show.sec ? (
        <>
          <span className="text-muted-foreground">:</span>
          <Input
            type="number"
            min={0}
            max={59}
            className="h-8 w-14"
            value={date.getSeconds()}
            onChange={(e) => setPart('s', e.target.value)}
          />
        </>
      ) : null}
    </div>
  )
}

/** Редактор одиночной даты: поповер с календарём (mode: single) и, при time:true, рядом полей времени по show. */
export function DateField({ path, field, invalid }: FieldComponentProps) {
  const handle = useField<string>(path)
  const time = field.time === true
  const show = resolveShow(field.show, time)
  const date = parseStored(handle.value)
  const [open, setOpen] = useState(false)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            type="button"
            variant="outline"
            className={cn(
              'w-full justify-start font-normal',
              !date && 'text-muted-foreground',
              invalid && 'text-destructive',
            )}
          />
        }
      >
        <CalendarIcon />
        {date
          ? display(date, time, field.format ?? 'short', show.sec)
          : 'Выберите дату'}
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          captionLayout="dropdown"
          startMonth={CALENDAR_START}
          endMonth={CALENDAR_END}
          selected={date}
          defaultMonth={date}
          locale={ru}
          autoFocus
          onSelect={(day) =>
            handle.set(day ? serialize(withDay(day, date), time) : null)
          }
        />
        {time && date ? (
          <div className="border-t p-3">
            <TimeRow
              date={date}
              show={show}
              onChange={(next) => handle.set(serialize(next, time))}
            />
          </div>
        ) : null}
      </PopoverContent>
    </Popover>
  )
}

/** Приводит хранимое значение диапазона к DateRange для календаря. */
function toRange(value: DateRangeValue | undefined) {
  if (!value) return undefined
  const from = parseStored(value.from)
  const to = parseStored(value.to)
  return from ? { from, to } : undefined
}

/** Редактор диапазона дат: поповер с календарём на два месяца (mode: range) и, при time:true, двумя рядами полей времени — для начала и конца. */
export function DateRangeField({ path, field, invalid }: FieldComponentProps) {
  const handle = useField<DateRangeValue>(path)
  const time = field.time === true
  const show = resolveShow(field.show, time)
  const [open, setOpen] = useState(false)
  const [range, setRange] = useState<DateRange | undefined>(() =>
    toRange(handle.value),
  )
  useEffect(() => setRange(toRange(handle.value)), [handle.value])

  const commit = (next: DateRange | undefined) => {
    setRange(next)
    if (next?.from && next.to)
      handle.set({
        from: serialize(next.from, time),
        to: serialize(next.to, time),
      })
    else if (!next?.from) handle.set(null)
  }

  const label =
    range?.from && range.to
      ? `${display(range.from, time, field.format ?? 'short', show.sec)} — ${display(range.to, time, field.format ?? 'short', show.sec)}`
      : range?.from
        ? `${display(range.from, time, field.format ?? 'short', show.sec)} — …`
        : 'Выберите период'

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            type="button"
            variant="outline"
            className={cn(
              'w-full justify-start font-normal',
              !range?.from && 'text-muted-foreground',
              invalid && 'text-destructive',
            )}
          />
        }
      >
        <CalendarIcon />
        {label}
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="range"
          numberOfMonths={2}
          captionLayout="dropdown"
          startMonth={CALENDAR_START}
          endMonth={CALENDAR_END}
          selected={range}
          defaultMonth={range?.from}
          locale={ru}
          autoFocus
          onSelect={commit}
        />
        {time && range?.from && range.to ? (
          <div className="flex flex-col gap-2 border-t p-3">
            <TimeRow
              date={range.from}
              show={show}
              label="С"
              onChange={(next) => commit({ from: next, to: range.to })}
            />
            <TimeRow
              date={range.to}
              show={show}
              label="По"
              onChange={(next) => commit({ from: range.from, to: next })}
            />
          </div>
        ) : null}
      </PopoverContent>
    </Popover>
  )
}
