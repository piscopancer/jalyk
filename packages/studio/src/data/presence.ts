import { fakerRU as faker } from '@faker-js/faker'

// Присутствие в студии (кто сейчас онлайн). Пока тестовые данные генерит faker с
// фиксированным сидом (стабильны между перезагрузками); позже подменим источником
// сервера, не трогая компоненты. Текущий пользователь («я») — обычный участник
// этого же списка, помеченный meId, и всегда стоит первым.

/** Участник студии для индикатора присутствия. Поля namespaced под профиль: дата входа и счётчик созданных документов. */
export type PresenceUser = {
  id: string
  name: string
  /** URL аватарки; если нет — рисуем кружок с первой буквой ника. */
  image?: string
  /** Когда присоединился к проекту (ISO-строка). */
  joinedAt: string
  /** Сколько документов создал в проекте. */
  documentsCreated: number
}

/** Детерминированный приглушённый HSL-цвет из id: один id всегда даёт один цвет — фон плейсхолдера аватарки либо обводку, если аватарка есть. */
export function colorFromId(id: string) {
  let hash = 0
  for (let i = 0; i < id.length; i++) {
    hash = (Math.imul(hash, 31) + id.charCodeAt(i)) | 0
  }
  const hue = ((hash % 360) + 360) % 360
  return `hsl(${hue} 30% 55%)`
}

faker.seed(20260621)

/** Один тестовый участник из faker: русское имя, у части — аватарка. */
function makeUser() {
  const sex = faker.person.sexType()
  return {
    id: faker.string.uuid(),
    name: faker.person.firstName(sex),
    image: faker.datatype.boolean() ? faker.image.avatar() : undefined,
    joinedAt: faker.date.past({ years: 1 }).toISOString(),
    documentsCreated: faker.number.int({ min: 0, max: 150 }),
  } satisfies PresenceUser
}

const ME = {
  id: 'me',
  name: 'Игорь',
  joinedAt: faker.date.past({ years: 1 }).toISOString(),
  documentsCreated: faker.number.int({ min: 50, max: 200 }),
} satisfies PresenceUser

const MOCK_USERS = [ME, ...Array.from({ length: 6 }, makeUser)]

/** Заглушка присутствия: тестовые участники онлайн и id текущего пользователя. «Я» — первый элемент users, помеченный meId. */
export function usePresence() {
  return { users: MOCK_USERS, meId: ME.id }
}
