import { defineArray, defineConfig, defineDocument, defineNumber, defineObject, defineReference, defineString } from '@jalyk/schema'

// Языки переводов лирики. Фиксированный список: значение — код языка, title —
// подпись для select. Редактируется правкой этого массива.
const languages = [
  { value: 'ru', title: 'Русский' },
  { value: 'en', title: 'English' },
  { value: 'zh', title: '中文' },
] as const

// Схема музыкального проекта с переводами лирики. Сущности: группа, исполнитель,
// альбом и трек. Лирика трека — массив переводов (по объекту на язык), который
// удаляется вместе с треком, так как лежит вложенно, а не ссылкой. Связи между
// документами заданы ссылками: «группы и исполнители» трека — полиморфная ссылка
// на оба типа артистов, альбом↔трек хранится массивами с обеих сторон.
export const config = defineConfig({
  documents: {
    band: defineDocument({
      title: 'Группа',
      preview: { title: 'name' },
      fields: {
        name: defineString({ title: 'Название', required: true }),
        artists: defineArray({ title: 'Исполнители', of: defineReference({ to: ['artist'] }) }),
      },
    }),
    artist: defineDocument({
      title: 'Исполнитель',
      preview: { title: 'fullName' },
      fields: {
        fullName: defineString({ title: 'Полное имя', required: true }),
        bio: defineString({ title: 'Биография', input: { type: 'multiline' } }),
      },
    }),
    album: defineDocument({
      title: 'Альбом',
      preview: { title: 'title' },
      fields: {
        title: defineString({ title: 'Название', required: true }),
        year: defineNumber({ title: 'Год', min: 0 }),
        band: defineReference({ title: 'Группа', to: ['band'] }),
        tracks: defineArray({ title: 'Треки', of: defineReference({ to: ['track'] }) }),
      },
    }),
    track: defineDocument({
      title: 'Трек',
      preview: { title: 'title' },
      fields: {
        title: defineString({ title: 'Название', required: true }),
        albums: defineArray({ title: 'Альбомы', of: defineReference({ to: ['album'] }) }),
        performers: defineArray({ title: 'Группы и исполнители', of: defineReference({ to: ['band', 'artist'] }) }),
        lyrics: defineArray({
          title: 'Лирика',
          of: defineObject({
            title: 'Перевод',
            fields: {
              language: defineString({ title: 'Язык', required: true, input: { type: 'select', predefined: languages } }),
              text: defineString({ title: 'Текст', required: true, input: { type: 'multiline' } }),
              translator: defineString({ title: 'Автор перевода' }),
            },
          }),
        }),
      },
    }),
  },
})
