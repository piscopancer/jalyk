import type { DefaultHeaderData, HeaderComponentProps } from '@jalyk/schema'
import type { ComponentType } from 'react'
import { FieldMenu } from './FieldMenu.tsx'

// Заголовок поля по умолчанию: подпись с иконкой и меню-троеточием плюс описание
// под ней. Рисует предопределённые данные (DefaultHeaderData); если разработчик
// задал полю свой headerComponent, студия берёт его вместо этого (см. FieldInput).
// Иконка из схемы приходит широким типом (FieldIcon = unknown) — трактуем её как
// компонент в духе иконок lucide.
export function DefaultHeader({ path, field, header }: HeaderComponentProps<DefaultHeaderData>) {
  const Icon = header.icon as ComponentType<{ className?: string }> | undefined
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 text-sm font-medium">
          {Icon ? <Icon className="size-4 text-muted-foreground" /> : null}
          {header.title}
          {field.required ? <span className="text-destructive"> *</span> : null}
        </span>
        <FieldMenu path={path} field={field} />
      </div>
      {header.description ? <span className="text-xs text-muted-foreground">{header.description}</span> : null}
    </div>
  )
}
