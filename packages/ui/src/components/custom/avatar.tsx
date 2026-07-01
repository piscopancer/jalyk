import * as React from 'react'
import { cn } from '../../lib/cn.ts'

// Аватарки участников — чистая презентация: компонент ничего не знает о данных,
// принимает готовых людей пропсами. Используется и в тулбаре студии (стопка
// присутствующих), и на сайте (подвал карточки проекта).

/** Минимум, который нужен аватарке: стабильный id (из него цвет), имя (первая
 * буква плейсхолдера) и, опционально, картинка. */
export type AvatarUser = {
  id: string
  name: string
  /** URL аватарки; если нет — рисуем кружок с первой буквой имени. */
  image?: string | null
}

/** Детерминированный приглушённый HSL-цвет из id: один id всегда даёт один цвет —
 * фон плейсхолдера аватарки либо обводку, если аватарка есть. */
export function colorFromId(id: string) {
  let hash = 0
  for (let i = 0; i < id.length; i++) {
    hash = (Math.imul(hash, 31) + id.charCodeAt(i)) | 0
  }
  const hue = ((hash % 360) + 360) % 360
  return `hsl(${hue} 30% 55%)`
}

/** Кружок участника фиксированного размера. У фото: 1px тёмная обводка вплотную к
 * снимку, затем цветной контур из id, чтобы цвет не сливался с фото. Без фото:
 * фон того же цвета и первая буква имени. */
export function Avatar({
  user,
  className,
}: {
  user: AvatarUser
  className?: string
}) {
  const color = colorFromId(user.id)
  const initial = user.name.trim().slice(0, 1).toUpperCase()
  return (
    <span
      title={user.name}
      style={{
        outlineColor: color,
        ...(user.image ? null : { backgroundColor: color }),
      }}
      className={cn(
        'relative inline-flex size-6 shrink-0 items-center justify-center overflow-hidden rounded-full text-[0.625rem] font-medium text-white outline outline-2 select-none',
        user.image && 'border border-black/40',
        className,
      )}
    >
      {user.image ? (
        <img
          src={user.image}
          alt={user.name}
          className="size-full object-cover"
          referrerPolicy="no-referrer"
        />
      ) : (
        initial
      )}
    </span>
  )
}

/** Наезжающая стопка аватарок: первые `max` показываются кружками внахлёст, лишние
 * сворачиваются в «+N». Порядок людей — как передали. */
export function AvatarStack({
  users,
  max = 5,
  className,
}: {
  users: AvatarUser[]
  max?: number
  className?: string
}) {
  const shown = users.slice(0, max)
  const extra = users.length - shown.length
  return (
    <span className={cn('flex items-center', className)}>
      {shown.map((user, index) => (
        <span
          key={user.id}
          className={cn(
            'relative flex rounded-full bg-background p-1',
            index > 0 && '-ml-4',
          )}
          style={{ zIndex: shown.length - index }}
        >
          <Avatar user={user} />
        </span>
      ))}
      {extra > 0 ? (
        <span className="ml-1 text-xs font-medium text-muted-foreground">
          +{extra}
        </span>
      ) : null}
    </span>
  )
}
