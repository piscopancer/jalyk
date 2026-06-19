// Проверка вывода типов (не входит в публичный API, нужна только для tsc).
// Если вывод сломается, ошибки появятся здесь при typecheck.

import { defineConfig, type InferDocument } from './config.ts'
import { defineDocument } from './document.ts'
import { defineArray, defineImage, defineNumber, defineReference, defineRichText, defineString } from './field.ts'
import type { DocumentRecord, FindManyArgs, Project, QueryResult, Where } from './query.ts'

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
  author: { _ref: 'a1', _toType: 'author' },
}

// Необязательные поля можно опускать.
void post.cover
// @ts-expect-error — status сужен до объединения литералов, 'foo' недопустим.
const bad: Post = { _id: 'x', _type: 'post', title: 't', status: 'foo', author: { _ref: 'a', _toType: 'author' } }

void post
void bad

// --- проверка типов запросов -------------------------------------------------

type C = typeof config

// where: скаляр по значению/оператору, ссылка по id.
const where: Where<C, 'post'> = { title: { contains: 'a' }, status: 'draft', author: 'a1', id: { in: ['1', '2'] } }
void where
// @ts-expect-error — views число, contains строковый оператор недопустим.
const badWhere: Where<C, 'post'> = { views: { contains: 'x' } }
void badWhere

// Полный документ без select.
const full: QueryResult<C, 'post', FindManyArgs<C, 'post'>> = {
  id: 'p1',
  title: 't',
  status: 'published',
  author: { _ref: 'a1', _toType: 'author' },
}
void full

// select со скаляром и джоином по ссылке author → проекция author с полем name.
type PostPick = Project<C, 'post', { id: true; title: true; author: { name: true } }>
const pick: PostPick = { id: 'p1', title: 't', author: { name: 'Имя' } }
void pick
// @ts-expect-error — author спроецирован до { name }, bio не выбрано.
void pick.author?.bio
// @ts-expect-error — views не выбрано в select, его нет в проекции.
void pick.views

// DocumentRecord сохраняет ссылку как ReferenceValue.
const record: DocumentRecord<C, 'post'> = { id: 'p1', title: 't', status: 'draft', author: { _ref: 'a', _toType: 'author' } }
void record.author?._ref
