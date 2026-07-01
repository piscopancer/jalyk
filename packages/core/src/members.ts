import type { Role } from '@jalyk/db'
import { query } from './db.ts'

// Участники проекта и редактирование собственного профиля. Используется presence
// в студии (список членов с их именем и аватаркой) и редактором профиля.

/** Профиль участника проекта для presence: кто он, его аватарка, роль и когда
 * присоединился. Онлайн-статус сюда не входит — он живёт в памяти api (см.
 * Presence-сервис) и приходит отдельным потоком событий. */
export type ProjectMember = {
  userId: string
  name: string
  image: string | null
  role: Role
  joinedAt: Date
}

/** Все участники проекта (с профилем пользователя). Владелец подмешивается первым
 * из project.ownerId (в таблице invited его нет), его «дата входа» — дата создания
 * проекта; далее приглашённые редакторы, старые сверху по дате входа. */
export const listProjectMembers = (projectId: string) =>
  query((db) =>
    db.project
      .findUnique({
        where: { id: projectId },
        select: {
          createdAt: true,
          owner: { select: { id: true, name: true, image: true } },
          invited: {
            orderBy: { createdAt: 'asc' },
            select: {
              role: true,
              createdAt: true,
              user: { select: { id: true, name: true, image: true } },
            },
          },
        },
      })
      .then((project): ProjectMember[] => {
        if (!project) return []
        const owner: ProjectMember = {
          userId: project.owner.id,
          name: project.owner.name,
          image: project.owner.image,
          role: 'owner',
          joinedAt: project.createdAt,
        }
        return [
          owner,
          ...project.invited.map(
            (m): ProjectMember => ({
              userId: m.user.id,
              name: m.user.name,
              image: m.user.image,
              role: m.role,
              joinedAt: m.createdAt,
            }),
          ),
        ]
      }),
  )

/** Обновить профиль пользователя (имя и/или аватарку). Пустые поля не трогаем. */
export const updateUserProfile = (
  userId: string,
  data: { name?: string; image?: string },
) =>
  query((db) =>
    db.user.update({
      where: { id: userId },
      data: {
        ...(data.name !== undefined ? { name: data.name } : null),
        ...(data.image !== undefined ? { image: data.image } : null),
      },
      select: { id: true, email: true, name: true, image: true },
    }),
  )
