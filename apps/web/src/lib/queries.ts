import { queryOptions } from '@tanstack/react-query'
import { listApiKeys } from '@/server/functions/apikeys'
import { getProject, listProjects } from '@/server/functions/projects'
import { peekInvitation } from '@/server/functions/invitations'
import { getPlanStatus } from '@/server/functions/subscription'

// Единый источник ключей кэша: ключи проектов вложены друг в друга, чтобы
// инвалидация списка/конкретного проекта была предсказуемой.
export const qk = {
  projects: ['projects'] as const,
  project: (projectId: string) => ['projects', projectId] as const,
  plan: ['plan'] as const,
  invitation: (token: string) => ['invitation', token] as const,
  apiKeys: (projectId: string) => ['projects', projectId, 'api-keys'] as const,
}

export const projectsQuery = () => queryOptions({ queryKey: qk.projects, queryFn: () => listProjects() })

export const projectQuery = (projectId: string) =>
  queryOptions({ queryKey: qk.project(projectId), queryFn: () => getProject({ data: { projectId } }) })

export const planQuery = () => queryOptions({ queryKey: qk.plan, queryFn: () => getPlanStatus() })

export const invitationQuery = (token: string) =>
  queryOptions({ queryKey: qk.invitation(token), queryFn: () => peekInvitation({ data: { token } }) })

export const apiKeysQuery = (projectId: string) =>
  queryOptions({ queryKey: qk.apiKeys(projectId), queryFn: () => listApiKeys({ data: { projectId } }) })
