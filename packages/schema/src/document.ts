import type { FieldIcon, FieldMap } from './field.ts'

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

/** Документ для превью: тип, id и черновик. Глубже читается хуками студии. */
export type PreviewDocument = { id: string; type: string; draft: unknown }

/**
 * Пропсы компонента превью: сам документ плюс уже вычисленные дефолты (иконка,
 * заголовок, описание — изначально строки/элементы) и заданные данные превью.
 * Схема не зависит от React, поэтому дефолты типизированы широко.
 */
export type PreviewComponentProps<D = unknown> = {
  document: PreviewDocument
  icon: unknown
  title: unknown
  description: unknown
  preview: D
}

/** Компонент превью документа. Возврат намеренно широкий — схема без React. */
export type PreviewComponent<D = any> = (props: PreviewComponentProps<D>) => unknown

/**
 * Опции превью, подмешиваемые в defineDocument. `previewComponent` определяет
 * форму `preview`: со своим компонентом `preview` обязан подойти его пропсам, без
 * компонента форма падает на DefaultPreviewData. `NoInfer` запрещает выводить P
 * из самого `preview`, чтобы проверка шла против дефолта, а не подстраивалась.
 */
export type PreviewOptions<P> = {
  preview?: NoInfer<P>
  previewComponent?: PreviewComponent<P>
}

export type DocumentOptions = {
  fields: FieldMap
  title?: string
  description?: string
  icon?: FieldIcon
  // Превью: данные и (опционально) свой компонент рендера, см. PreviewOptions.
  preview?: unknown
  previewComponent?: PreviewComponent
}

/**
 * Описывает документ. Возвращает объект как есть (с сохранением литералов через
 * `const`-дженерик), чтобы defineConfig вывел из него точные типы значений.
 */
export function defineDocument<const O extends DocumentOptions, P = DefaultPreviewData>(
  options: O & PreviewOptions<P>,
): O & PreviewOptions<P> {
  return options
}
