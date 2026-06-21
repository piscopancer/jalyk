import { getMembership } from '@jalyk/core'
import { PLAN_LIMITS } from '@jalyk/db'
import { Effect } from 'effect'
import { query } from '../db'
import { ForbiddenError, NotFoundError, PlanLimitError } from '../errors'
import { planOf } from './subscription'

/** Проекты, в которых пользователь состоит (включая собственные). */
export const listForUser = (userId: string) =>
  query((db) =>
    db.project.findMany({
      where: { members: { some: { userId } } },
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { members: true } } },
    }),
  )

/** Роль пользователя в проекте, либо ошибка доступа. */
export const requireMember = (projectId: string, userId: string) =>
  getMembership(projectId, userId).pipe(
    Effect.flatMap((m) =>
      m
        ? Effect.succeed(m)
        : Effect.fail(new NotFoundError({ what: 'project' })),
    ),
  )

/** Только владелец может управлять участниками, настройками и удалением. */
export const requireOwner = (projectId: string, userId: string) =>
  requireMember(projectId, userId).pipe(
    Effect.flatMap((m) =>
      m.role === 'owner'
        ? Effect.succeed(m)
        : Effect.fail(new ForbiddenError({ reason: 'owner-only' })),
    ),
  )

/** Проект с участниками — для страницы проекта. Требует членства. */
export const getWithMembers = (projectId: string, userId: string) =>
  requireMember(projectId, userId).pipe(
    Effect.zipRight(
      query((db) =>
        db.project.findUniqueOrThrow({
          where: { id: projectId },
          include: {
            members: { include: { user: true }, orderBy: { createdAt: 'asc' } },
            invitations: {
              where: { acceptedAt: null },
              orderBy: { createdAt: 'desc' },
            },
          },
        }),
      ),
    ),
  )

/** Создание проекта с проверкой лимита плана. Создатель становится owner. */
export const create = (userId: string, name: string) =>
  Effect.gen(function* () {
    const plan = yield* planOf(userId)
    const max = PLAN_LIMITS[plan].projects
    if (max !== null) {
      const count = yield* query((db) =>
        db.member.count({ where: { userId, role: 'owner' } }),
      )
      if (count >= max)
        return yield* Effect.fail(
          new PlanLimitError({ limit: 'projects', max }),
        )
    }
    return yield* query((db) =>
      db.project.create({
        data: {
          name,
          ownerId: userId,
          members: { create: { userId, role: 'owner' } },
        },
      }),
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

/** Удаление проекта — только владелец. */
export const remove = (projectId: string, userId: string) =>
  requireOwner(projectId, userId).pipe(
    Effect.zipRight(
      query((db) => db.project.delete({ where: { id: projectId } })),
    ),
  )
