import type { FieldKind, FieldMap } from '@jalyk/schema'
import {
  Button,
  cn,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@jalyk/ui'
import { PlusIcon, XIcon } from 'lucide-react'
import { Fragment, type ReactNode } from 'react'
import { useStudio } from '../data/context.tsx'
import { asIcon, type IconComponent } from '../data/react-bridge.tsx'
import { relationTargets } from '../data/list-query.ts'
import {
  emptyFilter,
  newCond,
  newGroup,
  useListState,
  type FilterCond,
  type FilterGroup,
  type FilterNode,
  type FilterOp,
  type FilterRel,
  type ListState,
  type RelQuantifier,
} from '../data/list-state.ts'

/** Скалярные виды полей и их операторы (сравнивалки). Отрицание задаётся отдельной кнопкой «!», поэтому «не равно» в списке нет. Реляции (одиночная ссылка или массив ссылок) раскрываются во вложенную группу по полям связанного документа. */
const OPS_BY_KIND = {
  string: ['contains', 'startsWith', 'equals'],
  number: ['equals', 'lt', 'lte', 'gt', 'gte'],
  boolean: ['equals'],
} as const satisfies Partial<Record<FieldKind, readonly FilterOp[]>>

type ScalarKind = keyof typeof OPS_BY_KIND

const OP_LABEL: Record<FilterOp, string> = {
  contains: 'содержит',
  startsWith: 'начинается с',
  equals: 'равно',
  lt: 'меньше',
  lte: 'меньше или равно',
  gt: 'больше',
  gte: 'больше или равно',
}

const QUANT_LABEL: Record<RelQuantifier, string> = {
  some: 'хотя бы один',
  every: 'все',
  none: 'ни один',
}

/** Доступное для фильтра поле: скаляр (со своими операторами) либо реляция (с типом целевого документа и признаком множественности для вложенной группы). */
type FilterableField = { key: string; title: string; icon?: IconComponent } & (
  | { kind: ScalarKind }
  | { kind: 'relation'; targets: string[]; multiple: boolean }
)

function isScalarKind(kind: FieldKind): kind is ScalarKind {
  return kind in OPS_BY_KIND
}

/** Поля документа, по которым доступен фильтр: скаляры и реляции (ссылка/массив ссылок). */
function filterableFields(fields: FieldMap): FilterableField[] {
  const result: FilterableField[] = []
  for (const [key, field] of Object.entries(fields)) {
    const title = field.title ?? key
    const icon = asIcon(field.icon)
    if (isScalarKind(field.kind)) {
      result.push({ key, title, icon, kind: field.kind })
      continue
    }
    const targets = relationTargets(field)
    if (targets)
      result.push({
        key,
        title,
        icon,
        kind: 'relation',
        targets,
        multiple: field.kind === 'array',
      })
  }
  return result
}

/** Значение по умолчанию нового условия по виду поля. */
function defaultValue(kind: ScalarKind): string | number | boolean {
  if (kind === 'number') return 0
  if (kind === 'boolean') return true
  return ''
}

/** Поиск узла и его родителя в древе (с заходом во вложенные группы реляций). */
function findNode(node: FilterNode, id: string): FilterNode | undefined {
  if (node.id === id) return node
  if (node.kind === 'group') {
    for (const child of node.children) {
      const found = findNode(child, id)
      if (found) return found
    }
  }
  if (node.kind === 'rel') return findNode(node.group, id)
  return undefined
}

function findParent(group: FilterGroup, id: string): FilterGroup | undefined {
  for (const child of group.children) {
    if (child.id === id) return group
    if (child.kind === 'group') {
      const found = findParent(child, id)
      if (found) return found
    }
    if (child.kind === 'rel') {
      const found = findParent(child.group, id)
      if (found) return found
    }
  }
  return undefined
}

/** Находит группу/условие/реляцию по id и применяет мутацию (immer-черновик). */
function mutateGroup(
  draft: ListState,
  id: string,
  recipe: (group: FilterGroup) => void,
) {
  const node = findNode(draft.filter, id)
  if (node?.kind === 'group') recipe(node)
}
function mutateCond(
  draft: ListState,
  id: string,
  recipe: (cond: FilterCond) => void,
) {
  const node = findNode(draft.filter, id)
  if (node?.kind === 'cond') recipe(node)
}
function mutateRel(
  draft: ListState,
  id: string,
  recipe: (rel: FilterRel) => void,
) {
  const node = findNode(draft.filter, id)
  if (node?.kind === 'rel') recipe(node)
}

/** Меняет поле условия: реляция → rel-узел с пустой вложенной группой, скаляр → cond-узел с подходящим оператором. Сохраняет id и место в родителе. */
function changeField(
  draft: ListState,
  id: string,
  key: string,
  fields: FilterableField[],
) {
  const parent = findParent(draft.filter, id)
  if (!parent) return
  const i = parent.children.findIndex((c) => c.id === id)
  if (i < 0) return
  const field = fields.find((f) => f.key === key)
  if (field?.kind === 'relation') {
    parent.children[i] = {
      kind: 'rel',
      id,
      field: key,
      target: field.targets[0] ?? '',
      quantifier: 'some',
      group: newGroup(),
    }
    return
  }
  // field здесь уже не реляция (ранний возврат выше), поэтому kind скалярный.
  const kind = field ? field.kind : 'string'
  const ops = OPS_BY_KIND[kind]
  const prev = parent.children[i]
  const not = prev?.kind === 'cond' ? prev.not : false
  parent.children[i] = {
    kind: 'cond',
    id,
    field: key,
    not,
    op: ops[0],
    value: defaultValue(kind),
  }
}

/** Сужает строку обратно к оператору нужного вида (значение Select — строка). */
function asOp(value: string, kind: ScalarKind): FilterOp {
  const ops = OPS_BY_KIND[kind]
  return (ops as readonly FilterOp[]).includes(value as FilterOp)
    ? (value as FilterOp)
    : ops[0]
}

function asQuantifier(value: string): RelQuantifier {
  return value === 'every' || value === 'none' ? value : 'some'
}

type SetState = ReturnType<typeof useListState>[1]

/** Рекурсивный редактор древа фильтров (как в Prisma): группы И/Или с условиями, вложенными группами и реляциями. Интерфейс строится из схемы документа. */
export function FilterBuilder({
  type,
  stateKey,
}: {
  type: string
  stateKey: string
}) {
  const { config } = useStudio()
  const fields = filterableFields(config.documents[type]?.fields ?? {})
  const [state, setState] = useListState(stateKey)

  if (fields.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">Нет полей для фильтрации.</p>
    )
  }

  return (
    <div className="thin-scrollbar flex max-h-96 flex-col gap-2 overflow-auto">
      <GroupEditor group={state.filter} fields={fields} setState={setState} />
      {state.filter.children.length > 0 ? (
        <Button
          size="sm"
          variant="ghost"
          className="self-start text-muted-foreground"
          onClick={() =>
            setState((draft) => void (draft.filter = emptyFilter()))
          }
        >
          Сбросить фильтр
        </Button>
      ) : null}
    </div>
  )
}

