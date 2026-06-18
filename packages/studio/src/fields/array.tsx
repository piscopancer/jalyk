import type { AnyField } from '@jalyk/schema'
import { Button, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@jalyk/ui'
import { Plus, Trash2 } from 'lucide-react'
import { useField } from '../data/field.ts'
import { FieldEditor } from './FieldInput.tsx'
import type { FieldComponentProps } from './registry.tsx'

// Имя члена — то, что пишется в служебное `_type` элемента разнотипного массива
// (для выбора редактора). По умолчанию это kind члена.
function memberName(member: AnyField): string {
  return member.name ?? member.kind
}

// Список членов массива: однородный (of — одно описание) или разнотипный (of —
// массив описаний).
function membersOf(field: AnyField): AnyField[] {
  if (Array.isArray(field.of)) return [...field.of]
  return field.of ? [field.of as AnyField] : []
}

// Дефолтное значение нового элемента данного члена.
function memberDefault(member: AnyField): unknown {
  if (member.default !== undefined) return member.default
  if (member.kind === 'object') return {}
  if (member.kind === 'array') return []
  return undefined
}

// Стабильный ключ элемента. crypto.randomUUID доступен только в secure context, а
// студия открывается по http через LAN-IP, поэтому держим запасной генератор.
function newKey(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    try {
      return crypto.randomUUID()
    } catch {
      // ниже — запасной вариант
    }
  }
  return `${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`
}

// Редактор массива. Правки полей внутри элементов идут точечно по пути
// [...path, индекс, …] через дочерние редакторы (FieldEditor), а структурные
// операции (добавить/удалить) переписывают массив целиком. В разнотипном массиве
// элементы получают _type (имя члена) и _key; редактор элемента выбирается по
// _type. В однородном массиве член один и служебные поля не добавляются.
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
      ? { _type: memberName(member), _key: newKey(), ...(base && typeof base === 'object' ? base : {}) }
      : base
    handle.set([...items, item])
  }

  const removeAt = (index: number) => {
    handle.set(items.filter((_, i) => i !== index))
  }

  return (
    <div className="flex flex-col gap-2">
      {items.map((item, index) => {
        const member = memberFor(item)
        const reactKey = (item as { _key?: string } | null)?._key ?? index
        return (
          <div key={reactKey} className="flex gap-2 rounded-md border p-3">
            <div className="min-w-0 flex-1">
              {member ? <FieldEditor path={[...path, String(index)]} field={member} /> : null}
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Удалить элемент"
              className="shrink-0 text-muted-foreground"
              onClick={() => removeAt(index)}
            >
              <Trash2 />
            </Button>
          </div>
        )
      })}
      {members.length <= 1 ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="self-start"
          disabled={!members[0]}
          onClick={() => members[0] && add(members[0])}
        >
          <Plus /> Добавить
        </Button>
      ) : (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button type="button" variant="outline" size="sm" className="self-start">
              <Plus /> Добавить
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            {members.map((member) => (
              <DropdownMenuItem key={memberName(member)} onSelect={() => add(member)}>
                {member.title ?? memberName(member)}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  )
}
