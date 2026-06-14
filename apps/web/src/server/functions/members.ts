import type { Role } from '@jalyk/db'
import { createServerFn } from '@tanstack/react-start'
import * as Members from '../services/members'
import { runtime } from '../runtime'
import { currentUserId } from '../current-user.server'

export const setMemberRole = createServerFn({ method: 'POST' })
  .validator((d: { projectId: string; memberId: string; role: Role }) => d)
  .handler(async ({ data }) => {
    const uid = await currentUserId()
    return runtime.runPromise(Members.setRole(data.projectId, uid, data.memberId, data.role))
  })

export const removeMember = createServerFn({ method: 'POST' })
  .validator((d: { projectId: string; memberId: string }) => d)
  .handler(async ({ data }) => {
    const uid = await currentUserId()
    return runtime.runPromise(Members.remove(data.projectId, uid, data.memberId))
  })
