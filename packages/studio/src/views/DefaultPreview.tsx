import type { DefaultPreviewData } from '@jalyk/schema'
import type { PreviewProps } from '../data/react-bridge.tsx'

/** Превью документа по умолчанию: иконка слева, заголовок и (если есть) описание справа. Иконка/заголовок/описание приходят уже вычисленными из схемы как ReactNode (см. DocumentRow). Если документу задан свой previewComponent, студия берёт его вместо этого компонента. */
export function DefaultPreview({
  icon,
  title,
  description,
}: PreviewProps<unknown, DefaultPreviewData>) {
  return (
    <div className="flex items-center gap-2.5">
      {icon ? (
        <span className="shrink-0 text-muted-foreground">{icon}</span>
      ) : null}
      <div className="flex min-w-0 flex-col">
        <span className="truncate">{title}</span>
        {description ? (
          <span className="truncate text-xs text-muted-foreground">
            {description}
          </span>
        ) : null}
      </div>
    </div>
  )
}
