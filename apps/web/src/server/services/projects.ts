import { getUserProjectRole } from '@jalyk/core'
import { PLAN_LIMITS } from '@jalyk/db'
import { Effect } from 'effect'
import { query } from '../db'
import { ForbiddenError, NotFoundError, PlanLimitError } from '../errors'
import { planOf } from './subscription'

/** Проекты, в которых пользователь состоит: собственные (ownerId) и те, куда он
 * приглашён (invited). _count.invited — число приглашённых редакторов (без
 * владельца). */
export const listForUser = (userId: string) =>
  query((db) =>
    db.project.findMany({
      where: { OR: [{ ownerId: userId }, { invited: { some: { userId } } }] },
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { invited: true } } },
    }),
  )

/** Роль пользователя в проекте, либо ошибка доступа (владелец или приглашённый). */
export const requireMember = (projectId: string, userId: string) =>
  getUserProjectRole(projectId, userId).pipe(
    Effect.flatMap((role) =>
      role
        ? Effect.succeed(role)
        : Effect.fail(new NotFoundError({ what: 'project' })),
    ),
  )

/** Только владелец может управлять участниками, настройками и удалением. */
export const requireOwner = (projectId: string, userId: string) =>
  requireMember(projectId, userId).pipe(
    Effect.flatMap((role) =>
      role === 'owner'
        ? Effect.succeed(role)
        : Effect.fail(new ForbiddenError({ reason: 'owner-only' })),
    ),
  )

/** Проект с участниками — для страницы проекта. Требует членства. Владелец
 * подмешивается в members первым (в таблице invited его нет) с синтетическим
 * id 'owner'; над ним нет управляющих действий (роль owner их прячет). */
export const getWithMembers = (projectId: string, userId: string) =>
  requireMember(projectId, userId).pipe(
    Effect.zipRight(
      query((db) =>
        db.project.findUniqueOrThrow({
          where: { id: projectId },
          include: {
            owner: { select: { id: true, name: true, email: true, image: true } },
            invited: { include: { user: true }, orderBy: { createdAt: 'asc' } },
            invitations: {
              where: { acceptedAt: null },
              orderBy: { createdAt: 'desc' },
            },
          },
        }),
      ),
    ),
    Effect.map((project) => ({
      ...project,
      members: [
        {
          id: 'owner',
          userId: project.owner.id,
          role: 'owner' as const,
          user: {
            name: project.owner.name,
            email: project.owner.email,
            image: project.owner.image,
          },
        },
        ...project.invited.map((m) => ({
          id: m.id,
          userId: m.userId,
          role: m.role,
          user: {
            name: m.user.name,
            email: m.user.email,
            image: m.user.image,
          },
        })),
      ],
    })),
  )

/** Создание проекта с проверкой лимита плана. Создатель становится owner. */
export const create = (userId: string, name: string) =>
  Effect.gen(function* () {
    const plan = yield* planOf(userId)
    const max = PLAN_LIMITS[plan].projects
    if (max !== null) {
      const count = yield* query((db) =>
        db.project.count({ where: { ownerId: userId } }),
      )
      if (count >= max)
        return yield* Effect.fail(
          new PlanLimitError({ limit: 'projects', max }),
        )
    }
    return yield* query((db) =>
      db.project.create({ data: { name, ownerId: userId } }),
    )
  })

/** Переименование — только владелец. */
export const rename = (projectId: string, userId: string, name: string) =>
  requireOwner(projectId, userId).pipe(
    Effect.zipRight(
      query((db) =>
        db.project.update({ where: { id: projectId }, data: { name } }),
      ),
    ),
  )

/** Замена списка разрешённых origin — только владелец. Каждый вход прогоняется
 * через URL и сводится к каноничному origin (схема+хост+порт), дубли убираются;
 * невалидные адреса отбрасываются. Эти origin студия предъявляет при входе
 * (см. apps/web/src/routes/studio-auth.tsx), поэтому формат должен совпадать. */
export const setAllowedOrigins = (
  projectId: string,
  userId: string,
  origins: ReadonlyArray<string>,
) =>
  requireOwner(projectId, userId).pipe(
    Effect.zipRight(
      query((db) =>
        db.project.update({
          where: { id: projectId },
          data: { allowedOrigins: normalizeOrigins(origins) },
          select: { allowedOrigins: true },
        }),
      ),
    ),
  )

/** Сводит произвольные строки к уникальным каноничным origin, отбрасывая мусор. */
const normalizeOrigins = (origins: ReadonlyArray<string>) => {
  const canonical = origins.flatMap((raw) => {
    try {
      return [new URL(raw.trim()).origin]
    } catch {
      return []
    }
  })
  return [...new Set(canonical)]
}

/** Удаление проекта — только владелец. */
export const remove = (projectId: string, userId: string) =>
  requireOwner(projectId, userId).pipe(
    Effect.zipRight(
      query((db) => db.project.delete({ where: { id: projectId } })),
    ),
  )
