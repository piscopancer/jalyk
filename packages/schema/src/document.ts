import type { FieldIcon, FieldMap } from './field.ts'

// Документ — это карта полей плюс мета. Тип (ключ реестра) документ не хранит:
// им служит ключ в `documents` объекте defineConfig, что задаёт единый реестр
// типов и снимает циклические зависимости между ссылками.

export type DocumentOptions = {
  fields: FieldMap
  title?: string
  description?: string
  icon?: FieldIcon
  /** Превью документа в списках: из какого поля брать заголовок. */
  preview?: { title?: string }
}

/**
 * Описывает документ. Возвращает объект как есть (с сохранением литералов через
 * `const`-дженерик), чтобы defineConfig вывел из него точные типы значений.
 */
export function defineDocument<const O extends DocumentOptions>(options: O): O {
  return options
}
