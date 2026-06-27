import type { DefaultHeaderData } from '@jalyk/schema'
import { cn } from '@jalyk/ui'
import { ChevronRightIcon } from 'lucide-react'
import { useFieldCollapsed, useToggleCollapse } from '../data/field-collapse.tsx'
import { DynamicIcon, type HeaderProps } from '../data/react-bridge.tsx'
import { useFieldIssues } from '../data/validation.tsx'
import { IssueBadge } from '../views/IssueBadge.tsx'
import { FieldMenu } from './FieldMenu.tsx'

/** Заголовок поля по умолчанию: подпись с иконкой и меню-троеточием плюс описание под ней. Рисует предопределённые данные (DefaultHeaderData); если разработчик задал полю свой headerComponent, студия берёт его вместо этого (см. FieldInput). */
export function DefaultHeader({
  path,
  field,
  header,
}: HeaderProps<DefaultHeaderData>) {
  const issues = useFieldIssues(path)
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 text-sm font-medium">
          <CollapseChevron path={path} />
          <DynamicIcon
            icon={header.icon}
            className="size-4 text-muted-foreground"
          />
          {header.title}
          <IssueBadge issues={issues} />
        </span>
        <FieldMenu path={path} field={field} />
      </div>
      {header.description ? (
        <span className="text-xs text-muted-foreground">
          {header.description}
        </span>
      ) : null}
    </div>
  )
}

/** Шеврон сворачивания поля: подписан на состояние своего пути, поэтому переключение перерисовывает только его, а не заголовок целиком. */
function CollapseChevron({ path }: { path: readonly string[] }) {
  const collapsed = useFieldCollapsed(path)
  const toggle = useToggleCollapse(path)
  return (
    <button
      type="button"
      aria-label={collapsed ? 'Развернуть поле' : 'Свернуть поле'}
      aria-expanded={!collapsed}
      onClick={toggle}
      className="-ml-0.5 text-muted-foreground/50 transition-colors hover:text-muted-foreground"
    >
      <ChevronRightIcon
        className={cn('size-4 transition-transform', !collapsed && 'rotate-90')}
      />
    </button>
  )
}
