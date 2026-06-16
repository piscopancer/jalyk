import { defineArray, defineConfig, defineDocument, defineImage, defineNumber, defineReference, defineRichText, defineString } from '@jalyk/schema'

// Демонстрационная схема проекта для тестового клиента: автор и пост со ссылкой
// на автора. Совпадает с примером вывода типов в @jalyk/schema.
export const config = defineConfig({
  documents: {
    author: defineDocument({
      title: 'Автор',
      preview: { title: 'name' },
      fields: {
        name: defineString({ title: 'Имя', required: true }),
        bio: defineRichText({ title: 'Биография' }),
      },
    }),
    post: defineDocument({
      title: 'Пост',
      preview: { title: 'title' },
      fields: {
        title: defineString({ title: 'Заголовок', required: true }),
        cover: defineImage({ title: 'Обложка' }),
        status: defineString({
          title: 'Статус',
          required: true,
          input: { type: 'select', predefined: [{ value: 'draft', title: 'Черновик' }, { value: 'published', title: 'Опубликован' }] },
        }),
        views: defineNumber({ title: 'Просмотры', min: 0 }),
        author: defineReference({ title: 'Автор', to: ['author'], required: true }),
        tags: defineArray({ title: 'Теги', of: defineString({}) }),
      },
    }),
  },
})