/** Группа условий: переключатель И/Или пилюлями над рамкой, внутри — строки. Любая группа может держать и условия, и вложенные группы вперемешку; «+» открывает меню «Условие» / «Группа». Оператор группы задаёт объединение детей (AND/OR). */
function GroupEditor({
  group,
  fields,
  setState,
  onRemove,
}: {
  group: FilterGroup
  fields: FilterableField[]
  setState: SetState
  onRemove?: () => void
}) {
  const setOp = (op: 'and' | 'or') =>
    setState((draft) => mutateGroup(draft, group.id, (g) => void (g.op = op)))
  const addCond = () =>
    setState((draft) =>
      mutateGroup(draft, group.id, (g) => void g.children.push(newCond())),
    )
  const addGroup = () =>
    setState((draft) =>
      mutateGroup(draft, group.id, (g) => void g.children.push(newGroup())),
    )
  const removeChild = (id: string) =>
    setState((draft) => {
      const parent = findParent(draft.filter, id)
      if (parent) parent.children = parent.children.filter((c) => c.id !== id)
    })

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-1">
        <div className="flex items-center">
          <PillButton
            active={group.op === 'and'}
            onClick={() => setOp('and')}
            className="rounded-r-none"
          >
            И
          </PillButton>
          <PillButton
            active={group.op === 'or'}
            onClick={() => setOp('or')}
            className="rounded-l-none border-l-0"
          >
            Или
          </PillButton>
        </div>
        {onRemove ? (
          <Button
            size="icon-sm"
            variant="ghost"
            aria-label="Удалить группу"
            className="ml-auto text-muted-foreground"
            onClick={onRemove}
          >
            <XIcon />
          </Button>
        ) : null}
      </div>

      <div className="flex flex-col gap-2 rounded-md border border-dashed p-2">
        {group.children.map((child, i) => (
          <Fragment key={child.id}>
            {i > 0 ? (
              <div className="text-xs font-medium uppercase text-muted-foreground">
                {group.op === 'or' ? 'или' : 'и'}
              </div>
            ) : null}
            {child.kind === 'group' ? (
              <div className="pl-2">
                <GroupEditor
                  group={child}
                  fields={fields}
                  setState={setState}
                  onRemove={() => removeChild(child.id)}
                />
              </div>
            ) : (
              <ConditionRow node={child} fields={fields} setState={setState} />
            )}
          </Fragment>
        ))}
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                size="icon-sm"
                variant="ghost"
                aria-label="Добавить"
                className="self-start text-muted-foreground"
              />
            }
          >
            <PlusIcon />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem onClick={addCond}>Условие</DropdownMenuItem>
            <DropdownMenuItem onClick={addGroup}>Группа</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}

