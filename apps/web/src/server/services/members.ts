import type { Role } from '@jalyk/db'
import { Effect } from 'effect'
import { query } from '../db'
import { ForbiddenError, NotFoundError } from '../errors'
import { requireOwner } from './projects'

/** Сменить роль участнику — только владелец. Нельзя трогать самого владельца. */
export const setRole = (projectId: string, actorId: string, memberId: string, role: Role) =>
  Effect.gen(function* () {
    yield* requireOwner(projectId, actorId)
    const m = yield* query((db) => db.member.findUnique({ where: { id: memberId } }))
    if (!m || m.projectId !== projectId) return yield* Effect.fail(new NotFoundError({ what: 'member' }))
    if (m.role === 'owner') return yield* Effect.fail(new ForbiddenError({ reason: 'cant-change-owner' }))
    return yield* query((db) => db.member.update({ where: { id: memberId }, data: { role } }))
  })

/** Удалить участника — только владелец. Владельца удалить нельзя. */
export const remove = (projectId: string, actorId: string, memberId: string) =>
  Effect.gen(function* () {
    yield* requireOwner(projectId, actorId)
    const m = yield* query((db) => db.member.findUnique({ where: { id: memberId } }))
    if (!m || m.projectId !== projectId) return yield* Effect.fail(new NotFoundError({ what: 'member' }))
    if (m.role === 'owner') return yield* Effect.fail(new ForbiddenError({ reason: 'cant-remove-owner' }))
    return yield* query((db) => db.member.delete({ where: { id: memberId } }))
  })
