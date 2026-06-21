import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@jalyk/ui'
import {
  ArrowDownIcon,
  ArrowUpDownIcon,
  ArrowUpIcon,
  CalendarIcon,
} from 'lucide-react'
import type { ReactNode } from 'react'
import { useStudio } from '../data/context.tsx'
import { DATE_SORT_FIELDS } from '../data/list-query.ts'
import { asIcon } from '../data/react-bridge.tsx'
import { useListState, type SortDir } from '../data/list-state.ts'

/** Слот фиксированной ширины под иконку слева от пункта: либо иконка поля, либо пустое место, чтобы тексты всех пунктов были на одном уровне. */
function IconSlot({ children }: { children?: ReactNode }) {
  return (
    <span className="flex size-4 shrink-0 items-center justify-center text-muted-foreground">
      {children}
    </span>
  )
}

const DATE_LABEL: Record<(typeof DATE_SORT_FIELDS)[number], string> = {
  updatedAt: 'Дата обновления',
  createdAt: 'Дата создания',
}

/** Меню сортировки списка: даты документа плюс поля из list.sort конфига, и направление. */
export function SortMenu({
  type,
  stateKey,
  className,
}: {
  type: string
  stateKey: string
  className?: string
}) {
  const { config } = useStudio()
  const fields = config.documents[type]?.fields ?? {}
  const sortKeys = config.documents[type]?.list?.sort ?? []
  const [state, setState] = useListState(stateKey)

  // Сортировка всегда задана (по умолчанию — дата обновления, убыв.).
  const sort = state.sort ?? { field: 'updatedAt', dir: 'desc' as SortDir }
  const setField = (field: string) =>
    setState(
      (draft) => void (draft.sort = { field, dir: draft.sort?.dir ?? 'desc' }),
    )
  const setDir = (dir: SortDir) =>
    setState(
      (draft) =>
        void (draft.sort = { field: draft.sort?.field ?? 'updatedAt', dir }),
    )

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            size="icon-sm"
            variant="outline"
            aria-label="Сортировка"
            className={className}
          />
        }
      >
        <ArrowUpDownIcon />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuRadioGroup value={sort.field} onValueChange={setField}>
          <DropdownMenuLabel inset>Сортировка</DropdownMenuLabel>
          {DATE_SORT_FIELDS.map((field) => (
            <DropdownMenuRadioItem key={field} value={field}>
              <IconSlot>
                <CalendarIcon className="size-4" />
              </IconSlot>
              {DATE_LABEL[field]}
            </DropdownMenuRadioItem>
          ))}
          {sortKeys.length > 0 ? <DropdownMenuSeparator /> : null}
          {sortKeys.map((key) => {
            const Icon = asIcon(fields[key]?.icon)
            return (
              <DropdownMenuRadioItem key={key} value={key}>
                <IconSlot>{Icon ? <Icon className="size-4" /> : null}</IconSlot>
                {fields[key]?.title ?? key}
              </DropdownMenuRadioItem>
            )
          })}
        </DropdownMenuRadioGroup>

        <DropdownMenuSeparator />
        <DropdownMenuRadioGroup
          value={sort.dir}
          onValueChange={(value) => setDir(value === 'desc' ? 'desc' : 'asc')}
        >
          <DropdownMenuLabel inset>Направление</DropdownMenuLabel>
          <DropdownMenuRadioItem value="asc">
            <IconSlot>
              <ArrowUpIcon className="size-4" />
            </IconSlot>
            По возрастанию
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="desc">
            <IconSlot>
              <ArrowDownIcon className="size-4" />
            </IconSlot>
            По убыванию
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
