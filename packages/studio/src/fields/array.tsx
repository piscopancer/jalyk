import type { AnyField } from '@jalyk/schema'
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Input,
  cn,
} from '@jalyk/ui'
import { GripVerticalIcon, MinusIcon, PlusIcon, SearchIcon } from 'lucide-react'
import { useField } from '../data/field.ts'
import { FieldEditor } from './FieldInput.tsx'
import type { FieldComponentProps } from './registry.tsx'

/** Имя члена — то, что пишется в служебное `_type` элемента разнотипного массива (для выбора редактора). По умолчанию это kind члена. */
function memberName(member: AnyField): string {
  return member.name ?? member.kind
}

/** Список членов массива: однородный (of — одно описание) или разнотипный (of — массив описаний). */
function membersOf(field: AnyField): AnyField[] {
  if (Array.isArray(field.of)) return [...field.of]
  return field.of ? [field.of as AnyField] : []
}

/** Дефолтное значение нового элемента данного члена. */
function memberDefault(member: AnyField): unknown {
  if (member.default !== undefined) return member.default
  if (member.kind === 'object') return {}
  if (member.kind === 'array') return []
  return undefined
}

/** Стабильный ключ элемента. crypto.randomUUID доступен только в secure context, а студия открывается по http через LAN-IP, поэтому держим запасной генератор. */
function newKey(): string {
  if (
    typeof crypto !== 'undefined' &&
    typeof crypto.randomUUID === 'function'
  ) {
    try {
      return crypto.randomUUID()
    } catch {
      // ниже — запасной вариант
    }
  }
  return `${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`
}

/** Редактор массива. Правки полей внутри элементов идут точечно по пути [...path, индекс, …] через дочерние редакторы (FieldEditor), а структурные операции (добавить/удалить) переписывают массив целиком. В разнотипном массиве элементы получают _type (имя члена) и _key; редактор элемента выбирается по _type. В однородном массиве член один и служебные поля не добавляются. */
export function ArrayField({ path, field }: FieldComponentProps) {
  const handle = useField<unknown[]>(path)
  const items = Array.isArray(handle.value) ? handle.value : []
  const members = membersOf(field)
  const heterogeneous = Array.isArray(field.of)

  const memberFor = (item: unknown): AnyField | undefined => {
    if (!heterogeneous) return members[0]
    const type = (item as { _type?: string } | null)?._type
    return members.find((m) => memberName(m) === type) ?? members[0]
  }

  const add = (member: AnyField) => {
    const base = memberDefault(member)
    const item = heterogeneous
      ? {
          _type: memberName(member),
          _key: newKey(),
          ...(base && typeof base === 'object' ? base : {}),
        }
      : base
    handle.set([...items, item])
  }

  const removeAt = (index: number) => {
    handle.set(items.filter((_, i) => i !== index))
  }

  return (
    <div className="overflow-hidden rounded-md border">
      <div className="border-b">
        {field.search ? (
          <div className="relative p-2 pb-1">
            <SearchIcon className="pointer-events-none absolute left-4 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              // Визуальный поиск без фильтрации: у элемента массива нет известного студии текста-заголовка, искать пока не по чему.
              placeholder="Поиск"
              className="h-7 w-full pl-7"
            />
          </div>
        ) : null}
        <div className="px-2 py-1.5 text-right text-xs text-muted-foreground">
          Всего: {items.length}
        </div>
      </div>
      <div className={cn('divide-y', items.length > 0 && 'border-b')}>
        {items.map((item, index) => {
          const member = memberFor(item)
          const reactKey = (item as { _key?: string } | null)?._key ?? index
          return (
            <div key={reactKey} className="flex items-stretch">
              <div
                // Заглушка перетаскивания: ручка нарисована, но dnd ещё не реализован — поэтому без действия и без hover-подсветки кнопки.
                aria-hidden
                className="flex w-7 shrink-0 cursor-grab items-center justify-center border-r text-muted-foreground"
              >
                <GripVerticalIcon className="size-4" />
              </div>
              <div className="min-w-0 flex-1 p-2">
                {member ? (
                  <FieldEditor path={[...path, String(index)]} field={member} />
                ) : null}
              </div>
              <button
                type="button"
                aria-label="Удалить элемент"
                className="flex w-7 shrink-0 items-center justify-center border-l text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                onClick={() => removeAt(index)}
              >
                <MinusIcon className="size-4" />
              </button>
            </div>
          )
        })}
      </div>
      {members.length <= 1 ? (
        <Button
          type="button"
          variant="ghost"
          className="w-full justify-center rounded-none"
          disabled={!members[0]}
          onClick={() => members[0] && add(members[0])}
        >
          <PlusIcon /> Добавить
        </Button>
      ) : (
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                type="button"
                variant="ghost"
                className={cn(
                  'w-full justify-center rounded-none',
                  items.length > 0 && 'border-t border-t-border',
                )}
              />
            }
          >
            <PlusIcon /> Добавить
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            {members.map((member) => (
              <DropdownMenuItem
                key={memberName(member)}
                onClick={() => add(member)}
              >
                {member.title ?? memberName(member)}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  )
}
