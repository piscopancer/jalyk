import { createServerFn } from '@tanstack/react-start'
import { getRequestHeaders } from '@tanstack/react-start/server'
import { auth } from '@/lib/auth'
import { query } from '../db'
import { runtime } from '../runtime'
import { seedProfile, seedSessionUserId } from '../seed/config'

/** Текущая сессия (или null). Используется в beforeLoad. */
export const getSession = createServerFn({ method: 'GET' }).handler(
  async () => {
    // В сид-режиме подменяем сессию фиксированным пользователем профиля.
    if (seedProfile) {
      const id = seedSessionUserId
      if (!id) return null
      const user = await runtime.runPromise(
        query((db) => db.user.findUnique({ where: { id } })),
      )
      return user ? { user, session: { userId: user.id } } : null
    }
    const headers = new Headers(getRequestHeaders() as HeadersInit)
    return auth.api.getSession({ headers })
  },
)
