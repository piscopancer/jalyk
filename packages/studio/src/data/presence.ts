import { MemberInfo as MemberInfoSchema } from '@jalyk/contract'
import { Schema } from 'effect'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useStudio } from './context.tsx'
import { useProjectEvents } from './events-hooks.ts'
import { studioKeys } from './keys.ts'

// Присутствие в студии (кто сейчас онлайн). Источник — сервер: список участников
// проекта (/members) с их профилем и стартовым online, дальше online уточняется
// presence-событиями SSE-потока. Текущий пользователь («я») — обычный участник
// этого же списка, помеченный meId; meId есть только когда хост передал token
// (без него сервер не знает, кто именно смотрит).

/** Участник проекта с провода (декодированный MemberInfo из контракта). */
type MemberInfo = Schema.Schema.Type<typeof MemberInfoSchema>

/** Участник студии для индикатора присутствия. id — это userId участника. */
export type PresenceUser = {
  id: string
  name: string
  /** URL аватарки; если нет — рисуем кружок с первой буквой имени. */
  image?: string
  /** Роль в проекте. */
  role: 'owner' | 'editor'
  /** Когда присоединился к проекту (ISO-строка). */
  joinedAt: string
  /** Сейчас в студии онлайн. Оффлайн-участники показываются приглушённо в конце списка. */
  online: boolean
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

/** MemberInfo с провода → PresenceUser (image null → undefined). */
function toPresenceUser(m: MemberInfo): PresenceUser {
  return {
    id: m.userId,
    name: m.name,
    image: m.image ?? undefined,
    role: m.role,
    joinedAt: m.joinedAt,
    online: m.online,
  }
}

/** Присутствие: участники проекта (онлайн и оффлайн) и id текущего пользователя.
 * Онлайн сверху, оффлайн в конце; внутри групп — стабильный порядок по дате входа
 * (как пришло с сервера). presence-события патчят online в кэше участников. */
export function usePresence() {
  const { projectId, client, run, token } = useStudio()
  const qc = useQueryClient()

  const membersQuery = useQuery({
    queryKey: studioKeys.members(projectId),
    queryFn: () => run(client.projects.members({ path: { projectId } })),
  })

  // «Я» — только при наличии токена (иначе сервер видит лишь ключ проекта).
  const meQuery = useQuery({
    queryKey: studioKeys.me(),
    queryFn: () => run(client.me.me()),
    enabled: Boolean(token),
  })

  // Живое присутствие: на presence-событие точечно правим online у участника в
  // кэше /members, не перезапрашивая список.
  useProjectEvents((event) => {
    if (event.kind !== 'presence') return
    qc.setQueryData<readonly MemberInfo[]>(
      studioKeys.members(projectId),
      (prev) =>
        prev?.map((m) =>
          m.userId === event.userId ? { ...m, online: event.online } : m,
        ),
    )
  })

  const users = (membersQuery.data ?? [])
    .map(toPresenceUser)
    .sort((a, b) => Number(b.online) - Number(a.online))

  return { users, meId: meQuery.data?.id }
}

/** Редактирование своего профиля: смена имени и/или загрузка аватарки. После
 * успеха обновляем кэш текущего пользователя и список участников (там лежит имя/
 * аватарка для presence). Требует token (иначе сервер ответит 401). */
export function useUpdateProfile() {
  const { projectId, client, run, uploadAvatar } = useStudio()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: { name?: string; avatar?: File }) => {
      const profile = input.avatar
        ? await uploadAvatar(input.avatar)
        : undefined
      // Имя меняем отдельным запросом; если передано — его ответ свежее.
      const named =
        input.name !== undefined
          ? await run(client.me.updateProfile({ payload: { name: input.name } }))
          : undefined
      return named ?? profile
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: studioKeys.me() })
      qc.invalidateQueries({ queryKey: studioKeys.members(projectId) })
    },
  })
}
