import { createServerFn } from '@tanstack/react-start'
import * as Projects from '../services/projects'
import { runtime } from '../runtime'
import { currentUserId } from '../current-user.server'

export const listProjects = createServerFn({ method: 'GET' }).handler(
  async () => {
    const uid = await currentUserId()
    return runtime.runPromise(Projects.listForUser(uid))
  },
)

export const getProject = createServerFn({ method: 'GET' })
  .validator((d: { projectId: string }) => d)
  .handler(async ({ data }) => {
    const uid = await currentUserId()
    return runtime.runPromise(Projects.getWithMembers(data.projectId, uid))
  })

export const createProject = createServerFn({ method: 'POST' })
  .validator((d: { name: string }) => {
    const name = d.name?.trim()
    if (!name) throw new Error('Название проекта не может быть пустым')
    return { name }
  })
  .handler(async ({ data }) => {
    const uid = await currentUserId()
    return runtime.runPromise(Projects.create(uid, data.name))
  })

export const renameProject = createServerFn({ method: 'POST' })
  .validator((d: { projectId: string; name: string }) => {
    const name = d.name?.trim()
    if (!name) throw new Error('Название проекта не может быть пустым')
    return { projectId: d.projectId, name }
  })
  .handler(async ({ data }) => {
    const uid = await currentUserId()
    return runtime.runPromise(Projects.rename(data.projectId, uid, data.name))
  })

export const setAllowedOrigins = createServerFn({ method: 'POST' })
  .validator((d: { projectId: string; origins: string[] }) => d)
  .handler(async ({ data }) => {
    const uid = await currentUserId()
    return runtime.runPromise(
      Projects.setAllowedOrigins(data.projectId, uid, data.origins),
    )
  })

export const deleteProject = createServerFn({ method: 'POST' })
  .validator((d: { projectId: string }) => d)
  .handler(async ({ data }) => {
    const uid = await currentUserId()
    return runtime.runPromise(Projects.remove(data.projectId, uid))
  })
