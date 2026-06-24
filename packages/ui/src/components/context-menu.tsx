import * as React from 'react'
import { ContextMenu as ContextMenuPrimitive } from '@base-ui/react/context-menu'

import { cn } from '../lib/cn.ts'
import { usePortalContainer } from '../lib/portal-container.tsx'

/**
 * Контекстное меню по правому клику. Построено на base-ui context-menu, который
 * переиспользует те же части, что и обычное меню (Item, Separator, Group и т.д.),
 * отличаясь лишь корнем и триггером — позиционируется у курсора. Поэтому пункты
 * берутся из dropdown-menu без дублирования стилей: ContextMenuItem и компания —
 * это те же DropdownMenu-примитивы, реэкспортированные под именами ContextMenu*.
 */
function ContextMenu({ ...props }: ContextMenuPrimitive.Root.Props) {
  return <ContextMenuPrimitive.Root data-slot="context-menu" {...props} />
}

function ContextMenuTrigger({ ...props }: ContextMenuPrimitive.Trigger.Props) {
  return (
    <ContextMenuPrimitive.Trigger data-slot="context-menu-trigger" {...props} />
  )
}

function ContextMenuContent({
  className,
  ...props
}: ContextMenuPrimitive.Popup.Props) {
  const container = usePortalContainer()
  return (
    <ContextMenuPrimitive.Portal container={container}>
      <ContextMenuPrimitive.Positioner className="isolate z-50 outline-none">
        <ContextMenuPrimitive.Popup
          data-slot="context-menu-content"
          className={cn(
            'z-50 max-h-(--available-height) w-fit max-w-(--available-width) min-w-32 origin-(--transform-origin) overflow-x-hidden overflow-y-auto rounded-lg bg-popover p-1 text-popover-foreground shadow-md ring-1 ring-foreground/10 duration-100 outline-none data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:overflow-hidden data-closed:fade-out-0 data-closed:zoom-out-95',
            className,
          )}
          {...props}
        />
      </ContextMenuPrimitive.Positioner>
    </ContextMenuPrimitive.Portal>
  )
}

export { ContextMenu, ContextMenuTrigger, ContextMenuContent }

// Пункты, разделители и группы идентичны меню — переиспользуем их стили.
export {
  DropdownMenuItem as ContextMenuItem,
  DropdownMenuItemRow as ContextMenuItemRow,
  DropdownMenuSeparator as ContextMenuSeparator,
  DropdownMenuGroup as ContextMenuGroup,
  DropdownMenuLabel as ContextMenuLabel,
} from './dropdown-menu.tsx'