/** Кнопка-пилюля переключателя И/Или (активная — залита). */
function PillButton({
  active,
  onClick,
  children,
  className,
}: {
  active: boolean
  onClick: () => void
  children: ReactNode
  className?: string
}) {
  return (
    <Button
      size="sm"
      variant={active ? 'default' : 'outline'}
      className={cn('h-7 px-3', className)}
      onClick={onClick}
    >
      {children}
    </Button>
  )
}

/** Строка одного условия: слева ✕ и выбор поля; справа — для скаляра кнопка «!», сравнивалка и значение, для реляции — квантификатор и вложенная группа по полям связанного документа. */
function ConditionRow({
  node,
  fields,
  setState,
}: {
  node: FilterCond | FilterRel
  fields: FilterableField[]
  setState: SetState
}) {
  const { config } = useStudio()

  const onField = (key: string) =>
    setState((draft) => changeField(draft, node.id, key, fields))
  const remove = () =>
    setState((draft) => {
      const parent = findParent(draft.filter, node.id)
      if (parent)
        parent.children = parent.children.filter((c) => c.id !== node.id)
    })

  const removeButton = (
    <Button
      size="icon-sm"
      variant="ghost"
      aria-label="Удалить условие"
      className="text-muted-foreground"
      onClick={remove}
    >
      <XIcon />
    </Button>
  )
  const fieldSelect = (
    <Select value={node.field} onValueChange={(value) => onField(value ?? '')}>
      <SelectTrigger size="sm" className="w-40">
        <SelectValue placeholder="Поле">
          {(value) => {
            const f = fields.find((f) => f.key === value)
            if (!f)
              return (
                <>
                  <span className="size-4" />
                  <span className="text-muted-foreground">Поле</span>
                </>
              )
            return (
              <>
                {f.icon ? (
                  <f.icon className="size-4 text-muted-foreground" />
                ) : (
                  <span className="size-4" />
                )}
                {f.title}
              </>
            )
          }}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {fields.map((f) => (
          <SelectItem key={f.key} value={f.key}>
            {f.icon ? (
              <f.icon className="size-4 text-muted-foreground" />
            ) : (
              <span className="size-4" />
            )}
            {f.title}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )

  if (node.kind === 'rel') {
    const field = fields.find((f) => f.key === node.field)
    const targets = field?.kind === 'relation' ? field.targets : []
    const target = targets.includes(node.target) ? node.target : targets[0]
    const targetFields = target
      ? filterableFields(config.documents[target]?.fields ?? {})
      : []
    // Смена типа цели меняет набор полей — вложенную группу сбрасываем.
    const setTarget = (value: string) =>
      setState((draft) =>
        mutateRel(
          draft,
          node.id,
          (r) => void ((r.target = value), (r.group = newGroup())),
        ),
      )
    return (
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          {removeButton}
          {fieldSelect}
          {targets.length > 1 ? (
            <Select
              value={target}
              onValueChange={(value) => value && setTarget(value)}
              items={Object.fromEntries(
                targets.map((t) => [t, config.documents[t]?.title ?? t]),
              )}
            >
              <SelectTrigger size="sm" className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {targets.map((t) => (
                  <SelectItem key={t} value={t}>
                    {config.documents[t]?.title ?? t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : null}
          <Select
            value={node.quantifier}
            onValueChange={(value) =>
              setState((draft) =>
                mutateRel(
                  draft,
                  node.id,
                  (r) => void (r.quantifier = asQuantifier(value ?? '')),
                ),
              )
            }
            items={QUANT_LABEL}
          >
            <SelectTrigger size="sm" className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(['some', 'every', 'none'] satisfies RelQuantifier[]).map(
                (q) => (
                  <SelectItem key={q} value={q}>
                    {QUANT_LABEL[q]}
                  </SelectItem>
                ),
              )}
            </SelectContent>
          </Select>
        </div>
        <div className="pl-6">
          {target ? (
            <GroupEditor
              group={node.group}
              fields={targetFields}
              setState={setState}
            />
          ) : (
            <p className="text-xs text-muted-foreground">
              У ссылки нет типа документа для фильтрации.
            </p>
          )}
        </div>
      </div>
    )
  }

  const field = fields.find((f) => f.key === node.field)
  const kind = field && field.kind !== 'relation' ? field.kind : undefined

  return (
    <div className="flex items-center gap-2">
      {removeButton}
      {fieldSelect}
      {kind ? (
        // Три контрола склеены в один сегмент: убираем зазор и скругления/границы на стыках.
        <div className="flex items-center">
          <Button
            size="icon-sm"
            variant={node.not ? 'default' : 'outline'}
            aria-label="Отрицание"
            title="Отрицание условия"
            className="rounded-r-none"
            onClick={() =>
              setState(
                (draft) =>
                  void mutateCond(draft, node.id, (c) => void (c.not = !c.not)),
              )
            }
          >
            !
          </Button>
          <Select
            value={node.op}
            onValueChange={(value) =>
              setState((draft) =>
                mutateCond(
                  draft,
                  node.id,
                  (c) => void (c.op = asOp(value ?? '', kind)),
                ),
              )
            }
            items={OP_LABEL}
          >
            <SelectTrigger
              size="sm"
              className="w-36 rounded-none border-l-0 data-[size=sm]:rounded-none"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {OPS_BY_KIND[kind].map((op) => (
                <SelectItem key={op} value={op}>
                  {OP_LABEL[op]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <CondValue node={node} kind={kind} setState={setState} />
        </div>
      ) : null}
    </div>
  )
}

/** Поле ввода значения по виду: булево — селект да/нет, число — числовой input, строка — текст. */
function CondValue({
  node,
  kind,
  setState,
}: {
  node: FilterCond
  kind: ScalarKind
  setState: SetState
}) {
  const patch = (recipe: (cond: FilterCond) => void) =>
    setState((draft) => mutateCond(draft, node.id, recipe))

  if (kind === 'boolean') {
    return (
      <Select
        value={String(node.value)}
        onValueChange={(value) =>
          patch((c) => void (c.value = value === 'true'))
        }
        items={{ true: 'да', false: 'нет' }}
      >
        <SelectTrigger
          size="sm"
          className="w-32 rounded-l-none border-l-0 data-[size=sm]:rounded-l-none"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="true">да</SelectItem>
          <SelectItem value="false">нет</SelectItem>
        </SelectContent>
      </Select>
    )
  }
  if (kind === 'number') {
    return (
      <Input
        type="number"
        className="h-7 w-40 rounded-l-none border-l-0"
        value={typeof node.value === 'number' ? node.value : ''}
        onChange={(e) =>
          patch(
            (c) =>
              void (c.value =
                e.target.value === '' ? 0 : Number(e.target.value)),
          )
        }
      />
    )
  }
  return (
    <Input
      className="h-7 w-56 rounded-l-none border-l-0"
      placeholder="поиск"
      value={typeof node.value === 'string' ? node.value : String(node.value)}
      onChange={(e) => patch((c) => void (c.value = e.target.value))}
    />
  )
}
