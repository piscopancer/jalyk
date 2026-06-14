import { PLAN_LIMITS, type Plan } from '@jalyk/db'
import { Effect } from 'effect'
import { query } from '../db'

/** Текущий план пользователя. Нет записи подписки — считаем free. */
export const planOf = (userId: string) =>
  query((db) => db.subscription.findUnique({ where: { userId } })).pipe(
    Effect.map((s): Plan => s?.plan ?? 'free'),
  )

/** План + его лимиты — то, что показывает страница «План». */
export const statusOf = (userId: string) =>
  planOf(userId).pipe(Effect.map((plan) => ({ plan, limits: PLAN_LIMITS[plan] })))
