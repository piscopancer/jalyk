import {
  Button,
  CodeBlock,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuItemRow,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  toast,
} from '@jalyk/ui'
import { ClipboardPaste, Copy, FileJson2, MoreHorizontal, RotateCcw } from 'lucide-react'
import { useState } from 'react'
import { useFieldClipboard } from '../data/clipboard.tsx'
import { useField } from '../data/field.ts'
import type { FieldComponentProps } from './registry.tsx'

// Меню-троеточие в заголовке поля. Действия работают над значением поля по пути
// через useField: сброс к дефолту из схемы, копирование значения во внутренний
// буфер студии (и системный), вставка (только если вид скопированного совпадает с
// видом этого поля) и детальный просмотр сырого значения в формате JSON.
export function FieldMenu({ path, field }: FieldComponentProps) {
  const handle = useField(path)
  const clipboard = useFieldClipboard()
  const [detailOpen, setDetailOpen] = useState(false)

  // Вставка доступна, если в буфере есть значение того же вида, что и это поле.
  const canPaste = clipboard.entry !== null && clipboard.entry.kind === field.kind

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="size-6 text-muted-foreground" aria-label="Действия с полем">
            <MoreHorizontal />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-52">
          <DropdownMenuItem onSelect={() => handle.set(field.default)}>
            <DropdownMenuItemRow icon={<RotateCcw />}>Сбросить до дефолта</DropdownMenuItemRow>
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={() => {
              clipboard.copy(field.kind, handle.value)
              toast('Скопировано значение')
            }}
          >
            <DropdownMenuItemRow icon={<Copy />}>Скопировать значение</DropdownMenuItemRow>
          </DropdownMenuItem>
          {canPaste ? (
            <DropdownMenuItem onSelect={() => handle.set(clipboard.entry!.value)}>
              <DropdownMenuItemRow icon={<ClipboardPaste />}>Вставить</DropdownMenuItemRow>
            </DropdownMenuItem>
          ) : null}
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => setDetailOpen(true)}>
            <DropdownMenuItemRow icon={<FileJson2 />}>Детальный просмотр</DropdownMenuItemRow>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{field.title ?? path[path.length - 1] ?? 'Значение поля'}</DialogTitle>
            <DialogDescription>Сырое значение поля в формате JSON.</DialogDescription>
          </DialogHeader>
          <CodeBlock
            code={JSON.stringify(handle.value ?? null, null, 2)}
            className="max-h-[60vh] rounded-md border bg-muted/50 p-4"
          />
        </DialogContent>
      </Dialog>
    </>
  )
}
