import { createServerFn } from '@tanstack/react-start'
import * as Subscription from '../services/subscription'
import { runtime } from '../runtime'
import { currentUserId } from '../current-user.server'

export const getPlanStatus = createServerFn({ method: 'GET' }).handler(async () => {
  const uid = await currentUserId()
  return runtime.runPromise(Subscription.statusOf(uid))
})
