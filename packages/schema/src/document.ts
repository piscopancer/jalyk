import type { AnyConfig } from './config.ts'
import type {
  DefaultHeaderData,
  ErasedComponent,
  FieldIcon,
  FieldMap,
  FieldValue,
  HeaderComponentProps,
  InferFields,
} from './field.ts'
import type { AsyncClientOf } from './query.ts'
import type {
  DocumentValidate,
  ErasedValidate,
  Issue,
  Severity,
} from './validate.ts'

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

/** Настройки списка документов типа: по каким полям искать (подстрока) и какие добавить в сортировку (помимо дат). Ключи — поля документа. */
export type DocumentListOptions<F extends FieldMap> = {
  search?: readonly (keyof F & string)[]
  sort?: readonly (keyof F & string)[]
}

/** Документ для превью: id, тип и черновик (`Draft` — значения полей, ссылки без дереференса). */
export type PreviewDocument<Draft = unknown> = {
  id: string
  type: string
  draft: Draft
}

/** Контекст резолвера картинки документа: типизированный черновик документа, `assetUrl` для ссылки на загруженный ассет (например обложку) и императивный клиент запросов `client` для дочитывания связанных документов. Колбек — обычная (возможно асинхронная) функция без хуков: студия исполняет его внутри своего запроса, поэтому здесь доступны и поля документа, и сеть. */
export type DocumentImageContext<Draft = unknown> = {
  document: PreviewDocument<Draft>
  assetUrl: (assetId: string) => string
  client: AsyncClientOf<AnyConfig>
}

/** Резолвер картинки документа: по контексту возвращает ссылку на ресурс (или `undefined`, если картинки нет). */
export type DocumentImageResolve<Draft = unknown> = (
  ctx: DocumentImageContext<Draft>,
) => string | undefined | Promise<string | undefined>

/** Спецификация иконки-документа в виде квадратной картинки: `resolve` добывает ссылку на ресурс, `fallback` — иконка-заглушка при пустой ссылке. Брендирована по `kind`, чтобы студия отличала её от статичной иконки lucide (обе — функции/объекты, структурно неразличимы). */
export type DocumentImageSpec<Draft = unknown> = {
  kind: 'document-image'
  resolve: DocumentImageResolve<Draft>
  fallback?: FieldIcon
}

/** Объявляет иконку документа как квадратную картинку (см. DocumentImageSpec): `resolve` читает черновик и/или связанные документы и возвращает ссылку на ресурс. Использовать в `defineDocument({ icon: defineDocumentImage(...) })`. `Draft` указывается явно для типизации `document.draft` (как и в кастомных превью). */
export function defineDocumentImage<Draft = unknown>(
  resolve: DocumentImageResolve<Draft>,
  options?: { fallback?: FieldIcon },
): DocumentImageSpec<Draft> {
  return { kind: 'document-image', resolve, fallback: options?.fallback }
}

/** Сужает значение иконки до спецификации картинки документа по бренду `kind`. */
export function isDocumentImage(icon: unknown): icon is DocumentImageSpec {
  return (
    typeof icon === 'object' &&
    icon !== null &&
    (icon as { kind?: unknown }).kind === 'document-image'
  )
}

/** Состояние документа для превью: есть ли неопубликованный черновик (правки относительно published) и замечания валидации. Студия отдаёт его превью пропом `state` и хуком useDocumentPreviewState, чтобы кастомные превью могли отразить черновик/ошибки/предупреждения. */
export type DocumentPreviewState = {
  hasDraft: boolean
  issues: readonly Issue[]
  worst: Severity | null
  hasError: boolean
}

/** Пропсы превью: `D` — данные превью, `Draft` — черновик, `Node` — узел рендера; иконка/заголовок/описание уже вычислены, `state` — состояние документа (черновик и замечания). */
export type PreviewComponentProps<
  D = unknown,
  Draft = unknown,
  Node = unknown,
> = {
  document: PreviewDocument<Draft>
  icon: Node
  title: Node
  description: Node
  preview: D
  state: DocumentPreviewState
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

/** Пропсы кастомной формы (карта полей F): `document` (id/тип), `Field` по ключу, `fields` — хэндлы полей. Самого черновика тут нет намеренно: подписка на весь draft перерисовывала бы форму на любую правку; значения читаются точечно через `fields.<имя>.value` (подписка только на прочитанные поля) или рисуются через `Field`. */
export type FormComponentProps<F extends FieldMap, Node> = {
  document: { id: string; type: string }
  Field: (props: FormFieldRenderProps<F, Node>) => Node
  fields: { [K in keyof F]: FormFieldHandle<FieldValue<F[K]>> }
}

/** Компонент кастомной формы; если задан, студия рисует его вместо дефолтного перебора полей. */
export type FormComponent<F extends FieldMap, Node> = (
  props: FormComponentProps<F, Node>,
) => Node

/** Полные опции документа (с компонентами) для рантайма; компоненты и валидатор стёрты, чтобы не было циклов. */
export type DocumentOptions = DocumentMeta & {
  fields: FieldMap
  previewComponent?: ErasedComponent
  formComponent?: ErasedComponent
  validate?: ErasedValidate
  // Настройки списка (декларативные имена полей), см. DocumentListOptions.
  list?: { search?: readonly string[]; sort?: readonly string[] }
}

/** Описывает документ; `const`-дженерик захватывает только `fields`, а форма/превью типизируются через выведенный F — это снимает цикл «конфиг → форма → тип конфига». */
export function defineDocument<
  const F extends FieldMap,
  P = DefaultPreviewData,
  PNode = unknown,
  FNode = unknown,
>(
  options: DocumentMeta & { fields: F } & PreviewOptions<
      InferFields<F>,
      P,
      PNode
    > & {
      formComponent?: FormComponent<F, FNode>
      /** Правила валидации документа: видят весь черновик (поля опциональны) и строгий билдер path, возвращают замечания rules.*. */
      validate?: DocumentValidate<InferFields<F>, F>
      /** Настройки списка документов этого типа (поиск, сортировка), типизированные ключами полей. */
      list?: DocumentListOptions<F>
    },
): DocumentMeta & { fields: F } & PreviewOptions<InferFields<F>, P, PNode> & {
    formComponent?: FormComponent<F, FNode>
    validate?: DocumentValidate<InferFields<F>, F>
    list?: DocumentListOptions<F>
  } {
  return options
}
