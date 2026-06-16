import { studioConfigCtx } from '@/config'
import { useContext } from 'react'

export default function useStudioConfig() {
  return useContext(studioConfigCtx)
}
