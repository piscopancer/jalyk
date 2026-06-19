import type { DefaultHeaderData } from '@jalyk/schema'
import { asIcon, type HeaderProps } from '../data/react-bridge.tsx'
import { FieldMenu } from './FieldMenu.tsx'

// Заголовок поля по умолчанию: подпись с иконкой и меню-троеточием плюс описание
// под ней. Рисует предопределённые данные (DefaultHeaderData); если разработчик
// задал полю свой headerComponent, студия берёт его вместо этого (см. FieldInput).
export function DefaultHeader({ path, field, header }: HeaderProps<DefaultHeaderData>) {
  const Icon = asIcon(header.icon)
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
