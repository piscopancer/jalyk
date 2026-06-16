import { createJalykClient } from '@jalyk/client'
import { studioConfig } from './studio'

export const client = createJalykClient({
  projectId: 'la',
  token: '...',
  definitions: studioConfig.definitions,
})
