import { HttpApiBuilder } from '@effect/platform'
import { Effect } from 'effect'
import { Api } from './api.ts'
import { CurrentUser } from './middleware.ts'

// Обработчик /me: возвращает пользователя, выведенного middleware Authentication
// из bearer-токена. Минимальная проверка того, что аутентификация студии работает.
export const MeLive = HttpApiBuilder.group(Api, 'me', (handlers) =>
  handlers.handle('me', () => CurrentUser),
)
