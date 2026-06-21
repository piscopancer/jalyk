import {
  Button,
  cn,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  toast,
} from '@jalyk/ui'
import {
  CopyIcon,
  ExternalLinkIcon,
  ImagesIcon,
  PaletteIcon,
  SlidersHorizontalIcon,
} from 'lucide-react'
import { useState } from 'react'
import { useStudio } from '../data/context.tsx'
import { useDocumentCounts } from '../data/hooks.ts'
import {
  useStudioLayout,
  useStudioThemePref,
  type ThemePref,
} from '../data/prefs.tsx'
import { JALYK_PROJECTS_URL } from '../data/site.ts'
import type { StudioLayout } from '../Studio.tsx'
import { AssetGallery } from '../fields/AssetGallery.tsx'

// Разделы слева, контент справа. Внешний вид меняет лейаут и тему (персист в
// localStorage через настройки студии), управление показывает мини-дашборд:
// счётчики документов, просмотр ассетов в отдельном диалоге, id проекта и ссылку
// на проект в ЛК Jalyk. Presence и тариф появятся позже — здесь их нет.

const SECTIONS = [
  { id: 'appearance', label: 'Внешний вид', icon: PaletteIcon },
  { id: 'management', label: 'Управление', icon: SlidersHorizontalIcon },
] as const

type SectionId = (typeof SECTIONS)[number]['id']

const LAYOUT_OPTIONS = [
  { value: 'miller', label: 'Колонки' },
  { value: 'layer', label: 'Слои' },
] as const satisfies readonly { value: StudioLayout; label: string }[]

const THEME_OPTIONS = [
  { value: 'system', label: 'Системная' },
  { value: 'light', label: 'Светлая' },
  { value: 'dark', label: 'Тёмная' },
] as const satisfies readonly { value: ThemePref; label: string }[]

/** Сегментированный переключатель: ряд кнопок, активная подсвечена. Значение типизировано литералами опций, поэтому onChange отдаёт точный union. */
function Segmented<V extends string>({
  options,
  value,
  onChange,
}: {
  options: readonly { value: V; label: string }[]
  value: V
  onChange: (value: V) => void
}) {
  return (
    <div className="inline-flex gap-1 rounded-lg border p-1">
      {options.map((option) => (
        <Button
          key={option.value}
          type="button"
          size="sm"
          variant={option.value === value ? 'secondary' : 'ghost'}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </Button>
      ))}
    </div>
  )
}

function AppearanceSection() {
  const [layout, setLayout] = useStudioLayout()
  const [theme, setTheme] = useStudioThemePref()
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium">Способ просмотра</span>
        <Segmented
          options={LAYOUT_OPTIONS}
          value={layout}
          onChange={setLayout}
        />
      </div>
      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium">Тема</span>
        <Segmented options={THEME_OPTIONS} value={theme} onChange={setTheme} />
      </div>
    </div>
  )
}

function ManagementSection() {
  const { projectId, config } = useStudio()
  const counts = useDocumentCounts()
  const [assetsOpen, setAssetsOpen] = useState(false)
  const countByType = new Map(
    (counts.data ?? []).map((row) => [row.type, row.count]),
  )
  const total = (counts.data ?? []).reduce((sum, row) => sum + row.count, 0)
  const projectUrl = `${JALYK_PROJECTS_URL}/${projectId}`

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium">Документы</span>
        <ul className="flex flex-col gap-1 rounded-lg border p-2 text-sm">
          {Object.entries(config.documents).map(([type, definition]) => (
            <li key={type} className="flex items-center justify-between px-1">
              <span>{definition.title ?? type}</span>
              <span className="text-muted-foreground">
                {countByType.get(type) ?? 0}
              </span>
            </li>
          ))}
          <li className="flex items-center justify-between border-t px-1 pt-1 font-medium">
            <span>Всего</span>
            <span>{total}</span>
          </li>
        </ul>
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium">Файлы</span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="self-start"
          onClick={() => setAssetsOpen(true)}
        >
          <ImagesIcon />
          Просмотреть ассеты
        </Button>
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium">Проект</span>
        <div className="flex items-center justify-between gap-2 rounded-lg border px-2 py-1.5 text-sm">
          <span className="truncate font-mono text-xs text-muted-foreground">
            {projectId}
          </span>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            title="Скопировать id"
            onClick={() => {
              void navigator.clipboard?.writeText(projectId)
              toast('Id проекта скопирован')
            }}
          >
            <CopyIcon />
          </Button>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="self-start"
          render={
            <a href={projectUrl} target="_blank" rel="noreferrer noopener" />
          }
        >
          <ExternalLinkIcon />
          Открыть проект в ЛК
        </Button>
      </div>

      <Dialog open={assetsOpen} onOpenChange={setAssetsOpen}>
        <DialogContent className="max-w-[90vw] sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Файлы проекта</DialogTitle>
            <DialogDescription>
              Загруженные картинки проекта. Просмотр и удаление.
            </DialogDescription>
          </DialogHeader>
          <AssetGallery />
        </DialogContent>
      </Dialog>
    </div>
  )
}

/** Диалог настроек проекта (открывается шестерёнкой тулбара): слева список разделов, справа их содержимое. */
export function SettingsDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [section, setSection] = useState<SectionId>('appearance')
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[32rem] max-w-[90vw] flex-col sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Настройки проекта</DialogTitle>
          <DialogDescription>
            Внешний вид студии и управление проектом.
          </DialogDescription>
        </DialogHeader>
        <div className="flex min-h-0 flex-1 gap-4">
          <ul className="flex w-44 shrink-0 flex-col gap-1">
            {SECTIONS.map((item) => {
              const Icon = item.icon
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    className={cn(
                      'flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-sm hover:bg-accent',
                      section === item.id && 'bg-accent font-medium',
                    )}
                    onClick={() => setSection(item.id)}
                  >
                    <Icon className="size-4 text-muted-foreground" />
                    {item.label}
                  </button>
                </li>
              )
            })}
          </ul>
          <div className="min-w-0 flex-1 overflow-y-auto">
            {section === 'appearance' ? (
              <AppearanceSection />
            ) : (
              <ManagementSection />
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
