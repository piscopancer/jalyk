// Проверка вывода типов (не входит в публичный API, нужна только для tsc).
// Если вывод сломается, ошибки появятся здесь при typecheck.

import { defineConfig, type InferDocument } from './config.ts'
import { defineDocument } from './document.ts'
import { defineArray, defineImage, defineNumber, defineReference, defineRichText, defineString } from './field.ts'

const config = defineConfig({
  documents: {
    author: defineDocument({
      title: 'Автор',
      preview: { title: 'name' },
      fields: {
        name: defineString({ title: 'Имя', required: true }),
        bio: defineRichText({}),
      },
    }),
    post: defineDocument({
      title: 'Пост',
      fields: {
        title: defineString({ required: true }),
        cover: defineImage({}),
        status: defineString({
          required: true,
          input: { type: 'select', predefined: [{ value: 'draft' }, { value: 'published' }] },
        }),
        views: defineNumber({ min: 0 }),
        author: defineReference({ to: ['author'], required: true }),
        tags: defineArray({ of: defineString({}) }),
      },
    }),
  },
})

type Post = InferDocument<typeof config, 'post'>

// Ожидаемые формы значений (ошибка компиляции, если вывод неверен).
const post: Post = {
  _id: 'x',
  _type: 'post',
  title: 'Привет',
  status: 'draft', // должно сужаться до 'draft' | 'published'
  author: { _ref: 'a1', _type: 'author' },
}

// Необязательные поля можно опускать.
void post.cover
// @ts-expect-error — status сужен до объединения литералов, 'foo' недопустим.
const bad: Post = { _id: 'x', _type: 'post', title: 't', status: 'foo', author: { _ref: 'a', _type: 'author' } }

void post
void bad
