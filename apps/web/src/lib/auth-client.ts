import { makeAuthClient } from '@jalyk/auth/client'

// Клиент авторизации сайта: same-origin /api/auth, cookie-режим (без bearer-
// хранилища) — общий фабричный клиент из @jalyk/auth, тот же, что использует студия.
export const authClient = makeAuthClient()

export const { signIn, signOut, useSession } = authClient
