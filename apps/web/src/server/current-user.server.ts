import { getRequestHeaders } from '@tanstack/react-start/server'
import { auth } from '@/lib/auth'
import { seedProfile, seedSessionUserId } from './seed/config'

/** Достать id пользователя на сервере или бросить — для защищённых функций. */
export async function currentUserId(): Promise<string> {
  // В сид-режиме OAuth не используется — логин подменяется фиксированным id.
  if (seedProfile) {
    if (!seedSessionUserId) throw new Error('UNAUTHORIZED')
    return seedSessionUserId
  }
  const headers = new Headers(getRequestHeaders() as HeadersInit)
  const session = await auth.api.getSession({ headers })
  if (!session?.user) throw new Error('UNAUTHORIZED')
  return session.user.id
}
