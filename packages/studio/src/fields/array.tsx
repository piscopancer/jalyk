import type { AnyField } from '@jalyk/schema'
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  restrictToParentElement,
  restrictToVerticalAxis,
} from '@dnd-kit/modifiers'
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
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
import { useEffect, useState, type CSSProperties, type ReactNode } from 'react'
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

/** Сортируемая строка списка (dnd-kit). Двигается сама: трансформ-сдвиг за курсором плюс transition для плавного расступания соседей и доезда на место при отпускании. listeners навешены только на ручку-грипп, чтобы тащить за неё, а не за всю строку с полями. id стабилен и переезжает вместе с элементом (позиционные ключи в ArrayField), поэтому повторной анимации после коммита нового порядка не возникает. */
function SortableRow({
  id,
  children,
  onRemove,
  draggable,
}: {
  id: string
  children: ReactNode
  onRemove: () => void
  /** Можно ли перетаскивать строку. Для массива из одного элемента ручка выключена — двигать нечего. */
  draggable: boolean
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id, disabled: !draggable })
  // Только сдвиг (Translate), без Transform: при разной высоте элементов dnd-kit иначе подмешивает scaleX/scaleY и строка вытягивается под размер соседней.
  const style: CSSProperties = {
    transform: CSS.Translate.toString(transform),
    transition,
  }
  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'flex items-stretch bg-background',
        isDragging && 'relative z-10 opacity-80',
      )}
    >
      <button
        type="button"
        aria-label="Перетащить"
        disabled={!draggable}
        className="flex w-7 shrink-0 cursor-grab touch-none items-center justify-center border-r text-muted-foreground transition-colors hover:bg-muted hover:text-foreground active:cursor-grabbing disabled:cursor-default disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-muted-foreground"
        {...attributes}
        {...listeners}
      >
        <GripVerticalIcon className="size-4" />
      </button>
      <div className="min-w-0 flex-1 p-2">{children}</div>
      <button
        type="button"
        aria-label="Удалить элемент"
        className="flex w-7 shrink-0 items-center justify-center border-l text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        onClick={onRemove}
      >
        <MinusIcon className="size-4" />
      </button>
    </div>
  )
}

/** Редактор массива. Правки полей внутри элементов идут точечно по пути [...path, индекс, …] через дочерние редакторы (FieldEditor), а структурные операции (добавить/удалить/переставить) переписывают массив целиком. В разнотипном массиве элементы получают _type (имя члена) и _key; редактор элемента выбирается по _type. В однородном массиве член один и служебные поля не добавляются. */
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

  // Стабильная идентичность строк для dnd-id и React-ключа: позиционные ключи, которые
  // переезжают вместе с элементами при перетаскивании (см. onDragEnd). Контентные id
  // (_ref/_key) не годятся, когда в массиве есть ещё не заполненные ссылки
  // (undefined/null) — у них нет своего id, и индекс-фолбэк менялся бы при перестановке,
  // из-за чего соседняя заполненная ссылка и пустая «прыгали» местами. Длину
  // синхронизируем с items (добавление/удаление откуда угодно), порядок ведём сами.
  const [keys, setKeys] = useState<string[]>(() => items.map(() => newKey()))
  useEffect(() => {
    setKeys((prev) => {
      if (prev.length === items.length) return prev
      const next = prev.slice(0, items.length)
      while (next.length < items.length) next.push(newKey())
      return next
    })
  }, [items.length])
  const ids = keys

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  )

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const from = ids.indexOf(String(active.id))
    const to = ids.indexOf(String(over.id))
    if (from === -1 || to === -1) return
    // Ключи переставляем вместе с элементами — идентичность строки едет за её содержимым.
    setKeys((prev) => arrayMove(prev, from, to))
    handle.set(arrayMove(items, from, to))
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
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        modifiers={[restrictToVerticalAxis, restrictToParentElement]}
        onDragEnd={onDragEnd}
      >
        <SortableContext items={ids} strategy={verticalListSortingStrategy}>
          <div className={cn('divide-y', items.length > 0 && 'border-b')}>
            {items.map((item, index) => {
              const member = memberFor(item)
              const id = ids[index] ?? String(index)
              return (
                <SortableRow
                  key={id}
                  id={id}
                  draggable={items.length > 1}
                  onRemove={() => removeAt(index)}
                >
                  {member ? (
                    <FieldEditor
                      path={[...path, String(index)]}
                      field={member}
                    />
                  ) : null}
                </SortableRow>
              )
            })}
          </div>
        </SortableContext>
      </DndContext>
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
