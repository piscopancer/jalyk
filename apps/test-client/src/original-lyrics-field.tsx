import type { FormProps } from '@jalyk/studio'
import type { ReactNode } from 'react'
import type {
  OriginalLyricsFields,
  TranslationFields,
} from './studio-config.ts'

/** Общая раскладка лирики: слева сверху язык, справа сверху автор(ы), под ними на всю ширину — текст. Принимает уже отрисованные узлы полей, поэтому одинаково обслуживает оригинал (авторы текста) и перевод (автор перевода), у которых правое верхнее поле разное. */
function LyricsLayout({
  language,
  author,
  text,
}: {
  language: ReactNode
  author: ReactNode
  text: ReactNode
}) {
  return (
    <div className="flex flex-col gap-4 rounded-md border p-3">
      <div className="grid grid-cols-2 gap-4">
        {language}
        {author}
      </div>
      {text}
    </div>
  )
}

/** Кастомный layout поля «Оригинальная лирика» (defineObject({ component })). Объявлен один раз и потому отображается во всех документах, где встречается это поле. Подписок форма не держит: значения подполей рисуются через Field точечно. */
export function OriginalLyricsField({ Field }: FormProps<OriginalLyricsFields>) {
  return (
    <LyricsLayout
      language={<Field name="language" />}
      author={<Field name="authors" />}
      text={<Field name="text" />}
    />
  )
}

/** Кастомный layout элемента поля «Лирика» (перевод): та же раскладка, но справа сверху — автор перевода. Используется на каждом элементе массива переводов. */
export function TranslationField({ Field }: FormProps<TranslationFields>) {
  return (
    <LyricsLayout
      language={<Field name="language" />}
      author={<Field name="translator" />}
      text={<Field name="text" />}
    />
  )
}
