import type { Role } from '@jalyk/db'
import { Effect } from 'effect'
import { randomBytes } from 'node:crypto'
import { query } from '../db'
import { InvitationError } from '../errors'
import { requireOwner } from './projects'

const TTL_DAYS = 7

/** Создать приглашение со ссылкой-токеном — только владелец. */
export const create = (projectId: string, actorId: string, role: Role) =>
  requireOwner(projectId, actorId).pipe(
    Effect.zipRight(
      query((db) =>
        db.invitation.create({
          data: {
            projectId,
            invitedById: actorId,
            role,
            token: randomBytes(24).toString('base64url'),
            expiresAt: new Date(Date.now() + TTL_DAYS * 24 * 60 * 60 * 1000),
          },
        }),
      ),
    ),
  )

/** Отозвать (удалить) ещё не принятое приглашение — только владелец. */
export const revoke = (
  projectId: string,
  actorId: string,
  invitationId: string,
) =>
  requireOwner(projectId, actorId).pipe(
    Effect.zipRight(
      query((db) => db.invitation.delete({ where: { id: invitationId } })),
    ),
  )

/** Информация о приглашении по токену — для страницы принятия. */
export const peek = (token: string) =>
  query((db) =>
    db.invitation.findUnique({
      where: { token },
      include: { project: true, invitedBy: true },
    }),
  )

/** Принять приглашение: добавить текущего пользователя участником. */
export const accept = (token: string, userId: string) =>
  Effect.gen(function* () {
    const inv = yield* query((db) =>
      db.invitation.findUnique({ where: { token } }),
    )
    if (!inv)
      return yield* Effect.fail(new InvitationError({ reason: 'not-found' }))
    if (inv.acceptedAt)
      return yield* Effect.fail(
        new InvitationError({ reason: 'already-accepted' }),
      )
    if (inv.expiresAt < new Date())
      return yield* Effect.fail(new InvitationError({ reason: 'expired' }))

    const existing = yield* query((db) =>
      db.member.findUnique({
        where: { projectId_userId: { projectId: inv.projectId, userId } },
      }),
    )
    if (existing)
      return yield* Effect.fail(
        new InvitationError({ reason: 'already-member' }),
      )

    return yield* query((db) =>
      db.$transaction([
        db.member.create({
          data: { projectId: inv.projectId, userId, role: inv.role },
        }),
        db.invitation.update({
          where: { id: inv.id },
          data: { acceptedAt: new Date() },
        }),
      ]),
    ).pipe(Effect.as(inv.projectId))
  })
