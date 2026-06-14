import type { Role } from '@jalyk/db'
import { createServerFn } from '@tanstack/react-start'
import * as Invitations from '../services/invitations'
import { runtime } from '../runtime'
import { currentUserId } from '../current-user.server'

export const createInvitation = createServerFn({ method: 'POST' })
  .validator((d: { projectId: string; role: Role }) => d)
  .handler(async ({ data }) => {
    const uid = await currentUserId()
    return runtime.runPromise(Invitations.create(data.projectId, uid, data.role))
  })

export const revokeInvitation = createServerFn({ method: 'POST' })
  .validator((d: { projectId: string; invitationId: string }) => d)
  .handler(async ({ data }) => {
    const uid = await currentUserId()
    return runtime.runPromise(Invitations.revoke(data.projectId, uid, data.invitationId))
  })

export const peekInvitation = createServerFn({ method: 'GET' })
  .validator((d: { token: string }) => d)
  .handler(async ({ data }) => runtime.runPromise(Invitations.peek(data.token)))

export const acceptInvitation = createServerFn({ method: 'POST' })
  .validator((d: { token: string }) => d)
  .handler(async ({ data }) => {
    const uid = await currentUserId()
    return runtime.runPromise(Invitations.accept(data.token, uid))
  })
