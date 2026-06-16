import type { Scope } from '@jalyk/db'
import { createServerFn } from '@tanstack/react-start'
import { currentUserId } from '../current-user.server'
import { runtime } from '../runtime'
import * as ApiKeys from '../services/apikeys'

export const listApiKeys = createServerFn({ method: 'GET' })
  .validator((d: { projectId: string }) => d)
  .handler(async ({ data }) => {
    const uid = await currentUserId()
    return runtime.runPromise(ApiKeys.list(data.projectId, uid))
  })

export const createApiKey = createServerFn({ method: 'POST' })
  .validator((d: { projectId: string; name: string; scope: Scope }) => d)
  .handler(async ({ data }) => {
    const uid = await currentUserId()
    return runtime.runPromise(ApiKeys.issue(data.projectId, uid, data.name, data.scope))
  })

export const revokeApiKey = createServerFn({ method: 'POST' })
  .validator((d: { projectId: string; keyId: string }) => d)
  .handler(async ({ data }) => {
    const uid = await currentUserId()
    return runtime.runPromise(ApiKeys.revoke(data.projectId, uid, data.keyId))
  })
