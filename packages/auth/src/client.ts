import { createAuthClient } from 'better-auth/react'

// Общий клиент better-auth для фронтенда. Web использует его в cookie-режиме
// (same-origin, без хранилища токена), а встраиваемая студия — в bearer-режиме:
// она живёт на чужом origin и ходит в api по заголовку Authorization. Токен
// прилетает от сервера в заголовке set-auth-token при любом успешном запросе
// (нужен плагин bearer на сервере) — его перехватываем и кладём в хранилище, а
// затем подставляем в каждый запрос через опцию auth.

/** Хранилище bearer-токена сессии (обычно обёртка над localStorage). */
export type BearerStorage = {
  get: () => string | null
  set: (token: string) => void
  clear: () => void
}

export type AuthClientOptions = {
  /** База обработчика better-auth, например `/api/auth` (через прокси хоста) или
   * абсолютный адрес платформы. По умолчанию — same-origin `/api/auth`. */
  baseURL?: string
  /** Если задано — bearer-режим: перехват и подстановка токена сессии. */
  bearer?: BearerStorage
}

export function makeAuthClient(options?: AuthClientOptions) {
  const bearer = options?.bearer
  return createAuthClient({
    baseURL: options?.baseURL,
    fetchOptions: bearer
      ? {
          onSuccess: (ctx) => {
            const token = ctx.response.headers.get('set-auth-token')
            if (token) bearer.set(token)
          },
        }
      : undefined,
    auth: bearer
      ? { type: 'Bearer', token: () => bearer.get() ?? undefined }
      : undefined,
  })
}

export type AuthClient = ReturnType<typeof makeAuthClient>
