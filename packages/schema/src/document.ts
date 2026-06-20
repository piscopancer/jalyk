import type { DefaultHeaderData, ErasedComponent, FieldIcon, FieldMap, FieldValue, HeaderComponentProps, InferFields } from './field.ts'

// Документ — карта полей плюс мета; тип документа задаёт ключ в `documents`.
// Превью и форма разведены на данные (схема) и компонент (студия).

/** Данные превью под DefaultPreview: `title`/`description` — имена полей-источников, `icon` перекрывает иконку документа. */
export type DefaultPreviewData = {
  title?: string
  description?: string
  icon?: FieldIcon
}

/** Данные превью под DefaultPreview. Сохраняет литералы. */
export function defaultPreview<const D extends DefaultPreviewData>(data: D): D {
  return data
}

/** Произвольные данные превью под свой previewComponent. Сохраняет литералы. */
export function definePreview<const D>(data: D): D {
  return data
}

/** Документ для превью: id, тип и черновик (`Draft` — значения полей, ссылки без дереференса). */
export type PreviewDocument<Draft = unknown> = { id: string; type: string; draft: Draft }

/** Пропсы превью: `D` — данные превью, `Draft` — черновик, `Node` — узел рендера; иконка/заголовок/описание уже вычислены. */
export type PreviewComponentProps<D = unknown, Draft = unknown, Node = unknown> = {
  document: PreviewDocument<Draft>
  icon: Node
  title: Node
  description: Node
  preview: D
}

/** Компонент превью документа. Возврат намеренно широкий — схема без React. */
export type PreviewComponent<D = unknown, Draft = unknown, Node = unknown> = (
  props: PreviewComponentProps<D, Draft, Node>,
) => unknown

/** Опции превью для defineDocument: `previewComponent` задаёт форму `preview`; `NoInfer` гонит проверку против дефолта, а не самого `preview`. */
export type PreviewOptions<Draft, P, Node> = {
  preview?: NoInfer<P>
  previewComponent?: PreviewComponent<P, Draft, Node>
}

/** Мета документа без полей и без компонентов рендера. */
export type DocumentMeta = {
  title?: string
  description?: string
  icon?: FieldIcon
  // Данные превью (декларативные), см. PreviewOptions. Компоненты — отдельно.
  preview?: unknown
}

/** Хэндл поля формы: значение, запись (`null` очищает), статус и флаг загрузки; без узлов рендера. */
export type FormFieldHandle<V> = {
  value: V | undefined
  set: (value: V | null) => void
  status: 'idle' | 'pending' | 'success' | 'error'
  error: unknown
  isLoading: boolean
}

/** Пропсы `Field`: имя поля (ключ F), рычаги заголовка `header` (false/null скрывает) и `headerComponent`, плюс `className` обёртки. */
export type FormFieldRenderProps<F extends FieldMap, Node> = {
  name: keyof F & string
  header?: DefaultHeaderData | false | null
  headerComponent?: (props: HeaderComponentProps) => Node
  className?: string
}

/** Пропсы кастомной формы (карта полей F): `document` (id/тип/черновик), `Field` по ключу, `fields` — хэндлы всех полей. */
export type FormComponentProps<F extends FieldMap, Node> = {
  document: { id: string; type: string; draft: Partial<InferFields<F>> }
  Field: (props: FormFieldRenderProps<F, Node>) => Node
  fields: { [K in keyof F]: FormFieldHandle<FieldValue<F[K]>> }
}

/** Компонент кастомной формы; если задан, студия рисует его вместо дефолтного перебора полей. */
export type FormComponent<F extends FieldMap, Node> = (props: FormComponentProps<F, Node>) => Node

/** Полные опции документа (с компонентами) для рантайма; компоненты стёрты в ErasedComponent, чтобы не было циклов. */
export type DocumentOptions = DocumentMeta & {
  fields: FieldMap
  previewComponent?: ErasedComponent
  formComponent?: ErasedComponent
}

/** Описывает документ; `const`-дженерик захватывает только `fields`, а форма/превью типизируются через выведенный F — это снимает цикл «конфиг → форма → тип конфига». */
export function defineDocument<const F extends FieldMap, P = DefaultPreviewData, PNode = unknown, FNode = unknown>(
  options: DocumentMeta & { fields: F } & PreviewOptions<InferFields<F>, P, PNode> & { formComponent?: FormComponent<F, FNode> },
): DocumentMeta & { fields: F } & PreviewOptions<InferFields<F>, P, PNode> & { formComponent?: FormComponent<F, FNode> } {
  return options
}
