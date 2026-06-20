import {
  defineArray,
  defineBoolean,
  defineConfig,
  defineDocument,
  defineImage,
  defineNumber,
  defineObject,
  defineReference,
  defineString,
} from "@jalyk/schema"
import { createStudio } from "@jalyk/studio"
import {
  CalendarDays,
  Disc3,
  FileText,
  Image as ImageIcon,
  Languages,
  ListMusic,
  Mic2,
  Music2,
  PenLine,
  ShieldAlert,
  Tag,
  Type,
  User,
  Users,
} from "lucide-react"
import { AlbumForm } from "./album-form.tsx"
import { AlbumPreview } from "./album-preview.tsx"

/** Языки переводов лирики: value — код языка, title — подпись для select. */
const languages = [
  { value: "ru", title: "Русский" },
  { value: "en", title: "English" },
  { value: "zh", title: "中文" },
] as const

/** Поля альбома вынесены отдельно, чтобы форма AlbumForm типизировалась по `typeof albumFields` без цикла «конфиг → форма → тип конфига». */
const albumFields = {
  cover: defineImage({ title: "Обложка", icon: ImageIcon }),
  title: defineString({ title: "Название", icon: Tag, required: true }),
  year: defineNumber({ title: "Год", icon: CalendarDays, min: 0 }),
  band: defineReference({ title: "Группа", icon: Users, to: ["band"] }),
  tracks: defineArray({
    title: "Треки",
    icon: ListMusic,
    of: defineReference({ to: ["track"] }),
  }),
}

/** Карта полей альбома для типизации кастомной формы (FormProps<AlbumFields>). */
export type AlbumFields = typeof albumFields

/** Музыкальная схема: группа, исполнитель, альбом, трек. Документы — отдельные переменные, `documents` лишь собирает их; `to` типизирует реестр (ниже). */
const bandDoc = defineDocument({
  title: "Группа",
  icon: Users,
  preview: { title: "name" },
  fields: {
    name: defineString({ title: "Название", icon: Tag, required: true }),
    artists: defineArray({
      title: "Исполнители",
      icon: Users,
      of: defineReference({ to: ["artist"] }),
    }),
  },
})

const artistDoc = defineDocument({
  title: "Исполнитель",
  icon: Mic2,
  preview: { title: "fullName" },
  fields: {
    fullName: defineString({ title: "Полное имя", icon: User, required: true }),
    bio: defineString({
      title: "Биография",
      icon: FileText,
      input: { type: "multiline" },
    }),
  },
})

const albumDoc = defineDocument({
  title: "Альбом",
  icon: Disc3,
  preview: { title: "title" },
  previewComponent: AlbumPreview,
  formComponent: AlbumForm,
  fields: albumFields,
})

const trackDoc = defineDocument({
  title: "Трек",
  icon: Music2,
  preview: { title: "title" },
  fields: {
    title: defineString({ title: "Название", icon: Tag, required: true }),
    explicit: defineBoolean({
      title: "Ненормативный контент",
      icon: ShieldAlert,
    }),
    albums: defineArray({
      title: "Альбомы",
      icon: Disc3,
      of: defineReference({ to: ["album"] }),
    }),
    performers: defineArray({
      title: "Группы и исполнители",
      icon: Users,
      of: defineReference({ to: ["band", "artist"] }),
    }),
    originalLyrics: defineObject({
      title: "Оригинальная лирика",
      icon: FileText,
      fields: {
        language: defineString({
          title: "Язык оригинала",
          icon: Languages,
          required: true,
          input: { type: "select", predefined: languages },
        }),
        text: defineString({
          title: "Текст оригинала",
          icon: Type,
          required: true,
          input: { type: "multiline" },
        }),
        authors: defineArray({
          title: "Авторы текста",
          icon: PenLine,
          of: defineString({}),
        }),
      },
    }),
    lyrics: defineArray({
      title: "Лирика",
      icon: Languages,
      of: defineObject({
        title: "Перевод",
        fields: {
          language: defineString({
            title: "Язык",
            icon: Languages,
            required: true,
            input: { type: "select", predefined: languages },
          }),
          text: defineString({
            title: "Текст",
            icon: Type,
            required: true,
            input: { type: "multiline" },
          }),
          translator: defineString({ title: "Автор перевода", icon: PenLine }),
        },
      }),
    }),
  },
})

/** Сборка документов; ключи задают типы документов проекта. */
const documents = {
  band: bandDoc,
  artist: artistDoc,
  album: albumDoc,
  track: trackDoc,
}

/** Реестр типов документов — даёт `to` автодополнение и проверку; список ручной (авто-вывод из documents даёт цикл). Рассинхрон ловит defineConfig. */
declare module "@jalyk/schema" {
  interface DocumentRegistry {
    band: true
    artist: true
    album: true
    track: true
  }
}

export const config = defineConfig({ documents })

/** Типизированный клиент запросов (find/create/update/delete) из config; объявлен после него во избежание TDZ при циклe импорта с превью. */
export const studio = createStudio(config)
