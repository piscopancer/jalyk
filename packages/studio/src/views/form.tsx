import type {
  FieldMap,
  FormComponentProps,
  FormFieldRenderProps,
} from '@jalyk/schema'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useStudio } from '../data/context.tsx'
import { useDocumentContext } from '../data/document.tsx'
import { type FieldHandle } from '../data/field.ts'
import { useDocumentSelect, useSetField } from '../data/hooks.ts'
import { studioKeys } from '../data/keys.ts'
import { getAtPath } from '../data/path.ts'
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

/** Собирает пропсы формы. Ключевое отличие от прежней версии: форма не
 * подписывается ни на весь документ, ни сразу на все поля. `<Field>` подписан
 * точечно сам (это тот же FieldInput, что и в дефолтной форме), а `fields`
 * ленив — доступ `fields.<имя>.value` подписывает форму только на это поле.
 * Поэтому правка поля, которое форма не читает напрямую (например перестановка
 * элементов внутри tracks), форму не перерисовывает — её будит только смена
 * значения реально прочитанного поля. */
function useFormProps(fields: Record<string, unknown>): {
  document: { id: string; type: string }
  Field: typeof FormField
  fields: Record<string, FieldHandle<unknown>>
} {
  const { id, type } = useDocumentContext()
  const { projectId } = useStudio()
  const qc = useQueryClient()
  const setField = useSetField(id, type)
  const key = studioKeys.document(projectId, id)

  // Набор полей, которые форма реально прочитала через fields.<имя>.value. Растёт
  // монотонно и задаёт точечную подписку ниже.
  const read = useRef<Set<string>>(new Set())
  const subscribedSize = useRef(0)
  const [, bump] = useState(0)

  // Один селект на форму: срезы только прочитанных полей. React Query применяет
  // структурное разделение к результату select, поэтому пока ни один прочитанный
  // срез не сменил идентичность, ссылка прежняя и форма не перерисовывается;
  // правка непрочитанного поля результат не меняет.
  const query = useDocumentSelect(id, (data) => {
    const draft = (data as { draft: unknown }).draft
    const out: Record<string, unknown> = {}
    for (const name of read.current) out[name] = getAtPath(draft, [name])
    return out
  })
  const selected = query.data as Record<string, unknown> | undefined
  const isLoading = query.isLoading

  // Поле, прочитанное впервые, попадает в read уже после вызова селекта в этом
  // рендере, поэтому реактивную подписку на него поднимаем со следующего рендера
  // (значение в текущем берём напрямую из кэша — без мигания).
  useEffect(() => {
    if (read.current.size !== subscribedSize.current) {
      subscribedSize.current = read.current.size
      bump((n) => n + 1)
    }
  })

  // Прокси-хэндлы: чтение value помечает поле прочитанным (подписка) и отдаёт его
  // срез; запись и статус общие на форму (per-field статус прежняя версия тоже
  // фактически не давала потребителям — формы пишут значения через <Field>).
  const handles = new Proxy({} as Record<string, FieldHandle<unknown>>, {
    ownKeys: () => Reflect.ownKeys(fields),
    getOwnPropertyDescriptor: () => ({
      enumerable: true,
      configurable: true,
    }),
    get(_target, prop): FieldHandle<unknown> | undefined {
      if (typeof prop !== 'string') return undefined
      read.current.add(prop)
      const value =
        selected && prop in selected
          ? selected[prop]
          : getAtPath(qc.getQueryData<{ draft: unknown }>(key)?.draft, [prop])
      return {
        value,
        set: (next) => setField.mutate({ path: [prop], value: next }),
        status: setField.status,
        error: setField.error,
        isLoading,
      }
    },
  })

  return { document: { id, type }, Field: FormField, fields: handles }
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
