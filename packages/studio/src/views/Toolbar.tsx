import type { ProjectBadgeComponentProps } from '@jalyk/schema'
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuItemRow,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@jalyk/ui'
import { BoxIcon, ExternalLinkIcon, SettingsIcon, UserIcon } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { useStudio } from '../data/context.tsx'
import { usePresence } from '../data/presence.ts'
import { asComponent, DynamicIcon } from '../data/react-bridge.tsx'
import { JALYK_SITE_URL } from '../data/site.ts'
import { Avatar, OnlineUsers } from './Presence.tsx'
import { SettingsDialog } from './SettingsDialog.tsx'

// Верхний тулбар студии (см. схему): слева бейдж проекта и шестерёнка настроек,
// по центру слот под кастомные элементы из конфига (defineToolbar), справа
// presence-дропдаун (пока заглушка — данных о присутствии нет) и аккаунт со
// ссылкой на ЛК. Тариф также заглушка до появления данных на сервере.

/** Бейдж проекта: иконка и имя из config.project. Имя и иконку переопределяет defineProjectBadge, весь рендер — defineProjectBadgeComponent (project.badgeComponent). */
function ProjectBadge() {
  const { config } = useStudio()
  const project = config.project
  const name = project?.name ?? 'Проект'
  const iconNode: ReactNode = (
    <DynamicIcon icon={project?.icon} fallback={BoxIcon} className="size-4" />
  )
  const Custom = asComponent<ProjectBadgeComponentProps<ReactNode>>(
    project?.badgeComponent,
  )
  if (Custom) return <>{Custom({ name, icon: iconNode })}</>
  return (
    <div className="flex h-8 items-center gap-2 rounded-lg border px-2.5">
      {iconNode}
      <span className="text-sm font-medium">{name}</span>
    </div>
  )
}

/** Слот под кастомные элементы тулбара из config.toolbar (defineToolbar). Пусто — слот не рисуется. */
function ToolbarSlot() {
  const { config } = useStudio()
  const items = config.toolbar ?? []
  if (items.length === 0) return null
  return (
    <div className="flex min-w-0 items-center gap-2">
      {items.map((item) => {
        const Item = asComponent<Record<string, never>>(item.component)
        return Item ? <span key={item.key}>{Item({})}</span> : null
      })}
    </div>
  )
}

/** Дропдаун аккаунта: триггер — мой аватар (я обрабатываюсь как обычный участник присутствия). Рабочая ссылка на ЛК Jalyk; тариф — заглушка до данных о плане. */
function AccountMenu() {
  const { users, meId } = usePresence()
  const me = users.find((user) => user.id === meId)
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full"
            aria-label="Аккаунт"
          />
        }
      >
        {me ? <Avatar user={me} /> : <UserIcon />}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-52">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Тариф</DropdownMenuLabel>
          <DropdownMenuItem disabled>
            Информация о плане появится позже
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          nativeButton={false}
          render={
            <a
              href={JALYK_SITE_URL}
              target="_blank"
              rel="noreferrer noopener"
            />
          }
        >
          <DropdownMenuItemRow icon={<ExternalLinkIcon />}>
            Личный кабинет
          </DropdownMenuItemRow>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/** Верхняя панель управления студией. Монтируется в StudioShell над лейаутом. */
export function Toolbar() {
  const [settingsOpen, setSettingsOpen] = useState(false)
  return (
    <div className="flex h-12 shrink-0 items-center gap-2 border-b px-2">
      <ProjectBadge />
      <Button
        variant="ghost"
        size="icon"
        aria-label="Настройки проекта"
        onClick={() => setSettingsOpen(true)}
      >
        <SettingsIcon />
      </Button>
      <ToolbarSlot />
      <div className="ml-auto flex items-center gap-1">
        <OnlineUsers />
        <AccountMenu />
      </div>
      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
    </div>
  )
}
