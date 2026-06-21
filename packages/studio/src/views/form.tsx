import type {
  FieldMap,
  FormComponentProps,
  FormFieldRenderProps,
} from '@jalyk/schema'
import type { ReactNode } from 'react'
import { useStudio } from '../data/context.tsx'
import { useDocumentContext } from '../data/document.tsx'
import { useField, type FieldHandle } from '../data/field.ts'
import { useDocument } from '../data/hooks.ts'
import { FieldInput } from '../fields/FieldInput.tsx'

// Кастомная форма редактора (formComponent документа): студия рисует её вместо дефолтного перебора полей. Пропсы параметризованы картой полей F, а не всем конфигом — иначе конфиг сослался бы на себя через свой же компонент (цикл).

/** Пропсы <Field> со стороны студии: узлы рендера — ReactNode. */
export type FormFieldProps<F extends FieldMap> = FormFieldRenderProps<
  F,
  ReactNode
>

/** Компонент отрисовки поля по ключу, типизированный картой полей F. */
export type FormFieldComponent<F extends FieldMap> = (
  props: FormFieldProps<F>,
) => ReactNode

/** Пропсы кастомной формы со стороны студии (узлы — ReactNode); разработчик пишет `FormProps<typeof albumFields>`. */
export type FormProps<F extends FieldMap> = FormComponentProps<F, ReactNode>

/** <Field> в рантайме: берёт описание поля из конфига по текущему типу документа и рисует через FieldInput. */
function FormField({
  name,
  header,
  headerComponent,
  className,
}: {
  name: string
  header?: unknown
  headerComponent?: unknown
  className?: string
}) {
  const { config } = useStudio()
  const { type } = useDocumentContext()
  const field = config.documents[type]?.fields[name]
  if (!field) return null
  return (
    <FieldInput
      path={[name]}
      field={field}
      header={header}
      headerComponent={headerComponent}
      className={className}
    />
  )
}

/** Собирает пропсы формы; хэндлы строятся перебором ключей конфига — набор статичен, порядок useField стабилен. */
function useFormProps(fields: Record<string, unknown>): {
  document: { id: string; type: string; draft: Record<string, unknown> }
  Field: typeof FormField
  fields: Record<string, FieldHandle<unknown>>
} {
  const { id, type } = useDocumentContext()
  const doc = useDocument(id)
  const handles: Record<string, FieldHandle<unknown>> = {}
  for (const key of Object.keys(fields)) {
    // ключи статичны (из конфига) — порядок вызовов useField стабилен между рендерами
    handles[key] = useField([key])
  }
  const draft = doc.data?.draft
  return {
    document: {
      id,
      type,
      draft:
        draft !== null && typeof draft === 'object'
          ? (draft as Record<string, unknown>)
          : {},
    },
    Field: FormField,
    fields: handles,
  }
}

/** Мост студия↔кастомная форма: собирает FormProps по полям типа; пропсы строятся динамически, потому приводятся к FormProps (внутри компонента типы уже точные). */
export function CustomForm({
  fields,
  component: Component,
}: {
  fields: Record<string, unknown>
  component: (props: FormProps<FieldMap>) => ReactNode
}) {
  const props = useFormProps(fields)
  return <Component {...(props as unknown as FormProps<FieldMap>)} />
}
