import { worstSeverity, type Issue } from '@jalyk/schema'
import {
  Button,
  Popover,
  PopoverContent,
  PopoverTrigger,
  cn,
} from '@jalyk/ui'
import {
  CircleAlertIcon,
  PencilIcon,
  TriangleAlertIcon,
  type LucideIcon,
} from 'lucide-react'
import { useState } from 'react'
import { useStudio } from '../data/context.tsx'
import { useDocumentContext } from '../data/document.tsx'
import {
  CollapseDefaultProvider,
  CollapseProvider,
} from '../data/field-collapse.tsx'
import { changedLeafPaths, pathLabel, resolveField } from '../data/field-paths.ts'
import { useDocument } from '../data/hooks.ts'
import { statusColor, type FieldStatus } from '../data/status-color.ts'
import { useDocumentValidation } from '../data/validation.tsx'
import { FieldInput } from '../fields/FieldInput.tsx'

/** Иконка и подпись каждого состояния документа в фильтре панели; цвет берётся из общей палитры statusColor. */
const filters = {
  changed: { icon: PencilIcon, label: 'Изменённые' },
  error: { icon: CircleAlertIcon, label: 'Ошибки' },
  warning: { icon: TriangleAlertIcon, label: 'Предупреждения' },
} as const satisfies Record<FieldStatus, { icon: LucideIcon; label: string }>

const order = ['changed', 'error', 'warning'] as const satisfies readonly FieldStatus[]

/** Запись поля в панели: путь и набор его состояний — поле попадает в список, если включён хотя бы один из них. */
type Entry = { path: readonly string[] } & Record<FieldStatus, boolean>

/** Собирает поля документа по состояниям: изменённые листья из сравнения черновика с published, ошибки/предупреждения — из путей замечаний валидации. Дедуплицирует по пути, объединяя состояния. */
function collectEntries(
  changed: readonly (readonly string[])[],
  issues: readonly Issue[],
) {
  const byKey = new Map<string, Entry>()
  const ensure = (path: readonly string[]) => {
    const key = path.join(' ')
    const found = byKey.get(key)
    if (found) return found
    const created: Entry = { path, changed: false, error: false, warning: false }
    byKey.set(key, created)
    return created
  }
  for (const path of changed) ensure(path).changed = true
  for (const issue of issues)
    if (issue.path) ensure(issue.path)[issue.severity] = true
  return [...byKey.values()]
}

/** Иконка-триггер состояния документа: цвет худшего замечания, либо синяя при наличии лишь изменений. null — чистый опубликованный документ. */
function triggerLook(worst: ReturnType<typeof worstSeverity>, hasChanged: boolean) {
  if (worst) return { icon: filters[worst].icon, color: statusColor[worst] }
  if (hasChanged) return { icon: filters.changed.icon, color: statusColor.changed }
  return null
}

/** Панель состояния документа: иконка-триггер открывает поповер с колонкой фильтров (изменено/ошибка/предупреждение, все включены) и списком подходящих полей. Каждое поле — обычный FieldInput, изначально свёрнутый. Живёт внутри провайдеров документа (DocumentActions), поэтому полям доступен их контекст. */
export function DocumentStatePanel() {
  const { config } = useStudio()
  const { id, type } = useDocumentContext()
  const doc = useDocument(id)
  const { issues } = useDocumentValidation()
  const [enabled, setEnabled] = useState<Record<FieldStatus, boolean>>({
    changed: true,
    error: true,
    warning: true,
  })

  const fields = config.documents[type]?.fields ?? {}
  const draft = doc.data?.draft
  const changed = changedLeafPaths(fields, draft, doc.data?.published)
  const entries = collectEntries(changed, issues)

  const look = triggerLook(worstSeverity(issues), changed.length > 0)
  if (!look) return null
  const Trigger = look.icon

  const counts = (state: FieldStatus) =>
    entries.filter((entry) => entry[state]).length
  const visible = entries.filter((entry) =>
    order.some((state) => entry[state] && enabled[state]),
  )

  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button
            size="icon-sm"
            variant="ghost"
            aria-label="Состояние документа"
          />
        }
      >
        <Trigger className="size-4" style={{ color: look.color }} />
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="flex h-[32rem] w-[30rem] flex-row gap-4 p-4"
      >
        <div className="flex shrink-0 flex-col gap-1">
          {order.map((state) => {
            const { icon: Icon, label } = filters[state]
            const on = enabled[state]
            return (
              <button
                key={state}
                type="button"
                aria-pressed={on}
                title={label}
                onClick={() =>
                  setEnabled((prev) => ({ ...prev, [state]: !prev[state] }))
                }
                className={cn(
                  'flex flex-col items-center gap-0.5 rounded-md px-2 py-1.5 transition-colors hover:bg-muted',
                  !on && 'opacity-40',
                )}
              >
                <Icon className="size-4" style={{ color: statusColor[state] }} />
                <span className="text-[10px] tabular-nums text-muted-foreground">
                  {counts(state)}
                </span>
              </button>
            )
          })}
        </div>
        <div className="thin-scrollbar -mr-2 flex min-w-0 flex-1 flex-col gap-4 overflow-y-auto pr-2">
          {visible.length === 0 ? (
            <span className="text-sm text-muted-foreground">Нет полей</span>
          ) : (
            <CollapseDefaultProvider value={true}>
              <CollapseProvider>
                {visible.map((entry) => {
                  const field = resolveField(fields, entry.path, draft)
                  if (!field) return null
                  return (
                    <FieldInput
                      key={entry.path.join(' ')}
                      path={entry.path}
                      field={field}
                      header={{ title: pathLabel(fields, entry.path, draft) }}
                    />
                  )
                })}
              </CollapseProvider>
            </CollapseDefaultProvider>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
