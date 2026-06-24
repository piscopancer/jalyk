import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuTrigger,
  DropdownMenuItem,
  DropdownMenuSeparator,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@jalyk/ui'
import { Code2Icon, Trash2Icon } from 'lucide-react'
import { useState, type ReactElement } from 'react'
import { useDeleteDocument, useDocument } from '../data/hooks.ts'
import { DocumentJsonView } from './DocumentJsonView.tsx'

/**
 * Общие действия документа — «Просмотреть JSON» и «Удалить», — единые для меню по
 * троеточию (DocumentActions) и контекстного меню строки списка. Возвращает пункты
 * (рендерятся внутри содержимого любого меню — части base-ui у dropdown и context
 * menu одни и те же) и диалог с JSON, который должен жить вне меню, иначе закрытие
 * меню размонтирует лист до его показа.
 */
export function useDocumentMenu(id: string, onDeleted?: () => void) {
  const doc = useDocument(id)
  const remove = useDeleteDocument(id)
  const [jsonOpen, setJsonOpen] = useState(false)

  const items = (
    <>
      <DropdownMenuItem onClick={() => setJsonOpen(true)}>
        <Code2Icon />
        Просмотреть JSON
      </DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuItem
        variant="destructive"
        disabled={remove.isPending}
        onClick={() => remove.mutate(undefined, { onSuccess: onDeleted })}
      >
        <Trash2Icon />
        {remove.isPending ? 'Удаляем…' : 'Удалить'}
      </DropdownMenuItem>
    </>
  )

  const dialog = (
    <Sheet open={jsonOpen} onOpenChange={setJsonOpen}>
      <SheetContent className="w-[32rem] sm:max-w-[32rem]">
        <SheetHeader>
          <SheetTitle>JSON документа</SheetTitle>
          <SheetDescription>
            Черновик; ссылки разворачиваются и подгружают связанный документ.
          </SheetDescription>
        </SheetHeader>
        <div className="-mx-2 flex-1 overflow-auto px-2">
          <DocumentJsonView draft={doc.data?.draft} />
        </div>
      </SheetContent>
    </Sheet>
  )

  return { items, dialog }
}

/**
 * Контекстное меню документа по правому клику: оборачивает строку списка (`trigger`)
 * и показывает те же действия, что и троеточие документа. `onDeleted` зовётся после
 * удаления (например, чтобы снять выделение).
 */
export function DocumentContextMenu({
  id,
  trigger,
  onDeleted,
}: {
  id: string
  trigger: ReactElement
  onDeleted?: () => void
}) {
  const { items, dialog } = useDocumentMenu(id, onDeleted)
  return (
    <ContextMenu>
      <ContextMenuTrigger render={trigger} />
      <ContextMenuContent className="min-w-44">{items}</ContextMenuContent>
      {dialog}
    </ContextMenu>
  )
}
