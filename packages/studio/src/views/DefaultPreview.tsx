import type { PreviewComponentProps } from '@jalyk/schema'
import type { ReactNode } from 'react'

// Превью документа по умолчанию: иконка слева, заголовок и (если есть) описание
// справа. Иконка/заголовок/описание приходят уже вычисленными из схемы (см.
// DocumentRow); типы из схемы широкие (без React), поэтому трактуем их как
// ReactNode. Если документу задан свой previewComponent, студия берёт его вместо
// этого компонента.
export function DefaultPreview({ icon, title, description }: PreviewComponentProps) {
  return (
    <div className="flex items-center gap-2.5">
      {icon ? <span className="shrink-0 text-muted-foreground">{icon as ReactNode}</span> : null}
      <div className="flex min-w-0 flex-col">
        <span className="truncate">{title as ReactNode}</span>
        {description ? <span className="truncate text-xs text-muted-foreground">{description as ReactNode}</span> : null}
      </div>
    </div>
  )
}
