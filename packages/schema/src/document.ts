import type { ErasedComponent, FieldIcon, FieldMap, InferFields } from './field.ts'

// Документ — это карта полей плюс мета. Тип (ключ реестра) документ не хранит:
// им служит ключ в `documents` объекте defineConfig, что задаёт единый реестр
// типов и снимает циклические зависимости между ссылками.

// --- Превью документа --------------------------------------------------------
// Превью — это то, что рисуется для документа в списках. Как и заголовок поля,
// оно разведено на данные и компонент. Данные (`preview`) декларативны: какое
// поле взять под заголовок/описание и какую иконку показать. Компонент
// (`previewComponent`) живёт в студии, по умолчанию — DefaultPreview; ему через
// пропсы отдаются уже вычисленные иконка, заголовок и описание, а внутри хуками
// студии можно дочитать поля документа и документов по ссылкам на любую глубину.

/**
 * Предопределённые данные превью — то, что умеет рисовать DefaultPreview.
 * `title`/`description` — имена полей-источников (если `title` не задан, студия
 * берёт первое строковое поле). `icon` перекрывает иконку документа.
 */
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

/**
 * Документ для превью: тип, id и черновик. `Draft` — выведенные значения полей
 * документа (ссылки остаются ссылками, без дереференса). Глубже (по ссылкам)
 * читается хуками студии.
 */
export type PreviewDocument<Draft = unknown> = { id: string; type: string; draft: Draft }

/**
 * Пропсы компонента превью. `D` — данные превью, `Draft` — тип черновика
 * документа, `Node` — тип «узла» рендера (схема без React, поэтому по умолчанию
 * `unknown`; студия подставляет `ReactNode`). Иконка, заголовок и описание
 * приходят уже вычисленными.
 */
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

/**
 * Опции превью, подмешиваемые в defineDocument. `previewComponent` определяет
 * форму `preview` (со своим компонентом `preview` обязан подойти его пропсам, без
 * компонента форма падает на DefaultPreviewData) и получает типизированный
 * черновик `Draft`. `NoInfer` запрещает выводить P из самого `preview`, чтобы
 * проверка шла против дефолта; `Node` выводится из переданного компонента.
 */
export type PreviewOptions<Draft, P, Node> = {
  preview?: NoInfer<P>
  previewComponent?: PreviewComponent<P, Draft, Node>
}

export type DocumentOptions = {
  fields: FieldMap
  title?: string
  description?: string
  icon?: FieldIcon
  // Превью: данные и (опционально) свой компонент рендера, см. PreviewOptions.
  // Компонент типизирован рантайм-стёртым ErasedComponent — точные пропсы задаёт
  // PreviewOptions при описании документа.
  preview?: unknown
  previewComponent?: ErasedComponent
}

/**
 * Описывает документ. Возвращает объект как есть (с сохранением литералов через
 * `const`-дженерик), чтобы defineConfig вывел из него точные типы значений.
 * `Node` выводится из previewComponent, а его черновик типизируется значениями
 * полей этого документа (InferFields).
 */
export function defineDocument<const O extends DocumentOptions, P = DefaultPreviewData, Node = unknown>(
  options: O & PreviewOptions<InferFields<O['fields']>, P, Node>,
): O & PreviewOptions<InferFields<O['fields']>, P, Node> {
  return options
}
