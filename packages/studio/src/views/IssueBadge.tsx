import { worstSeverity, type Issue } from '@jalyk/schema'
import { cn } from '@jalyk/ui'
import { CircleAlertIcon, TriangleAlertIcon } from 'lucide-react'

/** Значок замечаний валидации: красный круг при error, жёлтый треугольник при warning; тексты — в подсказке. Пусто → ничего. */
export function IssueBadge({ issues, className }: { issues: readonly Issue[]; className?: string }) {
  const worst = worstSeverity(issues)
  if (!worst) return null
  const Icon = worst === 'error' ? CircleAlertIcon : TriangleAlertIcon
  return (
    <span title={issues.map((i) => i.message).join('\n')} className={cn('inline-flex', className)}>
      <Icon className={cn('size-4 shrink-0', worst === 'error' ? 'text-destructive' : 'text-yellow-600')} />
    </span>
  )
}
