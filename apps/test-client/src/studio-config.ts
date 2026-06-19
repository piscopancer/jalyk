import { defineArray, defineBoolean, defineConfig, defineDocument, defineNumber, defineObject, defineReference, defineString } from '@jalyk/schema'
import { createStudio } from '@jalyk/studio'
import { CalendarDays, Disc3, FileText, Languages, ListMusic, Mic2, Music2, PenLine, ShieldAlert, Tag, Type, User, Users } from 'lucide-react'
import { AlbumPreview } from './album-preview.tsx'

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
      icon: Users,
      preview: { title: 'name' },
      fields: {
        name: defineString({ title: 'Название', icon: Tag, required: true }),
        artists: defineArray({ title: 'Исполнители', icon: Users, of: defineReference({ to: ['artist'] }) }),
      },
    }),
    artist: defineDocument({
      title: 'Исполнитель',
      icon: Mic2,
      preview: { title: 'fullName' },
      fields: {
        fullName: defineString({ title: 'Полное имя', icon: User, required: true }),
        bio: defineString({ title: 'Биография', icon: FileText, input: { type: 'multiline' } }),
      },
    }),
    album: defineDocument({
      title: 'Альбом',
      icon: Disc3,
      preview: { title: 'title' },
      previewComponent: AlbumPreview,
      fields: {
        title: defineString({ title: 'Название', icon: Tag, required: true }),
        year: defineNumber({ title: 'Год', icon: CalendarDays, min: 0 }),
        band: defineReference({ title: 'Группа', icon: Users, to: ['band'] }),
        tracks: defineArray({ title: 'Треки', icon: ListMusic, of: defineReference({ to: ['track'] }) }),
      },
    }),
    track: defineDocument({
      title: 'Трек',
      icon: Music2,
      preview: { title: 'title' },
      fields: {
        title: defineString({ title: 'Название', icon: Tag, required: true }),
        explicit: defineBoolean({ title: 'Ненормативный контент', icon: ShieldAlert }),
        albums: defineArray({ title: 'Альбомы', icon: Disc3, of: defineReference({ to: ['album'] }) }),
        performers: defineArray({ title: 'Группы и исполнители', icon: Users, of: defineReference({ to: ['band', 'artist'] }) }),
        originalLyrics: defineObject({
          title: 'Оригинальная лирика',
          icon: FileText,
          fields: {
            language: defineString({ title: 'Язык оригинала', icon: Languages, required: true, input: { type: 'select', predefined: languages } }),
            text: defineString({ title: 'Текст оригинала', icon: Type, required: true, input: { type: 'multiline' } }),
            authors: defineArray({ title: 'Авторы текста', icon: PenLine, of: defineString({}) }),
          },
        }),
        lyrics: defineArray({
          title: 'Лирика',
          icon: Languages,
          of: defineObject({
            title: 'Перевод',
            fields: {
              language: defineString({ title: 'Язык', icon: Languages, required: true, input: { type: 'select', predefined: languages } }),
              text: defineString({ title: 'Текст', icon: Type, required: true, input: { type: 'multiline' } }),
              translator: defineString({ title: 'Автор перевода', icon: PenLine }),
            },
          }),
        }),
      },
    }),
  },
})

// Типизированный клиент запросов проекта: studio.<type>.findMany/findUnique/count
// и create/update/delete/publish. Типы where/select/join выводятся из config.
// Создаётся здесь, после config: компоненты превью (AlbumPreview) импортируют
// этот клиент, образуя цикл модулей, и при инициализации в studio.ts config был
// бы ещё в TDZ. В одном модуле порядок объявлений это исключает.
export const studio = createStudio(config)
