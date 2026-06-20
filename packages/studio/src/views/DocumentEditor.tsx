import type { FieldMap } from '@jalyk/schema'
import { Button } from '@jalyk/ui'
import { useStudio } from '../data/context.tsx'
import { DocumentProvider } from '../data/document.tsx'
import { useDeleteDocument, useDocument, usePublishDocument } from '../data/hooks.ts'
import { asComponent } from '../data/react-bridge.tsx'
import { FieldInput } from '../fields/FieldInput.tsx'
import { CustomForm, type FormProps } from './form.tsx'

/** Панель действий: публикация и удаление со статусами мутаций. */
function DocumentActions({ id, onDeleted }: { id: string; onDeleted?: () => void }) {
  const publish = usePublishDocument(id)
  const remove = useDeleteDocument(id)
  return (
    <div className="flex items-center gap-2 border-b p-3">
      <Button size="sm" onClick={() => publish.mutate()} disabled={publish.isPending}>
        {publish.isPending ? 'Публикуем…' : 'Опубликовать'}
      </Button>
      <Button
        size="sm"
        variant="destructive"
        disabled={remove.isPending}
        onClick={() => remove.mutate(undefined, { onSuccess: onDeleted })}
      >
        {remove.isPending ? 'Удаляем…' : 'Удалить'}
      </Button>
    </div>
  )
}

/** Дефолтный редактор документа: рисует FieldInput по полям типа внутри DocumentProvider (нужен useField). */
export function DocumentEditor({ id, type, onDeleted }: { id: string; type: string; onDeleted?: () => void }) {
  const { config } = useStudio()
  const doc = useDocument(id)
  const definition = config.documents[type]

  if (!definition) {
    return <div className="p-4 text-sm text-destructive">Неизвестный тип документа: {type}</div>
  }

  // formComponent (ErasedComponent) рисуется вместо перебора полей; narrow через asComponent на границе со схемой.
  const Form = asComponent<FormProps<FieldMap>>(definition.formComponent)

  return (
    <DocumentProvider id={id} type={type}>
      <div className="flex h-full flex-col">
        <DocumentActions id={id} onDeleted={onDeleted} />
        <div className="flex flex-col gap-5 overflow-y-auto p-4">
          {doc.isLoading ? <span className="text-sm text-muted-foreground">Загрузка…</span> : null}
          {Form ? (
            <CustomForm fields={definition.fields} component={Form} />
          ) : (
            Object.entries(definition.fields).map(([key, field]) => <FieldInput key={key} path={[key]} field={field} />)
          )}
        </div>
      </div>
    </DocumentProvider>
  )
}
