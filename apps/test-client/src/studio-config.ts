import {
  defineArray,
  defineBoolean,
  defineConfig,
  defineDocument,
  defineImage,
  defineNumber,
  defineObject,
  defineProjectBadge,
  defineReference,
  defineString,
  defineTemplate,
  index,
  rules,
} from '@jalyk/schema'
import { createStudio } from '@jalyk/studio'
import {
  CalendarDaysIcon,
  Disc3Icon,
  FileTextIcon,
  ImageIcon,
  LanguagesIcon,
  LinkIcon,
  ListMusicIcon,
  Mic2Icon,
  Music2Icon,
  PenLineIcon,
  ShieldAlertIcon,
  TagIcon,
  TypeIcon,
  UserIcon,
  UsersIcon,
} from 'lucide-react'
import { AlbumForm } from './album-form.tsx'
import { AlbumPreview } from './album-preview.tsx'

/** Языки переводов лирики: value — код языка, title — подпись для select. */
export const languages = [
  { value: 'ru', title: 'Русский' },
  { value: 'en', title: 'English' },
  { value: 'ch', title: '中文' },
] as const

/** Соцсети для select ссылок исполнителя: value — код, title — подпись. */
const socialNetworks = [
  { value: 'vk', title: 'ВК' },
  { value: 'x', title: 'X' },
] as const

/** Поля альбома вынесены отдельно, чтобы форма AlbumForm типизировалась по `typeof albumFields` без цикла «конфиг → форма → тип конфига». */
const albumFields = {
  cover: defineImage({ title: 'Обложка', icon: ImageIcon }),
  title: defineString({
    title: 'Название',
    icon: TagIcon,
    templates: [
      // Демонстрация async-шаблона: читает другой тип документа (группу) через
      // ctx.client. Запрашивать можно любой зарегистрированный тип, кроме своего
      // же (album читать album нельзя — самоссылка циклит на уровне типов).
      defineTemplate({
        label: 'По первой группе',
        value: async (ctx) => {
          // Фейковая задержка, чтобы проверить лоадер в диалоге.
          await new Promise((resolve) => setTimeout(resolve, 1000))
          const bands = await ctx.client.band.findMany({
            select: { name: true },
            take: 1,
          })
          return bands[0]?.name ?? ''
        },
      }),
    ],
  }),
  year: defineNumber({
    title: 'Год',
    icon: CalendarDaysIcon,
    min: 0,
    templates: [
      { label: 'Текущий год', value: () => new Date().getFullYear() },
      { label: '10 лет назад', value: () => new Date().getFullYear() - 10 },
    ],
  }),
  band: defineReference({
    title: 'Группа',
    icon: UsersIcon,
    to: [{ to: 'band' }],
  }),
  tracks: defineArray({
    title: 'Треки',
    icon: ListMusicIcon,
    of: defineReference({ to: [{ to: 'track' }] }),
  }),
}

/** Карта полей альбома для типизации кастомной формы (FormProps<AlbumFields>). */
export type AlbumFields = typeof albumFields

/** Музыкальная схема: группа, исполнитель, альбом, трек. Документы — отдельные переменные, `documents` лишь собирает их; `to` типизирует реестр (ниже). */
const bandDoc = defineDocument({
  title: 'Группа',
  icon: UsersIcon,
  preview: { title: 'name' },
  fields: {
    name: defineString({ title: 'Название', icon: TagIcon }),
    artists: defineArray({
      title: 'Исполнители',
      icon: UsersIcon,
      of: defineReference({ to: [{ to: 'artist' }] }),
    }),
  },
  validate: (doc, path) => [rules.required(doc.name, { path: path(['name']) })],
})

const artistDoc = defineDocument({
  title: 'Исполнитель',
  icon: Mic2Icon,
  preview: { title: 'fullName' },
  fields: {
    fullName: defineString({ title: 'Полное имя', icon: UserIcon }),
    bio: defineString({
      title: 'Биография',
      icon: FileTextIcon,
      input: { type: 'multiline' },
    }),
    socialLinks: defineArray({
      title: 'Ссылки на соцсети',
      icon: LinkIcon,
      of: defineObject({
        title: 'Ссылка',
        fields: {
          network: defineString({
            title: 'Соцсеть',
            icon: UsersIcon,
            input: { type: 'select', predefined: socialNetworks },
          }),
          url: defineString({ title: 'Ссылка', icon: LinkIcon }),
        },
      }),
    }),
  },
  validate: (doc, path) => [
    rules.required(doc.fullName, { path: path(['fullName']) }),
  ],
})

const albumDoc = defineDocument({
  title: 'Альбом',
  icon: Disc3Icon,
  preview: { title: 'title' },
  previewComponent: AlbumPreview,
  formComponent: AlbumForm,
  fields: albumFields,
  list: { search: ['title'], sort: ['title', 'year'] },
  validate: (doc, path) => [
    rules.required(doc.title, { path: path(['title']) }),
    rules.required(doc.band, { path: path(['band']) }),
    rules.minItems(doc.tracks, 1, {
      severity: 'warning',
      message: 'В альбоме пока нет треков',
      path: path(['tracks']),
    }),
    (doc.tracks?.length ?? 0) > 0 && !doc.band
      ? {
          severity: 'warning',
          message: 'Есть треки, но не указана группа',
          path: path(['band']),
        }
      : null,
  ],
})

const trackDoc = defineDocument({
  title: 'Трек',
  icon: Music2Icon,
  preview: { title: 'title' },
  list: { search: ['title'], sort: ['title'] },
  fields: {
    title: defineString({ title: 'Название', icon: TagIcon }),
    explicit: defineBoolean({
      title: 'Ненормативный контент',
      icon: ShieldAlertIcon,
    }),
    albums: defineArray({
      title: 'Альбомы',
      icon: Disc3Icon,
      of: defineReference({
        to: [{ to: 'album', previewComponent: AlbumPreview }],
      }),
    }),
    performers: defineArray({
      title: 'Группы и исполнители',
      icon: UsersIcon,
      of: defineReference({ to: [{ to: 'band' }, { to: 'artist' }] }),
    }),
    originalLyrics: defineObject({
      title: 'Оригинальная лирика',
      icon: FileTextIcon,
      fields: {
        language: defineString({
          title: 'Язык оригинала',
          icon: LanguagesIcon,
          input: { type: 'select', predefined: languages },
        }),
        text: defineString({
          title: 'Текст оригинала',
          icon: TypeIcon,
          input: { type: 'multiline' },
        }),
        authors: defineArray({
          title: 'Авторы текста',
          icon: PenLineIcon,
          of: defineString({}),
        }),
      },
    }),
    lyrics: defineArray({
      title: 'Лирика',
      icon: LanguagesIcon,
      of: defineObject({
        title: 'Перевод',
        fields: {
          language: defineString({
            title: 'Язык',
            icon: LanguagesIcon,
            input: { type: 'select', predefined: languages },
          }),
          text: defineString({
            title: 'Текст',
            icon: TypeIcon,
            input: { type: 'multiline' },
          }),
          translator: defineString({
            title: 'Автор перевода',
            icon: PenLineIcon,
          }),
        },
      }),
    }),
  },
  validate: (doc, path) => [
    rules.required(doc.title, { path: path(['title']) }),
    rules.required(doc.originalLyrics?.language, {
      path: path(['originalLyrics', 'language']),
    }),
    rules.required(doc.originalLyrics?.text, {
      path: path(['originalLyrics', 'text']),
    }),
    // Спуск в элемент массива по брендированному индексу: перевод с языком, но без текста.
    ...(doc.lyrics ?? []).flatMap((translation, i) =>
      translation.language && !translation.text
        ? [
            {
              severity: 'warning' as const,
              message: 'Перевод без текста',
              path: path(['lyrics', index(i), 'text']),
            },
          ]
        : [],
    ),
  ],
})

/** Сборка документов; ключи задают типы документов проекта. */
const documents = {
  band: bandDoc,
  artist: artistDoc,
  album: albumDoc,
  track: trackDoc,
}

/** Единая регистрация схемы: один интерфейс, ключ → определение документа. Из него выводятся и ключи типов (для `to` автодополнения и проверки), и карты полей (читаемые из колбэков шаблонов через ctx.client.<тип>). Индексация по ключу ленива, поэтому шаблон одного документа может читать любой другой; неустранимо лишь чтение своего же типа (истинная самоссылка циклит). Рассинхрон ловит defineConfig. */
declare module '@jalyk/schema' {
  interface SchemaRegistry {
    band: typeof bandDoc
    artist: typeof artistDoc
    album: typeof albumDoc
    track: typeof trackDoc
  }
}

export const config = defineConfig({
  documents,
  project: defineProjectBadge({ name: 'Музыка', icon: Disc3Icon }),
})

/** Типизированный клиент запросов (find/create/update/delete) из config; объявлен после него во избежание TDZ при циклe импорта с превью. */
export const studio = createStudio(config)
